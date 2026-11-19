import { findWeaponForRoll, splitAdvancedDice, renderRollCardHTML, isBestialFailure, adjustBestialFailureLabel, isMessyCritical, adjustMessyCriticalLabel } from './roll-utils.js'
import { getStepSetting } from './settings.js'
import { getRoutingTargets } from './socket-routing.js'
import { computeDamageBreakdown } from './damage-application.js'
import { rollCompulsion, buildCompulsionHTML } from './compulsion.js'
import { applyStatusCondition } from './condition-application.js'
import { getLoadedAmmoType, getAmmoDamageBonus, getWeaponDamageValue } from './weapon-tags.js'
import { performPrivilegedWrite, performPrivilegedDamage } from './privileged-write-relay.js'
import { markBroken } from './repair.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'
const DODGE_TITLE_MARKER = 'DODGE::'
// Separate from weapon-tags.js's TEMP_MODIFIER_CONDITION_NAME on purpose -
// that one lives on the ATTACKER for Full Auto/Two-Handed/Unwieldy/Reach,
// this one lives on the DEFENDER for Cover/Defensive. Keeping them
// distinctly named avoids one side's cleanup ever touching the other's
// condition, even though in practice they'd rarely collide (different
// actors, different moments in the exchange).
const TEMP_DEFENSE_CONDITION_NAME = 'Defense Modifier (temporary)'

// Tracks weapon-attack opposed rolls in flight, keyed by defender actor ID.
// Only populated on the attacker's own client - chat message document sync
// means the attacker's client naturally sees the defender's roll arrive
// regardless of which client's dialog produced it. Whether the defender
// chose Dodge is read back off the completed roll's title marker rather
// than needing to sync that choice cross-client separately.
const pendingWeaponOpposedRolls = new Map()

export function registerOpposingRollTrigger() {
  // createChatMessage fires exactly once, at real creation time - avoids
  // replaying prompts/re-triggering rolls on historical messages when the
  // chat log loads on page refresh (see social-conflict.js for the same fix
  // applied there, and the bug it was fixing).
  Hooks.on('createChatMessage', async (message) => {
    const defensePrompt = message.getFlag(MODULE_ID, 'weaponDefensePromptActorId')
    if (defensePrompt && message.whisper?.includes(game.user.id)) {
      const actor = game.actors.get(defensePrompt)
      const weaponName = message.getFlag(MODULE_ID, 'weaponDefensePromptWeaponName')
      const weaponType = message.getFlag(MODULE_ID, 'weaponDefensePromptWeaponType')
      const autoResolve = message.getFlag(MODULE_ID, 'weaponDefenseAutoResolve')
      if (actor) {
        if (autoResolve) await autoRollDodge(actor, weaponType)
        else await openWeaponDefenseDialog(actor, weaponName, weaponType)
      }
    }

    const roll = message.rolls?.[0]
    if (!roll || !roll.systemRoll) return

    const defenderId = message.speakerActor?.id
    if (defenderId && pendingWeaponOpposedRolls.has(defenderId)) {
      const pending = pendingWeaponOpposedRolls.get(defenderId)
      pendingWeaponOpposedRolls.delete(defenderId)
      const isDodge = (roll.options?.title ?? '').startsWith(DODGE_TITLE_MARKER)
      await resolveWeaponOpposedRoll(pending, message.speakerActor, roll, isDodge, message.id, await renderRollCardHTML(message), message.author?.id)
      return
    }

    const weapon = findWeaponForRoll(message, roll)
    const targets = Array.from(game.user.targets)

    if (!weapon) return
    // This whole block only makes sense running once, on the attacker's own
    // client - but createChatMessage fires on every client when the roll
    // syncs. Without this check, any OTHER connected client that happens to
    // have its own target selected (e.g. a GM with a token targeted left
    // over from earlier) would independently "detect" the same attack off
    // its own game.user.targets and self-trigger a redundant defense dialog.
    if (message.author?.id !== game.user.id) return
    if (targets.length === 0) return
    const targetActor = targets[0].actor
    if (!targetActor) return

    // Looked up per the DEFENDER's own NPC/Player bucket - an NPC's opposing
    // roll can be automated while a player's stays prompted, or vice versa.
    const mode = getStepSetting('opposingRoll', targetActor)
    if (mode === 'off') return

    await promptWeaponDefense(message, roll, weapon, targetActor, mode)
  })
}

async function promptWeaponDefense(originalMessage, attackerRoll, weapon, targetActor, mode) {
  pendingWeaponOpposedRolls.set(targetActor.id, {
    attackerActorId: originalMessage.speakerActor.id,
    attackerName: originalMessage.speakerActor?.name ?? 'Atacante',
    attackerUserId: originalMessage.author?.id,
    attackerTotal: attackerRoll.total,
    attackerRoll,
    attackerMessageId: originalMessage.id,
    attackerRollHTML: await renderRollCardHTML(originalMessage),
    weaponName: weapon.name,
    weaponType: weapon.system.weaponType,
    // Sharp/Fragile only ever matter for damage the ATTACKER's own weapon
    // deals (see resolveWeaponOpposedRoll) - captured here (as booleans,
    // plus the item's own id for Fragile's quantity update) since a
    // defender's counter-attack, if any, uses a completely different
    // (untracked) pool with no relation to the original attacker's weapon.
    isSharp: !!weapon.getFlag(MODULE_ID, 'weaponTags')?.sharp,
    isFirearm: !!weapon.getFlag(MODULE_ID, 'weaponTags')?.firearm,
    isFragile: !!weapon.getFlag(MODULE_ID, 'weaponTags')?.fragile,
    isTaser: !!weapon.getFlag(MODULE_ID, 'weaponTags')?.taser,
    isIncendiary: !!weapon.getFlag(MODULE_ID, 'weaponTags')?.incendiary,
    isFlashbang: !!weapon.getFlag(MODULE_ID, 'weaponTags')?.flashbang,
    isThermite: !!weapon.getFlag(MODULE_ID, 'weaponTags')?.thermite,
    // Special ammo (weapon-tags.js) - a property of whatever's currently
    // chambered, not the weapon's own tags, so it's captured separately
    // here rather than read off weaponTags like the three booleans above.
    loadedAmmoType: getLoadedAmmoType(weapon),
    weaponDamageValue: getWeaponDamageValue(weapon),
    attackerWeaponId: weapon.id,
    promptMessageId: null
  })

  const routingTargets = getRoutingTargets(targetActor)

  if (routingTargets.length === 0) {
    pendingWeaponOpposedRolls.delete(targetActor.id)
    ui.notifications.warn(`${MODULE_ID} | Não há ninguém conectado para controlar ${targetActor.name}; resolva o ataque manualmente`)
    return
  }

  if (routingTargets.some((u) => u.id === game.user.id)) {
    if (mode === 'auto') {
      await autoRollDodge(targetActor, weapon.system.weaponType)
    } else {
      await openWeaponDefenseDialog(targetActor, weapon.name, weapon.system.weaponType)
    }
  } else {
    const promptMessage = await ChatMessage.create({
      content: mode === 'auto'
        ? `<b>${weapon.name}:</b> ${targetActor.name} está sob ataque. Resolvendo automaticamente com Esquiva.`
        : `<b>${weapon.name}:</b> ${targetActor.name} está sob ataque e precisa se defender.`,
      whisper: routingTargets.map((u) => u.id),
      flags: {
        [MODULE_ID]: {
          weaponDefensePromptActorId: targetActor.id,
          weaponDefensePromptWeaponName: weapon.name,
          weaponDefensePromptWeaponType: weapon.system.weaponType,
          weaponDefenseAutoResolve: mode === 'auto'
        }
      }
    })
    // The pending entry may already be gone if resolution somehow beat us
    // here, but that's not realistic mid-await - guard anyway for safety.
    const pending = pendingWeaponOpposedRolls.get(targetActor.id)
    if (pending) pending.promptMessageId = promptMessage.id
  }
}

async function openWeaponDefenseDialog(actor, weaponName, weaponType) {
  const attributeOptions = WOD5E.Attributes.getList({})
  const skillOptions = WOD5E.Skills.getList({})
  const defenseTagEntries = getDefenseTagEntries(actor, weaponType)

  const defenseTagFieldsHTML = defenseTagEntries.length > 0
    ? `<div class="form-group">${defenseTagEntries.map((entry, index) => `<label><input type="checkbox" name="defenseTag${index}" checked /> ${entry.source}</label>`).join('<br>')}</div>`
    : ''

  const content = `
    <form class="vtm5e-automation-weapon-defense-dialog">
      <p><b>${weaponName}</b> está atacando <b>${actor.name}</b>.</p>
      <p style="font-size:0.85em; color:#666;">Esquiva sempre usa Destreza + Atletismo e não causa dano ao atacante, mesmo em caso de vitória. Para contra-atacar, escolha uma parada personalizada.</p>
      ${defenseTagFieldsHTML}
      <div class="form-group">
        <label>Atributo Personalizado</label>
        <select name="attributeSelect">
          <option value="">-- Nenhum --</option>
          ${buildOptionTags(attributeOptions)}
        </select>
      </div>
      <div class="form-group">
        <label>Habilidade Personalizada</label>
        <select name="skillSelect">
          <option value="">-- Nenhum --</option>
          ${buildOptionTags(skillOptions)}
        </select>
      </div>
    </form>
  `

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `Defesa: ${actor.name}` },
    content,
    buttons: [
      {
        action: 'dodge',
        icon: 'fas fa-person-running',
        label: 'Esquiva (Destreza + Atletismo)',
        default: true,
        callback: (_event, _button, dialog) => ({ isDodge: true, checkedTagIndexes: readCheckedDefenseTags(dialog, defenseTagEntries) })
      },
      {
        action: 'custom',
        icon: 'fas fa-dice',
        label: 'Rolar Parada Personalizada',
        callback: (_event, _button, dialog) => {
          const html = dialog.element
          return {
            isDodge: false,
            attributeSelect: html.querySelector('[name="attributeSelect"]')?.value,
            skillSelect: html.querySelector('[name="skillSelect"]')?.value,
            checkedTagIndexes: readCheckedDefenseTags(dialog, defenseTagEntries)
          }
        }
      },
      { action: 'cancel', icon: 'fas fa-times', label: 'Cancelar' }
    ],
    classes: ['wod5e']
  })

  if (!result || result === 'cancel') return

  let valuePaths, title
  if (result.isDodge) {
    valuePaths = ['attributes.dexterity.value', 'skills.athletics.value']
    title = `${DODGE_TITLE_MARKER}Esquiva (Destreza + Atletismo)`
  } else {
    valuePaths = []
    const labelParts = []
    if (result.attributeSelect) {
      valuePaths.push(`attributes.${result.attributeSelect}.value`)
      labelParts.push(game.i18n.localize(attributeOptions[result.attributeSelect]?.label ?? result.attributeSelect))
    }
    if (result.skillSelect) {
      valuePaths.push(`skills.${result.skillSelect}.value`)
      labelParts.push(game.i18n.localize(skillOptions[result.skillSelect]?.label ?? result.skillSelect))
    }
    if (valuePaths.length === 0) {
      ui.notifications.warn(`${MODULE_ID} | Escolha pelo menos um atributo ou habilidade para a defesa personalizada`)
      return
    }
    title = `Defesa: ${labelParts.join(' + ')}`
  }

  const chosenEntries = defenseTagEntries.filter((_, index) => result.checkedTagIndexes?.includes(index))
  await applyDefenseTagBonus(actor, chosenEntries)

  await rollWeaponDefense(actor, valuePaths, title)
}

// Auto mode for the opposing-roll step: no dialog, resolves straight to
// Dodge - the RAW-safe default that's always available regardless of the
// defender's build, and the only weapon defense option with a fixed,
// principled default (a custom pool has no sensible auto-pick). Cover/
// Defensive apply unconditionally here (no toggle, matching how Auto mode
// already skips every other dialog in this module) - there's no UI to
// offer a choice in, and using an equipped shield/weapon's own protection
// is always the right call.
async function autoRollDodge(actor, weaponType) {
  const defenseTagEntries = getDefenseTagEntries(actor, weaponType)
  await applyDefenseTagBonus(actor, defenseTagEntries)

  await rollWeaponDefense(
    actor,
    ['attributes.dexterity.value', 'skills.athletics.value'],
    `${DODGE_TITLE_MARKER}Esquiva (Destreza + Atletismo)`
  )
}

// Cover (ranged attacks) and Defensive (close combat) - checked against
// weapon-type items the DEFENDER owns (shields like the homebrew doc's
// Ballistic/Riot Shield are modeled as weapon items with 0 damage and
// these tags, same as any other weapon - see the Chicago compendium),
// not the attacker's weapon at all.
function getDefenseTagEntries(actor, weaponType) {
  const isRangedAttack = weaponType === 'ranged'
  const entries = []

  for (const item of actor.items) {
    if (item.type !== 'weapon') continue
    const tags = item.getFlag(MODULE_ID, 'weaponTags') ?? {}

    if (isRangedAttack && tags.cover) {
      entries.push({ source: `Cobertura (+2, ${item.name})`, value: '2' })
    }
    if (!isRangedAttack && tags.defensive) {
      entries.push({ source: `Defensiva (+1, ${item.name})`, value: '1' })
    }
  }

  return entries
}

function readCheckedDefenseTags(dialog, entries) {
  const html = dialog.element
  return entries
    .map((_, index) => index)
    .filter((index) => html.querySelector(`[name="defenseTag${index}"]`)?.checked)
}

// paths: ['all'] rather than a specific skill selector - unlike weapon-tags.js's
// attack-side bonuses (scoped to the weapon's own Skill), Cover/Defensive
// need to apply no matter which pool the defender ends up rolling (Dodge,
// or whatever custom Attribute+Skill they pick), since physical protection
// isn't skill-specific.
async function applyDefenseTagBonus(actor, chosenEntries) {
  if (chosenEntries.length === 0) return

  await applyStatusCondition(actor, {
    name: TEMP_DEFENSE_CONDITION_NAME,
    note: '<p><em>Gerenciada automaticamente por vtm5e-automation; é removida após a resolução da defesa. Se permanecer, pode ser removida manualmente.</em></p>',
    bonuses: chosenEntries.map((entry) => ({
      source: entry.source,
      value: entry.value,
      paths: ['all'],
      displayWhenInactive: false,
      activeWhen: { check: 'always', path: '', value: '' }
    }))
  })
}

// NOW wires in getActiveModifiers (previously this bypassed situational
// modifiers entirely, confirmed by reading it before this change - the
// gap Cover/Defensive needed closed). Side effect worth knowing: any OTHER
// paths:['all'] condition already on the actor - Health/Willpower
// Impairment's -2, most notably - now correctly applies to defense rolls
// too, which it never did before. That's a genuine bug fix (Impairment is
// RAW supposed to hit every pool), not something scoped to just this
// feature, so defense rolls may get harder for already-wounded characters
// starting now.
async function rollWeaponDefense(actor, valuePaths, title) {
  const { getActiveModifiers } = await import('/systems/wod5e/system/scripts/rolls/situational-modifiers.js')
  const activeModifiers = await getActiveModifiers({ actor, selectors: [] })

  const basicDiceRaw = await WOD5E.api.getBasicDice({ valuePaths, flatMod: activeModifiers.totalValue, actor })
  const advancedDiceRaw = await WOD5E.api.getAdvancedDice({ actor })
  const { basicDice, advancedDice } = splitAdvancedDice(basicDiceRaw, advancedDiceRaw, actor)

  await WOD5E.api.Roll({
    basicDice,
    advancedDice,
    actor,
    data: actor.system,
    title,
    quickRoll: true
  })
}

function buildOptionTags(options) {
  return Object.entries(options)
    .map(([key, value]) => `<option value="${key}">${game.i18n.localize(value.label ?? key)}</option>`)
    .join('')
}

async function resolveWeaponOpposedRoll(pending, defenderActor, defenderRoll, isDodge, defenderMessageId, defenderRollHTML, defenderUserId) {
  // Cleanup for applyDefenseTagBonus's temp condition - opportunistic, same
  // as weapon-tags.js's own equivalent, rather than tracked via a flag that
  // could go stale across a page reload or a cancelled dialog. Relayed
  // (performPrivilegedWrite) since this whole function runs on the
  // ATTACKER's client (see pendingWeaponOpposedRolls's top-of-file comment)
  // but this specific write always targets the DEFENDER's actor, regardless
  // of who wins - a player attacking a GM-only NPC has never had permission
  // to make this write directly, which used to throw and abort the rest of
  // this function (including the recap card at the very end).
  if (defenderActor) {
    await performPrivilegedWrite(defenderActor, 'deleteConditionByName', { name: TEMP_DEFENSE_CONDITION_NAME })
  }

  const defenderTotal = defenderRoll.total
  const margin = pending.attackerTotal - defenderTotal
  const attackerActor = game.actors.get(pending.attackerActorId)
  const defenseLabel = isDodge ? 'Esquiva (Destreza + Atletismo)' : 'Parada Personalizada'

  let resultLine
  let loserToken = null
  let loserName = null
  let loserUserId = null
  let damageAmount = 0
  let weaponDamageValue = 0
  let ammoBonus = 0
  // The attacker's weapon can change severity; a defender's counter-attack
  // uses a different, untracked pool and remains Superficial.
  let damageSeverity = 'superficial'

  if (margin <= 0) {
    // Defender wins or ties (ties go to the defender per the rulebook).
    // Dodge specifically forfeits counter-damage even on a win - that's
    // the whole tradeoff for choosing it over a custom pool.
    if (isDodge) {
      resultLine = `${defenderActor?.name} se esquiva com sucesso. Nenhum dano.`
    } else if (margin < 0) {
      const absMargin = Math.abs(margin)
      resultLine = `${defenderActor?.name} contra-ataca com margem ${absMargin}.`
      loserToken = attackerActor?.getActiveTokens()[0]
      loserName = attackerActor?.name
      loserUserId = pending.attackerUserId
      damageAmount = absMargin
    } else {
      resultLine = 'Empate: quem defende evita o dano.'
    }
  } else {
    resultLine = `${pending.attackerName} acerta com margem ${margin}.`
    loserToken = defenderActor?.getActiveTokens()[0]
    loserName = defenderActor?.name
    loserUserId = defenderUserId
    weaponDamageValue = pending.weaponDamageValue
    ammoBonus = getAmmoDamageBonus(pending.loadedAmmoType)
    damageAmount = margin + weaponDamageValue + ammoBonus
    // Incendiary (fire) is Aggravated to EVERY target including vampires -
    // unlike Sharp, which the corebook restricts to mortals only. Checked
    // first/independently so it can't be masked by Sharp's narrower rule.
    if (pending.isIncendiary) damageSeverity = 'aggravated'
    else if ((pending.isSharp || pending.isFirearm) && defenderActor?.system?.gamesystem !== 'vampire') damageSeverity = 'aggravated'
  }

  // Electrical only fires on the attacker's own hit landing - same
  // reasoning as Sharp above (a defender's counter doesn't use the
  // original attacker's weapon at all).
  const onHitNoteHTML = margin > 0
    ? await applyOnHitTagEffects(pending, defenderActor)
    : ''
  // Fragile is checked independently of hit/miss (a fumble, not a win) -
  // see applyFragileFumble below.
  const fragileNoteHTML = await applyFragileFumble(attackerActor, pending)
  const onHitTagNoteHTML = onHitNoteHTML + fragileNoteHTML

  // Losing the contest IS "failing the roll" for Bestial Failure purposes -
  // margin<=0 means the attacker didn't beat the defender (a failure for
  // the attacker regardless of whether the defender actually did damage
  // back), margin>0 means the defender lost outright. Once we know this,
  // wod5e's own "Possible Bestial Failure" hedge on each embedded card can
  // be resolved definitively either way - see adjustBestialFailureLabel.
  const attackerFailed = margin <= 0
  const defenderFailed = margin > 0
  const attackerWon = margin > 0
  const defenderWon = margin <= 0

  const attackerBestialFailure = isBestialFailure(pending.attackerRoll, attackerActor, attackerFailed)
  const defenderBestialFailure = isBestialFailure(defenderRoll, defenderActor, defenderFailed)
  const attackerMessyCritical = isMessyCritical(pending.attackerRoll, attackerActor, attackerWon)
  const defenderMessyCritical = isMessyCritical(defenderRoll, defenderActor, defenderWon)

  let attackerRollHTML = adjustBestialFailureLabel(pending.attackerRollHTML, attackerBestialFailure)
  let adjustedDefenderRollHTML = adjustBestialFailureLabel(defenderRollHTML, defenderBestialFailure)
  attackerRollHTML = adjustMessyCriticalLabel(attackerRollHTML, attackerMessyCritical)
  adjustedDefenderRollHTML = adjustMessyCriticalLabel(adjustedDefenderRollHTML, defenderMessyCritical)

  const attackerCompulsionHTML = attackerBestialFailure
    ? buildCompulsionHTML(await rollCompulsion(attackerActor))
    : ''
  const defenderCompulsionHTML = defenderBestialFailure
    ? buildCompulsionHTML(await rollCompulsion(defenderActor))
    : ''

  const sourceMessageIds = [pending.attackerMessageId, defenderMessageId, pending.promptMessageId].filter(Boolean)

  // Only the ATTACKER's own hit (margin > 0) can reduce armor (Armor-
  // Piercing ammo, RAW: "-2 Armor Value", Second Inquisition p.72) - a
  // defender's counter (margin < 0) uses an untracked generic pool, not
  // pending's weapon/ammo at all, same gating as Sharp above. Armor
  // conversion (see postWeaponResolutionCard) still applies in
  // both directions - it's based on whoever's actually receiving the
  // damage's own equipped armor, not on which side attacked.
  const isArmorPiercingAmmo = margin > 0 && pending.loadedAmmoType === 'armorPiercing'
  // Same gating as Sharp/Armor-Piercing above - Taser is a property of the
  // ATTACKER's own weapon, so it only ever triggers on their hit landing.
  const isTaser = margin > 0 && !!pending.isTaser

  await postWeaponResolutionCard({
    weaponName: pending.weaponName,
    attackerName: pending.attackerName,
    attackerRollHTML,
    attackerCompulsionHTML,
    defenderName: defenderActor?.name,
    defenderRollHTML: adjustedDefenderRollHTML,
    defenderCompulsionHTML,
    defenseLabel,
    attackerWon,
    resultLine,
    loserToken,
    loserName,
    loserUserId,
    damageAmount,
    damageSeverity,
    margin,
    weaponDamageValue,
    ammoBonus,
    isArmorPiercingAmmo,
    isTaser,
    onHitTagNoteHTML,
    sourceMessageIds
  })
}

// Fragile (weapon-tags.js) - reworked 2026-07-24 per Jake's call: the
// original "breaks on ANY successful hit" was far too punishing for cheap
// gear meant to occasionally see combat, not evaporate the first time it
// connects. Now checked independently of hit/miss - a genuine dice fumble
// (the attacker's own roll totals zero successes, this system's closest
// analog to a "critical fail") marks the weapon Broken (repair.js) rather
// than destroying it outright, so cheap gear becomes a real but recoverable
// setback instead of a one-and-done loss.
async function applyFragileFumble(attackerActor, pending) {
  if (!pending.isFragile || !attackerActor || pending.attackerTotal !== 0) return ''

  const weaponItem = attackerActor.items.get(pending.attackerWeaponId)
  if (!weaponItem) return ''

  await markBroken(weaponItem)
  return `<p class="vtm5e-automation-recap-narrative">${weaponItem.name} quebra nas mãos de ${pending.attackerName}: quebrada (-2 dados) até ser reparada.</p>`
}

// (Electrical used to live here too - removed 2026-07-22 in favor of a real
// TASER-style stun mechanic, not yet built.)
async function applyOnHitTagEffects(pending, defenderActor) {
  let noteHTML = ''

  // Dragon's Breath/Wood are ammo (weapon-tags.js's loadedAmmoType), not
  // weapon tags, but apply the same real, mechanical condition-on-a-hit
  // pattern, manually cleared by the GM (no Combat-tracker integration
  // exists anywhere in this codebase).
  if (pending.loadedAmmoType === 'dragonsBreath' && defenderActor) {
    await performPrivilegedWrite(defenderActor, 'applyStatusCondition', {
      spec: {
        name: 'Burning',
        note: '<p>Munição Sopro do Dragão: -2 dados em todas as paradas. Narrador: remova após o próximo turno do alvo.</p>',
        bonuses: [{
          source: 'Em chamas',
          value: '-2',
          paths: ['all'],
          displayWhenInactive: false,
          activeWhen: { check: 'always', path: '', value: '' }
        }]
      }
    })
    noteHTML += `<p class="vtm5e-automation-recap-narrative">${defenderActor.name} está em chamas (-2 dados; remova após seu próximo turno).</p>`
  }

  // Flash-bang (Second Inquisition p.150) - simplified to this system's
  // existing binary hit/miss model: a full Blind on the attacker's win, no
  // effect otherwise. RAW actually has EITHER side risk blindness depending
  // on who wins the Dex+Athletics-vs-Wits+Resolve contest (a thrower can
  // blind themselves), and a lesser -2 dice consolation penalty for the
  // side that wins - both dropped here since this module's opposed-roll
  // pipeline only ever applies the attacker's own weapon effects to the
  // DEFENDER (see Sharp/Taser/Incendiary above), not the reverse.
  if (pending.isFlashbang && defenderActor) {
    await performPrivilegedWrite(defenderActor, 'applyStatusCondition', {
      spec: {
        name: 'Blinded (Flash-bang)',
        note: '<p>Granada de luz e som: -3 dados em todas as paradas. Narrador: remova após o próximo turno do alvo (proteção ocular e cegueira do atacante em caso de erro não são automatizadas; veja weapon-tags.js).</p>',
        bonuses: [{
          source: 'Cego',
          value: '-3',
          paths: ['all'],
          displayWhenInactive: false,
          activeWhen: { check: 'always', path: '', value: '' }
        }]
      }
    })
    noteHTML += `<p class="vtm5e-automation-recap-narrative">${defenderActor.name} está cego pela granada de luz e som (-3 dados; remova após seu próximo turno).</p>`
  }

  // Thermite (p.73) - RAW is a real 3-round damage-over-time burn (3 Agg./
  // round for 3 rounds), which this module can't automate (no Combat
  // Tracker/round-counter integration exists anywhere in this codebase -
  // same limitation Taser's escape roll and every duration-based condition
  // here already lives with). No dice-pool bonuses attached (matches
  // applyStatusCondition's own "behavioral restriction, not a clean number"
  // pattern) - the note carries the actual mechanical instruction for the
  // GM to apply by hand.
  if (pending.isThermite && defenderActor) {
    await performPrivilegedWrite(defenderActor, 'applyStatusCondition', {
      spec: {
        name: 'On Fire (Thermite)',
        note: '<p>Atingido por termite. Narrador: aplique 3 de dano Agravado no início dos próximos 3 turnos do alvo. É muito difícil apagar as chamas (a critério do Narrador). Remova quando o fogo terminar ou for apagado.</p>',
        bonuses: []
      }
    })
    noteHTML += `<p class="vtm5e-automation-recap-narrative">${defenderActor.name} está em chamas devido à termite. Narrador: aplique 3 de dano Agravado por rodada durante 3 rodadas.</p>`
  }

  // White Phosphorus round (p.73) - same -3 dice tier as Wood/Flash-bang,
  // applied broadly to all pools rather than just "vision-reliant" ones
  // (this module doesn't have a selector for that) - the Dominate/Presence
  // interaction clauses are pure narrative, noted but not enforced.
  if (pending.loadedAmmoType === 'whitePhosphorus' && defenderActor) {
    await performPrivilegedWrite(defenderActor, 'applyStatusCondition', {
      spec: {
        name: 'Phosphorus-Blinded',
        note: '<p>Munição de fósforo branco: -3 dados em todas as paradas (pelas regras, apenas nas que dependem da visão). Também impede Dominação por contato visual e concede +2 dados para resistir a Presença enquanto durar; esses efeitos não são automatizados. Narrador: remova após o próximo turno do alvo.</p>',
        bonuses: [{
          source: 'Cego pelo fósforo',
          value: '-3',
          paths: ['all'],
          displayWhenInactive: false,
          activeWhen: { check: 'always', path: '', value: '' }
        }]
      }
    })
    noteHTML += `<p class="vtm5e-automation-recap-narrative">${defenderActor.name} está cego pelo fósforo (-3 dados; remova após seu próximo turno).</p>`
  }

  // Wood/stake rounds: the actual corebook rule (a stake through the heart
  // risks Torpor) only makes sense against a vampire - silently does
  // nothing to a mortal/other target rather than pretending a wooden round
  // has some other effect on them.
  if (pending.loadedAmmoType === 'wood' && defenderActor?.system?.gamesystem === 'vampire') {
    await performPrivilegedWrite(defenderActor, 'applyStatusCondition', {
      spec: {
        name: 'Staked (Torpor Risk)',
        note: '<p>Atingido por munição de estaca de madeira: -3 dados em todas as paradas enquanto a estaca permanecer cravada. Narrador: remova a condição quando a estaca for retirada e, caso ela não seja retirada, decida sobre o Torpor conforme as regras de estaqueamento do livro básico.</p>',
        bonuses: [{
          source: 'Estaqueado',
          value: '-3',
          paths: ['all'],
          displayWhenInactive: false,
          activeWhen: { check: 'always', path: '', value: '' }
        }]
      }
    })
    noteHTML += `<p class="vtm5e-automation-recap-narrative">${defenderActor.name} está estaqueado (-3 dados; risco de Torpor até a estaca ser retirada).</p>`
  }

  return noteHTML
}

// Single recap card per opposed roll instead of a separate roll message per
// side plus a separate "who won"/"apply damage" message - embeds each side's
// actual roll card (dice faces and all) so nothing is lost, then deletes the
// originals via sourceMessageIds once this card is live.
async function postWeaponResolutionCard({ weaponName, attackerName, attackerRollHTML, attackerCompulsionHTML, defenderName, defenderRollHTML, defenderCompulsionHTML, defenseLabel, attackerWon, resultLine, loserToken, loserName, loserUserId, damageAmount, damageSeverity, margin, weaponDamageValue, ammoBonus, isArmorPiercingAmmo, isTaser, onHitTagNoteHTML, sourceMessageIds }) {
  // Looked up per the actor actually taking the damage - an NPC's damage can
  // apply automatically while a player's still waits for a click, or vice versa.
  const mode = loserToken?.actor ? getStepSetting('damageApplication', loserToken.actor) : 'prompt'
  const willAutoApply = mode === 'auto' && loserToken && damageAmount > 0
  const armorOptions = { reduceByArmor: true, armorPiercingAmmo: isArmorPiercingAmmo }

  // Calculate the display locally before the possibly relayed write.
  const breakdown = computeDamageBreakdown(loserToken?.actor, damageAmount, damageSeverity, armorOptions)
  const displayDamageAmount = breakdown.total
  if (willAutoApply) {
    await performPrivilegedDamage(loserToken, damageAmount, damageSeverity, armorOptions)
  }

  // Taser threshold uses the actual damage shown on the card.
  let taserNoteHTML = ''
  if (isTaser && displayDamageAmount > 0 && loserToken?.actor) {
    const threshold = displayDamageAmount
    await performPrivilegedWrite(loserToken.actor, 'applyStatusCondition', {
      spec: {
        name: 'Stunned (Taser)',
        note: `<p>Atingido por um taser: role Autocontrole + Determinação; são necessários ${threshold} ou mais sucessos para agir normalmente no próximo turno. Com menos sucessos, não pode agir no próximo turno. Narrador ou jogador: remova esta condição após a resolução.</p>`,
        bonuses: []
      }
    })
    taserNoteHTML = `<p class="vtm5e-automation-recap-narrative">${loserName} está atordoado pelo taser e precisa de ${threshold} ou mais sucessos em Autocontrole + Determinação para agir no próximo turno.</p>`
  }

  // Damage cases get a plain "who's taking it" heading instead of the full
  // sentence - the number below already says how much. No-damage cases
  // (dodge, tie) keep the sentence since there's no actor to head instead.
  // Manual/prompt mode's Superficial/Aggravated buttons (buildDamageButtonRow
  // in roll-utils.js) always offer BOTH regardless of damageSeverity here -
  // same pre-existing limitation already noted in discipline-resistance.js,
  // not solved by this change either.
  const damageLabel = breakdown.aggravated && breakdown.superficial
    ? `${breakdown.aggravated} Agravado + ${breakdown.superficial} Superficial à Vitalidade`
    : `Dano ${breakdown.aggravated ? 'Agravado' : 'Superficial'} à Vitalidade`
  let calculation = `Margem ${Math.abs(margin)}`
  if (margin > 0 && weaponDamageValue > 0) calculation += ` + arma ${weaponDamageValue}`
  if (margin > 0 && ammoBonus > 0) calculation += ` + munição ${ammoBonus}`
  calculation += ` = ${damageAmount} de dano bruto (${damageSeverity === 'aggravated' ? 'Agravado' : 'Superficial'}).`
  if (breakdown.converted > 0) calculation += ` Armadura ${breakdown.armor} converteu ${breakdown.converted} em Superficial.`
  if (breakdown.superficialRaw > 0 && breakdown.toughness > 0) calculation += ` Tenacidade −${breakdown.toughness}: Superficial ${breakdown.superficialRaw} → ${breakdown.superficialAfterToughness}.`
  if (breakdown.superficialRaw > 0) calculation += ` Superficial ${breakdown.superficialAfterToughness} ÷ 2 = ${breakdown.superficialHalved}.`
  if (breakdown.total < breakdown.aggravatedRaw + breakdown.superficialHalved) calculation += ' Limitado pela trilha de Vitalidade.'
  const bottomSection = displayDamageAmount > 0
    ? `
      <p class="vtm5e-automation-recap-name">${loserName}</p>
      <div class="vtm5e-automation-recap-damage">
        <div class="vtm5e-automation-recap-damage-amount">${displayDamageAmount}</div>
        <div class="vtm5e-automation-recap-damage-label">${damageLabel}</div>
        <div class="vtm5e-automation-recap-calc" style="font-size:0.85em;opacity:0.8">${calculation}</div>
      </div>
    `
    : damageAmount > 0
      ? `<p class="vtm5e-automation-recap-result">A trilha de Vitalidade de ${loserName} já está cheia.</p>`
      : `<p class="vtm5e-automation-recap-result">${resultLine}</p>`

  // Bottom banner naming who actually won the contest (attackerWon, computed
  // above alongside resultLine) - same "ties go to the defender" rule
  // resultLine already follows. Sits above bottomSection so the outcome
  // (who + what) reads as one unit, matching Jake's ask for a clear
  // win banner instead of having to infer the winner from resultLine text.
  const winnerName = attackerWon ? attackerName : defenderName

  const content = `
    <div class="vtm5e-automation-recap">
      <p class="vtm5e-automation-recap-title">${weaponName} - Disputa</p>
      <div class="vtm5e-automation-recap-roll">
        <p class="vtm5e-automation-recap-name">${attackerName}</p>
        ${attackerRollHTML}
        ${attackerCompulsionHTML}
      </div>
      <hr>
      <div class="vtm5e-automation-recap-roll">
        <p class="vtm5e-automation-recap-name">${defenderName} <span class="vtm5e-automation-recap-defense">(${defenseLabel})</span></p>
        ${defenderRollHTML}
        ${defenderCompulsionHTML}
      </div>
      <hr>
      <p class="vtm5e-automation-recap-outcome">${winnerName} vence</p>
      ${bottomSection}
      ${onHitTagNoteHTML || ''}
      ${taserNoteHTML}
    </div>
  `

  const pendingDamage = !willAutoApply && loserToken && damageAmount > 0
    ? { actorId: loserToken.actor?.id, amount: damageAmount, controllingUserId: loserUserId, track: 'health', applyOptions: armorOptions }
    : null

  await ChatMessage.create({
    content,
    flags: { [MODULE_ID]: { sourceMessageIds, pendingDamage } }
  })
}
