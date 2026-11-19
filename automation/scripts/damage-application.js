import { findWeaponForRoll } from './roll-utils.js'
import { isConditionNamed } from './condition-application.js'
import { getStepSetting } from './settings.js'
import { getLoadedAmmoType, getAmmoDamageBonus, getWeaponDamageValue } from './weapon-tags.js'
import { performPrivilegedDamage } from './privileged-write-relay.js'
import { isBroken, isUnrepairable, isWorn, absorbArmorDamage, effectiveArmorValue, armorDamageAbsorbedFor, armorThresholdFor, repairAttemptsFor, MAX_REPAIR_ATTEMPTS } from './repair.js'
import { equippedSlotFor, slotLabel } from './equip.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

/**
 * armorvalue (armor-item-model.js) is a pure display field in wod5e itself -
 * this is the first thing in this module that actually reads it. Real
 * layering (2026-07-24, Jake's call): Underarmor and Body Armor are
 * DIFFERENT slots (equip.js) that can both be worn at once and both
 * contribute - a concealable vest under a rigid plate carrier is exactly
 * how real soft+hard armor combos work. Within a single slot it's still
 * MAX not SUM (equip.js's own one-item-per-slot rule already prevents two
 * body-armor pieces being worn simultaneously, so there's only ever one
 * candidate per slot in practice - reduce() here is just how "the one
 * candidate, if any" gets picked out cleanly). Broken armor (repair.js's
 * durability mechanic - a piece that's absorbed more damage than its own
 * threshold) is excluded from the pool entirely, which is what makes it
 * "no longer providing protection" for that slot until repaired.
 */
function bestArmorInSlot(actor, slot) {
  const candidates = actor?.items.filter((i) => i.type === 'armor' && equippedSlotFor(i) === slot && !isBroken(i)) ?? []
  if (candidates.length === 0) return null
  return candidates.reduce((best, item) => effectiveArmorValue(item) > effectiveArmorValue(best) ? item : best)
}

// Outer-to-inner order (Body Armor takes a hit before whatever's worn
// underneath it) - only matters for applyDamageToTarget's per-layer wear
// split below; the total reduction itself is order-independent, just a sum.
function equippedArmorLayers(actor) {
  return ['bodyArmor', 'underarmor'].map((slot) => bestArmorInSlot(actor, slot)).filter(Boolean)
}

function getEquippedArmorReduction(actor) {
  return equippedArmorLayers(actor).reduce((sum, item) => sum + effectiveArmorValue(item), 0)
}

// Fortitude's Toughness power (power-effects.js) - "Subtracts the user's
// Fortitude rating from incoming Superficial damage" for the rest of the
// scene it was activated in. Stored as a flag on the Toughness condition
// item rather than read live off the Fortitude discipline, since the rating
// is meant to be locked in at activation time, same as the real power.
// Superficial only, matching the power's own text - Aggravated damage is
// unaffected.
function getToughnessReduction(actor, damageType) {
  if (damageType !== 'superficial') return 0
  const condition = actor?.items.find((i) => isConditionNamed(i, 'Toughness'))
  return condition?.getFlag('vampiro-a-mascara-v5-ptbr', 'toughnessReduction') ?? 0
}

// Fortitude's Defy Bane power (power-effects.js) - a shared per-scene
// budget of Aggravated damage that converts to Superficial instead when
// sustained (corebook p.259: "not per wound or per attack"). Consumed (not
// just read) by applyDamageToTarget below, since using it up is a real
// write back onto the condition item, not a passive multiplier like
// Toughness.
function getDefyBaneBudget(actor) {
  const condition = actor?.items.find((i) => isConditionNamed(i, 'Defy Bane'))
  return condition?.getFlag('vampiro-a-mascara-v5-ptbr', 'defyBaneBudget') ?? 0
}

async function consumeDefyBaneBudget(actor, amount) {
  const condition = actor.items.find((i) => isConditionNamed(i, 'Defy Bane'))
  if (!condition) return
  const remaining = Math.max((condition.getFlag('vampiro-a-mascara-v5-ptbr', 'defyBaneBudget') ?? 0) - amount, 0)
  await condition.setFlag('vampiro-a-mascara-v5-ptbr', 'defyBaneBudget', remaining)
}

/**
 * Calculate armor conversion, Toughness, superficial halving and the health
 * track limit without writing to the actor. Shared by application and recap.
 */
export function computeDamageBreakdown(actor, amount, damageType, { reduceByArmor = false, armorPiercingAmmo = false, halveSuperficial = reduceByArmor } = {}) {
  const empty = { raw: amount, damageType, armor: 0, converted: 0, aggravatedRaw: 0, superficialRaw: 0, toughness: 0, superficialAfterToughness: 0, superficialHalved: 0, aggravated: 0, superficial: 0, total: 0 }
  if (!actor) return empty

  let armor = reduceByArmor ? getEquippedArmorReduction(actor) : 0
  if (armorPiercingAmmo) armor = Math.max(armor - 2, 0)
  const converted = damageType === 'aggravated' ? Math.min(armor, amount) : 0
  const aggravatedRaw = damageType === 'aggravated' ? amount - converted : 0
  const superficialRaw = damageType === 'aggravated' ? converted : amount
  const toughness = getToughnessReduction(actor, 'superficial')
  const superficialAfterToughness = superficialRaw > 0 && toughness > 0 ? Math.max(superficialRaw - toughness, 1) : superficialRaw
  const superficialHalved = halveSuperficial ? Math.ceil(superficialAfterToughness / 2) : superficialAfterToughness
  const health = actor.system.health
  const room = Math.max((health?.max ?? 0) - (health?.aggravated ?? 0) - (health?.superficial ?? 0), 0)
  const aggravated = Math.min(aggravatedRaw, room)
  const superficial = Math.min(superficialHalved, room - aggravated)
  return { raw: amount, damageType, armor, converted, aggravatedRaw, superficialRaw, toughness, superficialAfterToughness, superficialHalved, aggravated, superficial, total: aggravated + superficial }
}

export function computeAppliedDamage(actor, amount, damageType, options) {
  return computeDamageBreakdown(actor, amount, damageType, options).total
}

/**
 * Apply both damage types after armor conversion, Toughness, optional
 * superficial halving and the health track limit. Overflow is not handled.
 * Weapon attacks opt into armor and halving with reduceByArmor; callers can
 * also control halving explicitly with halveSuperficial.
 */
export async function applyDamageToTarget(token, amount, damageType, options = {}) {
  const actor = token.actor
  if (!actor) return 0

  // Defy Bane conversion happens BEFORE armor/room math, and splits this
  // call into up to two independent sub-calls (each running the full logic
  // below on its own, including its own room-clamp) - simplest correct way
  // to hand off part of a hit to a different damage type without teaching
  // the calculation about Defy Bane's separate budget. consumeDefyBaneBudget
  // writes the reduced budget BEFORE recursing,
  // so the second sub-call (still 'aggravated') sees the already-reduced
  // budget and won't convert again - safe from infinite recursion, and
  // correctly handles a hit bigger than the remaining budget.
  if (damageType === 'aggravated') {
    const budget = getDefyBaneBudget(actor)
    if (budget > 0) {
      const converted = Math.min(amount, budget)
      await consumeDefyBaneBudget(actor, converted)
      const remainingAggravated = amount - converted
      let total = 0
      if (converted > 0) total += await applyDamageToTarget(token, converted, 'superficial', options)
      if (remainingAggravated > 0) total += await applyDamageToTarget(token, remainingAggravated, 'aggravated', options)
      return total
    }
  }

  const breakdown = computeDamageBreakdown(actor, amount, damageType, options)

  // Wear tracking (repair.js's absorbArmorDamage) - each equipped layer
  // (Body Armor first, then whatever Underarmor is worn beneath it) takes
  // wear from the converted damage, distributed outermost layer first.
  const armorLayers = breakdown.converted > 0 ? equippedArmorLayers(actor) : []
  let remainingForWear = breakdown.converted
  for (const layer of armorLayers) {
    if (remainingForWear <= 0) break
    const layerAbsorbed = Math.min(effectiveArmorValue(layer), remainingForWear)
    if (layerAbsorbed > 0) await absorbArmorDamage(layer, layerAbsorbed)
    remainingForWear -= layerAbsorbed
  }

  if (breakdown.total <= 0) return 0

  const update = {}
  if (breakdown.aggravated > 0) update['system.health.aggravated'] = (actor.system.health?.aggravated ?? 0) + breakdown.aggravated
  if (breakdown.superficial > 0) update['system.health.superficial'] = (actor.system.health?.superficial ?? 0) + breakdown.superficial
  await actor.update(update)

  const parts = []
  if (breakdown.aggravated > 0) parts.push(`${breakdown.aggravated} de dano Agravado`)
  if (breakdown.superficial > 0) parts.push(`${breakdown.superficial} de dano Superficial`)
  ui.notifications.info(`${MODULE_ID} | ${actor.name} sofreu ${parts.join(' e ')}`)
  return breakdown.total
}

// Willpower counterpart to applyDamageToTarget above - simpler (no armor/
// Toughness reduction, Willpower has no equivalent), moved here from the
// now-removed social-conflict.js since discipline-resistance.js also needs
// it independently of that feature.
export async function applyWillpowerDamageToTarget(token, amount, damageType) {
  const actor = token.actor
  if (!actor) return

  const current = actor.system.willpower?.[damageType] ?? 0
  const max = actor.system.willpower?.max ?? 0
  const otherType = damageType === 'superficial' ? 'aggravated' : 'superficial'
  const otherCurrent = actor.system.willpower?.[otherType] ?? 0

  const room = Math.max(max - otherCurrent - current, 0)
  const applied = Math.min(amount, room)

  if (applied <= 0) return

  await actor.update({
    [`system.willpower.${damageType}`]: current + applied
  })

  ui.notifications.info(`${MODULE_ID} | ${actor.name} sofreu ${applied} de dano ${damageType} na Força de Vontade`)
}

function buildDamageButtons(successes) {
  const wrapper = document.createElement('div')
  wrapper.classList.add('vtm5e-automation-damage-row')
  wrapper.style.display = 'flex'
  wrapper.style.gap = '4px'
  wrapper.style.marginTop = '4px'

  const label = document.createElement('span')
  label.textContent = `Aplicar ${successes} de dano:`
  label.style.alignSelf = 'center'
  label.style.fontSize = '0.85em'
  wrapper.appendChild(label)

  for (const type of ['superficial', 'aggravated']) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = type === 'superficial' ? 'Superficial' : 'Agravado'
    button.dataset.damageType = type
    button.classList.add('vtm5e-automation-apply-damage')
    wrapper.appendChild(button)
  }

  return wrapper
}

function buildArmorEquippedSection(item) {
  const section = document.createElement('fieldset')
  section.classList.add('vtm5e-automation-magazine')

  const legend = document.createElement('legend')
  legend.textContent = 'Redução por Armadura (automação)'
  section.appendChild(legend)

  const hint = document.createElement('p')
  hint.classList.add('hint')
  hint.textContent = 'O equipamento é gerenciado pelo botão "Worn" na ficha do personagem. A armadura interna e a armadura corporal ocupam espaços separados e protegem ao mesmo tempo quando usadas juntas; dois itens não podem ocupar o mesmo espaço.'
  section.appendChild(hint)

  const slotStatus = document.createElement('p')
  slotStatus.classList.add('hint')
  const currentSlot = equippedSlotFor(item)
  slotStatus.textContent = currentSlot ? `Equipado: ${slotLabel('armor', currentSlot)}.` : 'Não equipado.'
  section.appendChild(slotStatus)

  // Durability status (repair.js) - read-only here, same info the wrench
  // button's tooltip shows on the actor sheet, surfaced on the item sheet
  // too since that's where a GM/player is most likely already looking to
  // check on a specific piece of armor.
  const absorbed = armorDamageAbsorbedFor(item)
  const threshold = armorThresholdFor(item)
  const status = document.createElement('p')
  status.classList.add('hint')
  if (isUnrepairable(item) && isBroken(item)) {
    status.textContent = 'Quebrada sem possibilidade de conserto; não oferece mais proteção.'
  } else if (isBroken(item)) {
    status.textContent = `Quebrada; não oferece proteção até ser consertada (${repairAttemptsFor(item)}/${MAX_REPAIR_ATTEMPTS} tentativas de conserto usadas).`
  } else {
    status.textContent = `Durabilidade: ${absorbed}/${threshold} de dano absorvido antes de quebrar.${isWorn(item) ? ' Desgastada (-1 no Valor de Armadura efetivo, por excesso de consertos).' : ''}`
  }
  section.appendChild(status)

  return section
}

export function registerDamageApplication() {
  Hooks.on('renderArmorItemSheet', (app, html) => {
    const item = app.item
    if (!item) return
    if (html.querySelector('.vtm5e-automation-magazine')) return

    html.appendChild(buildArmorEquippedSection(item))
  })

  // Auto-apply damage on genuinely NEW messages only. createChatMessage
  // fires exactly once, at real creation time - unlike renderChatMessageHTML,
  // which also fires when Foundry replays historical messages on page load,
  // which would otherwise silently re-apply old damage on every reload.
  Hooks.on('createChatMessage', async (message) => {
    const roll = message.rolls?.[0]
    if (!roll || !roll.systemRoll) return

    const weapon = findWeaponForRoll(message, roll)
    if (!weapon) return

    const successes = roll.total
    if (successes <= 0) return

    // createChatMessage fires on every connected client when the roll syncs.
    // message.isOwner is true for BOTH the roll's author AND every GM (GMs
    // own everything), so with a player attacking and a GM also connected
    // this used to run on both clients - same double-fire class of bug
    // fixed in weapon-tags.js's ammo-consumption hook. Author-only, matching
    // that fix and opposing-roll-trigger.js's existing guard.
    if (message.author?.id !== game.user.id) return

    // Hollow-Point adds a flat +1 to whatever the roll already did - a
    // property of whatever's currently chambered (weapon-tags.js's
    // loadedAmmoType flag), not the roll itself, so it's read here rather
    // than baked into the attack roll. Armor-Piercing (-2 Armor Value, RAW,
    // Second Inquisition p.72) is checked the same way further down, when
    // armor conversion is calculated.
    const ammoType = getLoadedAmmoType(weapon)
    const amount = successes + getWeaponDamageValue(weapon) + getAmmoDamageBonus(ammoType)
    const isArmorPiercingAmmo = ammoType === 'armorPiercing'

    const targets = Array.from(game.user.targets)

    for (const [index, token] of targets.entries()) {
      // opposing-roll-trigger.js only ever acts on the FIRST target (it can
      // only run one weapon-defense flow per attack) and owns damage
      // application entirely for it - applying damage directly here too
      // would double up (once now off raw successes, again once the
      // contest resolves off the actual margin). Any additional
      // simultaneous targets beyond the first were never covered by the
      // opposed flow, so they're handled directly here regardless.
      if (index === 0 && token.actor && getStepSetting('opposingRoll', token.actor) !== 'off') continue

      // Looked up per-target - a mix of NPC and player targets can land on
      // different actual behavior.
      const mode = token.actor ? getStepSetting('damageApplication', token.actor) : 'prompt'
      if (mode !== 'auto') continue

      const tags = weapon.getFlag(MODULE_ID, 'weaponTags')
      // Firearms deal Aggravated to non-vampires, except Tasers (SI p. 71).
      const severity = ((tags?.sharp || (tags?.firearm && !tags?.taser)) && token.actor?.system?.gamesystem !== 'vampire')
        ? 'aggravated'
        : 'superficial'
      // Relayed (performPrivilegedDamage) rather than a direct
      // applyDamageToTarget call - a player attacking a GM-only NPC target
      // directly (opposingRoll set to 'off' for it) has never had
      // permission to write to that actor's health track, same root cause
      // as the opposed-roll flow's equivalent fix in opposing-roll-trigger.js.
      await performPrivilegedDamage(token, amount, severity, { reduceByArmor: true, armorPiercingAmmo: isArmorPiercingAmmo })
    }
  })

  // Button UI for prompt mode - safe to re-run on every render/replay since
  // it only displays inert buttons, doesn't take any action on its own.
  Hooks.on('renderChatMessageHTML', (message, html) => {
    const roll = message.rolls?.[0]
    if (!roll || !roll.systemRoll) return

    const weapon = findWeaponForRoll(message, roll)
    if (!weapon) return

    const successes = roll.total
    if (successes <= 0) return

    const ammoType = getLoadedAmmoType(weapon)
    const amount = successes + getWeaponDamageValue(weapon) + getAmmoDamageBonus(ammoType)
    const isArmorPiercingAmmo = ammoType === 'armorPiercing'

    // Same per-target deferral/mode logic as the createChatMessage handler
    // above - only show buttons if at least one target actually needs one
    // (not deferred to opposing-roll-trigger.js, not already auto-applied).
    // With nothing targeted at all there's no per-target info to go on, so
    // fall back to showing the buttons (matches the old unconditional
    // behavior for that case).
    const targets = Array.from(game.user.targets)
    const needsPrompt = targets.length === 0 || targets.some((token, index) => {
      if (index === 0 && token.actor && getStepSetting('opposingRoll', token.actor) !== 'off') return false
      const mode = token.actor ? getStepSetting('damageApplication', token.actor) : 'prompt'
      return mode !== 'auto'
    })
    if (!needsPrompt) return

    const buttonRow = buildDamageButtons(amount)
    html.appendChild(buttonRow)

    buttonRow.querySelectorAll('.vtm5e-automation-apply-damage').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const damageType = event.currentTarget.dataset.damageType
        const clickTargets = Array.from(game.user.targets)

        if (clickTargets.length === 0) {
          ui.notifications.warn(`${MODULE_ID} | Nenhum alvo selecionado. Selecione um token primeiro.`)
          return
        }

        for (const token of clickTargets) {
          // Same relay as the auto-apply hook above - whoever clicks this
          // button (a player) may not have permission over the target
          // (an NPC).
          await performPrivilegedDamage(token, amount, damageType, { reduceByArmor: true, armorPiercingAmmo: isArmorPiercingAmmo })
        }
      })
    })
  })
}
