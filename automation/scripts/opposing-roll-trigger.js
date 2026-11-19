import { findWeaponForRoll, splitAdvancedDice, renderRollCardHTML, isBestialFailure, adjustBestialFailureLabel, isMessyCritical, adjustMessyCriticalLabel } from './roll-utils.js'
import { getStepSetting } from './settings.js'
import { getRoutingTargets } from './socket-routing.js'
import { computeDamageBreakdown } from './damage-application.js'
import { rollCompulsion, buildCompulsionHTML } from './compulsion.js'
import { applyStatusCondition } from './condition-application.js'
import { CALLED_SHOT_LABEL, getLoadedAmmoType, getAmmoDamageBonus, getWeaponDamageValue, OFF_BY_DEFAULT } from './weapon-tags.js'
import { performPrivilegedWrite, performPrivilegedDamage } from './privileged-write-relay.js'
import { markBroken } from './repair.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'
const DODGE_TITLE_MARKER = 'DODGE::'
const STATIONARY_TITLE_MARKER = 'STATIONARY::'
const STATIONARY_LABEL = 'Alvo parado (Dificuldade 1)'
const STATIONARY_TITLE = 'Alvo parado: Dificuldade 1'
const COVER_OPTIONS = [
  [-2, 'Nenhuma cobertura'],
  [-1, 'Apenas ocultação (arbustos, árvore pequena contra rifle)'],
  [0, 'Cobertura rígida (bloco de motor, esquina de concreto)'],
  [1, 'Entrincheiramento (sacos de areia, casamata)'],
  [2, 'Ameia (fenda de disparo de veículo militar)']
]
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
// regardless of who rolled the defense. Title markers carry the defense choice.
const pendingWeaponOpposedRolls = new Map()
const bilateralDamageClicks = new WeakMap()

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
      await resolveWeaponOpposedRoll(pending, message.speakerActor, roll, message.id, await renderRollCardHTML(message), message.author?.id)
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

  Hooks.on('renderChatMessageHTML', (message, html) => {
    if (message.rolls?.[0]?.options?.title === `${STATIONARY_TITLE_MARKER}${STATIONARY_TITLE}`) {
      const label = html.querySelector('.roll-label')
      if (label) label.textContent = STATIONARY_TITLE
    }
    renderBilateralDamageButtons(message, html)
  })
}

async function promptWeaponDefense(originalMessage, attackerRoll, weapon, targetActor, mode) {
  const isFlashbang = !!weapon.getFlag(MODULE_ID, 'weaponTags')?.flashbang
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
    isFlashbang,
    isCalledShot: !isFlashbang && !!attackerRoll.options?.activeModifiers?.some?.((modifier) => modifier.label === CALLED_SHOT_LABEL),
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
  const coverFieldHTML = weaponType === 'ranged'
    ? `<div class="form-group">
        <label for="weaponDefenseCover">Cobertura</label>
        <select id="weaponDefenseCover" name="coverSelect">
          ${COVER_OPTIONS.map(([value, label]) => `<option value="${value}"${value === 0 ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>`
    : ''

  const defenseTagFieldsHTML = defenseTagEntries.length > 0
    ? `<div class="form-group">${defenseTagEntries.map((entry, index) => `<label><input type="checkbox" name="defenseTag${index}" checked /> ${entry.source}</label>`).join('<br>')}</div>`
    : ''

  const content = `
    <form class="vtm5e-automation-weapon-defense-dialog">
      <p><b>${weaponName}</b> está atacando <b>${actor.name}</b>.</p>
      <p style="font-size:0.85em; color:#666;">Esquiva sempre usa Destreza + Atletismo e não causa dano ao atacante, mesmo em caso de vitória. Para contra-atacar, escolha uma parada personalizada.</p>
      ${defenseTagFieldsHTML}
      ${coverFieldHTML}
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
        callback: (_event, _button, dialog) => ({
          isDodge: true,
          checkedTagIndexes: readCheckedDefenseTags(dialog, defenseTagEntries),
          cover: readCover(dialog)
        })
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
            checkedTagIndexes: readCheckedDefenseTags(dialog, defenseTagEntries),
            cover: readCover(dialog)
          }
        }
      },
      { action: 'stationary', icon: 'fas fa-person', label: STATIONARY_LABEL, callback: () => 'stationary' },
      { action: 'cancel', icon: 'fas fa-times', label: 'Cancelar' }
    ],
    classes: ['wod5e']
  })

  if (!result || result === 'cancel') return
  if (result === 'stationary') {
    await WOD5E.api.Roll({
      basicDice: 1,
      advancedDice: 0,
      actor,
      data: actor.system,
      title: `${STATIONARY_TITLE_MARKER}${STATIONARY_TITLE}`,
      quickRoll: true
    })
    return
  }

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

  await rollWeaponDefense(actor, valuePaths, title, result.cover)
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

function readCover(dialog) {
  return Number(dialog.element.querySelector('[name="coverSelect"]')?.value ?? 0)
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

async function rollWeaponDefense(actor, valuePaths, title, extraMod = 0) {
  const { getActiveModifiers } = await import('/systems/wod5e/system/scripts/rolls/situational-modifiers.js')
  // Attribute modifiers use the pool path without its value suffix.
  const selectors = valuePaths.map(path => path.replace(/\.value$/, ''))
  const activeModifiers = await getActiveModifiers({ actor, selectors })

  const basicDiceRaw = await WOD5E.api.getBasicDice({ valuePaths, flatMod: activeModifiers.totalValue + extraMod, actor })
  const advancedDiceRaw = await WOD5E.api.getAdvancedDice({ actor })
  const { basicDice, advancedDice } = splitAdvancedDice(Math.max(basicDiceRaw, 0), advancedDiceRaw, actor)

  await WOD5E.api.Roll({
    basicDice,
    advancedDice,
    actor,
    data: actor.system,
    title: extraMod === 0 ? title : `${title}, cobertura ${extraMod > 0 ? '+' : '−'}${Math.abs(extraMod)}`,
    quickRoll: true
  })
}

function buildOptionTags(options) {
  return Object.entries(options)
    .map(([key, value]) => `<option value="${key}">${game.i18n.localize(value.label ?? key)}</option>`)
    .join('')
}

async function resolveWeaponOpposedRoll(pending, defenderActor, defenderRoll, defenderMessageId, defenderRollHTML, defenderUserId) {
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

  const defenseTitle = defenderRoll.options?.title ?? ''
  const isDodge = defenseTitle.startsWith(DODGE_TITLE_MARKER)
  const isStationary = defenseTitle.startsWith(STATIONARY_TITLE_MARKER)
  const defenderTotal = isStationary ? 1 : defenderRoll.total
  const attackerTotal = pending.isCalledShot ? Math.max(pending.attackerTotal - 2, 0) : pending.attackerTotal
  const margin = attackerTotal - defenderTotal
  const attackerActor = game.actors.get(pending.attackerActorId)
  const defenseLabel = isStationary ? STATIONARY_LABEL : isDodge ? 'Esquiva (Destreza + Atletismo)' : 'Parada Personalizada'
  const canCounterAttack = !isDodge && !isStationary && !pending.isFlashbang
  const isBilateralTie = margin === 0 && canCounterAttack
  const attackerWon = margin > 0
  const weaponHit = !pending.isFlashbang && (attackerWon || isBilateralTie)

  let resultLine
  const hits = []
  if (pending.isFlashbang) {
    resultLine = attackerWon
      ? `${pending.attackerName} acerta com margem ${margin}.`
      : margin < 0
        ? `${defenderActor?.name} vence a disputa com margem ${Math.abs(margin)}.`
        : 'Empate: a disputa favorece quem defende.'
  } else if (isBilateralTie) {
    resultLine = 'Empate em conflito bilateral: os dois causam dano como margem 1 (Livro Básico, p. 125).'
  } else if (attackerWon) {
    resultLine = `${pending.attackerName} acerta com margem ${margin}.`
  } else if (canCounterAttack) {
    resultLine = `${defenderActor?.name} contra-ataca com margem ${Math.abs(margin)}.`
  } else if (isStationary) {
    resultLine = `${defenderActor?.name} permanece ileso. Nenhum dano.`
  } else {
    resultLine = `${defenderActor?.name} se esquiva com sucesso. Nenhum dano.`
  }

  let onHitNoteHTML = ''
  if (weaponHit) {
    const hitMargin = isBilateralTie ? 1 : margin
    const weaponDamageValue = pending.weaponDamageValue
    const ammoBonus = getAmmoDamageBonus(pending.loadedAmmoType)
    const damageAmount = hitMargin + weaponDamageValue + ammoBonus
    const isFireDamage = pending.isIncendiary || pending.loadedAmmoType === 'dragonsBreath'
    const isLethalToMortals = pending.isSharp || (pending.isFirearm && !pending.isTaser)
    const isAggravated = isFireDamage || (isLethalToMortals && defenderActor?.system?.gamesystem !== 'vampire')
    hits.push({
      actor: defenderActor,
      token: defenderActor?.getActiveTokens()[0],
      controllingUserId: defenderUserId,
      damageAmount,
      damageSeverity: isAggravated ? 'aggravated' : 'superficial',
      hitMargin,
      weaponDamageValue,
      ammoBonus,
      isTaser: !!pending.isTaser,
      isArmorPiercingAmmo: pending.loadedAmmoType === 'armorPiercing'
    })
    onHitNoteHTML = await applyOnHitTagEffects(pending, defenderActor, damageAmount)
  }
  if (canCounterAttack && margin <= 0) {
    const hitMargin = isBilateralTie ? 1 : Math.abs(margin)
    hits.push({
      actor: attackerActor,
      token: attackerActor?.getActiveTokens()[0],
      controllingUserId: pending.attackerUserId,
      damageAmount: hitMargin,
      damageSeverity: 'superficial',
      hitMargin,
      isArmorPiercingAmmo: false
    })
  }

  const flashbangNoteHTML = pending.isFlashbang && defenderActor
    ? await applyFlashbangEffect(defenderActor, attackerWon)
    : ''
  // Fragile is checked independently of hit/miss (a fumble, not a win) -
  // see applyFragileFumble below.
  const fragileNoteHTML = await applyFragileFumble(attackerActor, pending)
  const onHitTagNoteHTML = flashbangNoteHTML + onHitNoteHTML + fragileNoteHTML

  const attackerBestialFailure = isBestialFailure(pending.attackerRoll, attackerActor, !attackerWon && !isBilateralTie)
  const defenderBestialFailure = !isStationary && isBestialFailure(defenderRoll, defenderActor, attackerWon)
  const attackerMessyCritical = isMessyCritical(pending.attackerRoll, attackerActor, attackerWon || isBilateralTie)
  const defenderMessyCritical = !isStationary && isMessyCritical(defenderRoll, defenderActor, !attackerWon)

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
    hits,
    margin,
    isCalledShot: pending.isCalledShot,
    isBilateralTie,
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

async function applyOnHitTagEffects(pending, defenderActor, damageAmount) {
  let noteHTML = ''

  if (pending.loadedAmmoType === 'dragonsBreath' && defenderActor) {
    await performPrivilegedWrite(defenderActor, 'applyStatusCondition', {
      spec: {
        name: 'Burning',
        note: '<p>Sopro de Dragão: o alvo está em chamas e sofre 1 de dano Agravado por rodada até o fogo ser apagado (Livro Básico, p. 380). Narrador: aplique o dano a cada rodada e remova a condição quando o fogo for apagado.</p>',
        bonuses: []
      }
    })
    noteHTML += `<p class="vtm5e-automation-recap-narrative">${defenderActor.name} pegou fogo (1 Agravado por rodada até apagar).</p>`
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

  // Players toggle the penalty for rolls that depend on sight.
  if (pending.loadedAmmoType === 'whitePhosphorus' && defenderActor) {
    await performPrivilegedWrite(defenderActor, 'applyStatusCondition', {
      spec: {
        name: 'Phosphorus-Blinded',
        note: '<p>Fósforo branco: -3 dados nas paradas que dependem da visão (marque a opção na rolagem). Torna ineficaz a Dominação por contato visual e dá +2 dados para resistir à Presença (Segunda Inquisição, p. 73). Narrador: remova quando a fumaça se dissipar.</p>',
        bonuses: [{
          source: 'Cego pelo fósforo (marque se a parada depende da visão)',
          value: '-3',
          paths: ['all'],
          displayWhenInactive: true,
          activeWhen: OFF_BY_DEFAULT
        }]
      }
    })
    noteHTML += `<p class="vtm5e-automation-recap-narrative">${defenderActor.name} está cego pelo fósforo (-3 nas paradas que dependem da visão).</p>`
  }

  if (pending.loadedAmmoType === 'wood' && defenderActor?.system?.gamesystem === 'vampire') {
    let result
    if (!pending.isCalledShot) {
      result = 'Estaca sem ataque localizado: golpe comum, sem paralisia (marque "Ataque localizado" para mirar no coração).'
    } else if (damageAmount < 5) {
      result = 'Estaca no coração, mas com menos de 5 de dano: não paralisa (Livro Básico, p. 304).'
    } else {
      await performPrivilegedWrite(defenderActor, 'applyStatusCondition', {
        spec: {
          name: 'Staked (Paralyzed)',
          note: '<p>Estaca no coração: o vampiro fica paralisado até a estaca ser retirada (Livro Básico, p. 304). Narrador: remova a condição quando a estaca sair.</p>',
          bonuses: []
        }
      })
      result = `${defenderActor.name} foi estaqueado no coração e está paralisado.`
    }
    noteHTML += `<p class="vtm5e-automation-recap-narrative">${result}</p>`
  }

  return noteHTML
}

async function applyFlashbangEffect(defenderActor, attackerWon) {
  const spec = attackerWon
    ? {
      name: 'Blinded (Flash-bang)',
      note: '<p>Granada de luz e som: o alvo não enxerga nada por alguns segundos (Segunda Inquisição, p. 72). O livro não fixa penalidade: o Narrador aplica as consequências de não enxergar e remove a condição quando passar.</p>',
      bonuses: []
    }
    : {
      name: 'Disoriented (Flash-bang)',
      note: '<p>Granada de luz e som: desorientado, -2 dados nas paradas de Raciocínio por uma rodada (Segunda Inquisição, p. 72). Narrador: remova após uma rodada.</p>',
      bonuses: [{
        source: 'Desorientado',
        value: '-2',
        paths: ['attributes.wits'],
        displayWhenInactive: false,
        activeWhen: { check: 'always', path: '', value: '' }
      }]
    }
  await performPrivilegedWrite(defenderActor, 'applyStatusCondition', { spec })

  const result = attackerWon
    ? `${defenderActor.name} não enxerga nada por alguns segundos.`
    : `${defenderActor.name} fica desorientado (-2 em Raciocínio por uma rodada).`
  return `<p class="vtm5e-automation-recap-narrative">${result}</p>`
}

async function renderHit(hit, shotNote, isBilateralTie) {
  const { actor, token, controllingUserId, damageAmount, damageSeverity, hitMargin, weaponDamageValue, ammoBonus, isArmorPiercingAmmo, isTaser } = hit
  const loserName = actor?.name
  const mode = token?.actor ? getStepSetting('damageApplication', token.actor) : 'prompt'
  const willAutoApply = mode === 'auto' && token && damageAmount > 0
  const armorOptions = { reduceByArmor: true, armorPiercingAmmo: isArmorPiercingAmmo }

  const breakdown = computeDamageBreakdown(token?.actor ?? (isBilateralTie ? actor : undefined), damageAmount, damageSeverity, armorOptions)
  const displayDamageAmount = breakdown.total
  if (willAutoApply) {
    await performPrivilegedDamage(token, damageAmount, damageSeverity, armorOptions)
  }

  // Taser threshold uses the actual damage shown on the card.
  let taserNoteHTML = ''
  if (isTaser && displayDamageAmount > 0 && token?.actor) {
    const threshold = displayDamageAmount
    await performPrivilegedWrite(token.actor, 'applyStatusCondition', {
      spec: {
        name: 'Stunned (Taser)',
        note: `<p>Atingido por um taser: role Autocontrole + Determinação; são necessários ${threshold} ou mais sucessos para agir normalmente no próximo turno. Com menos sucessos, não pode agir no próximo turno. Narrador ou jogador: remova esta condição após a resolução.</p>`,
        bonuses: []
      }
    })
    taserNoteHTML = `<p class="vtm5e-automation-recap-narrative">${loserName} está atordoado pelo taser e precisa de ${threshold} ou mais sucessos em Autocontrole + Determinação para agir no próximo turno.</p>`
  }

  const damageLabel = breakdown.aggravated && breakdown.superficial
    ? `${breakdown.aggravated} Agravado + ${breakdown.superficial} Superficial à Vitalidade`
    : `Dano ${breakdown.aggravated || (isBilateralTie && displayDamageAmount === 0 && damageSeverity === 'aggravated') ? 'Agravado' : 'Superficial'} à Vitalidade`
  let calculation = `${shotNote}Margem ${hitMargin}`
  if (weaponDamageValue > 0) calculation += ` + arma ${weaponDamageValue}`
  if (ammoBonus > 0) calculation += ` + munição ${ammoBonus}`
  calculation += ` = ${damageAmount} de dano bruto (${damageSeverity === 'aggravated' ? 'Agravado' : 'Superficial'}).`
  if (breakdown.converted > 0) calculation += ` Armadura ${breakdown.armor} converteu ${breakdown.converted} em Superficial.`
  if (breakdown.superficialRaw > 0 && breakdown.toughness > 0) calculation += ` Tenacidade −${breakdown.toughness}: Superficial ${breakdown.superficialRaw} → ${breakdown.superficialAfterToughness}.`
  if (breakdown.superficialRaw > 0) calculation += ` Superficial ${breakdown.superficialAfterToughness} ÷ 2 = ${breakdown.superficialHalved}.`
  if (breakdown.total < breakdown.aggravatedRaw + breakdown.superficialHalved) calculation += ' Limitado pela trilha de Vitalidade.'
  const damageHTML = displayDamageAmount > 0 || isBilateralTie
    ? `
      <p class="vtm5e-automation-recap-name">${loserName}</p>
      <div class="vtm5e-automation-recap-damage">
        <div class="vtm5e-automation-recap-damage-amount">${displayDamageAmount}</div>
        <div class="vtm5e-automation-recap-damage-label">${damageLabel}</div>
        <div class="vtm5e-automation-recap-calc" style="font-size:0.85em;opacity:0.8">${calculation}</div>
      </div>
    `
    : `<p class="vtm5e-automation-recap-result">A trilha de Vitalidade de ${loserName} já está cheia.</p>`
  const pendingDamage = !willAutoApply && token && damageAmount > 0
    ? { actorId: token.actor?.id, amount: damageAmount, controllingUserId, track: 'health', applyOptions: armorOptions }
    : null

  return { damageHTML, taserNoteHTML, pendingDamage }
}

// One recap embeds both rolls and all resulting damage.
async function postWeaponResolutionCard({ weaponName, attackerName, attackerRollHTML, attackerCompulsionHTML, defenderName, defenderRollHTML, defenderCompulsionHTML, defenseLabel, attackerWon, resultLine, hits, margin, isCalledShot, isBilateralTie, onHitTagNoteHTML, sourceMessageIds }) {
  const shotNote = isCalledShot ? 'Ataque localizado: −2 sucessos. ' : ''
  const damageSections = []
  const taserNotes = []
  const bilateralDamage = []
  let pendingDamage = null
  for (const [index, hit] of hits.entries()) {
    if (!isBilateralTie && hit.damageAmount <= 0) continue
    const rendered = await renderHit(hit, index === 0 ? shotNote : '', isBilateralTie)
    damageSections.push(rendered.damageHTML)
    if (rendered.taserNoteHTML) taserNotes.push(rendered.taserNoteHTML)
    if (isBilateralTie && rendered.pendingDamage) {
      bilateralDamage.push({
        ...rendered.pendingDamage,
        hitIndex: index,
        tokenId: hit.token.id,
        sceneId: hit.token.scene?.id,
        severity: hit.damageSeverity
      })
    } else if (!isBilateralTie) {
      pendingDamage = rendered.pendingDamage
    }
  }

  const winnerName = attackerWon ? attackerName : defenderName
  const outcome = isBilateralTie ? resultLine : `${winnerName} vence`
  const bottomSection = damageSections.length > 0
    ? damageSections.join('')
    : `<p class="vtm5e-automation-recap-result">${resultLine}</p>`
  const standaloneCalculation = shotNote && !bottomSection.includes(shotNote)
    ? `<div class="vtm5e-automation-recap-calc" style="font-size:0.85em;opacity:0.8">${shotNote}Margem ${margin}.</div>`
    : ''

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
      <p class="vtm5e-automation-recap-outcome">${outcome}</p>
      ${standaloneCalculation}
      ${bottomSection}
      ${onHitTagNoteHTML || ''}
      ${taserNotes.join('')}
    </div>
  `

  await ChatMessage.create({
    content,
    flags: { [MODULE_ID]: { sourceMessageIds, pendingDamage, ...(bilateralDamage.length > 0 ? { bilateralDamage } : {}) } }
  })
}

function renderBilateralDamageButtons(message, html) {
  const pendingHits = message.getFlag(MODULE_ID, 'bilateralDamage')
  if (!pendingHits?.length) return

  const damageSections = html.querySelectorAll('.vtm5e-automation-recap-damage')
  const handled = bilateralDamageClicks.get(message) ?? new Set()
  bilateralDamageClicks.set(message, handled)

  for (const hit of pendingHits) {
    const section = damageSections[hit.hitIndex]
    if (!section || section.querySelector('.vtm5e-automation-damage-buttons')) continue

    const scene = hit.sceneId ? game.scenes.get(hit.sceneId) : canvas.scene
    const token = scene?.tokens.get(hit.tokenId)?.object
    if (!token?.actor) continue
    const isEligible = hit.controllingUserId ? game.user.id === hit.controllingUserId : token.actor.isOwner
    if (!game.user.isGM && !isEligible) continue

    const row = document.createElement('div')
    row.classList.add('vtm5e-automation-damage-buttons')
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = `Aplicar dano a ${token.actor.name}`
    button.disabled = handled.has(hit.hitIndex)
    button.addEventListener('click', async () => {
      if (handled.has(hit.hitIndex)) return
      handled.add(hit.hitIndex)
      button.disabled = true
      try {
        await performPrivilegedDamage(token, hit.amount, hit.severity, hit.applyOptions)
      } catch (error) {
        handled.delete(hit.hitIndex)
        button.disabled = false
        throw error
      }
    })
    row.appendChild(button)
    section.appendChild(row)
  }
}
