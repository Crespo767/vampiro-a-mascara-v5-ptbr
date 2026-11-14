/**
 * Passive/free/Rouse-gated Discipline powers whose real effect isn't "roll
 * dice" - wod5e's own _rollItem is unconditional though (system/actor/
 * scripts/item-roll.js), so any power with an empty dicepool still forces a
 * 0-dice roll dialog that always reads as a fail. rollPower is the single
 * entry point BOTH the actor sheet (via bindPowerRollInterception below)
 * and the Argon HUD's powers-panel.js call instead of wod5e's native click
 * handler - known powers get their real effect applied here with no roll;
 * everything else falls through to the normal _rollItem roll, untouched.
 *
 * Powers covered (corebook page refs from the actual text, not guessed):
 * - Resilience (p.258, Fortitude 1), Unswayable Mind (p.258, Fortitude 1):
 *   passive, kept in sync with current Fortitude automatically.
 * - Toughness (p.259, Fortitude 2), Defy Bane (p.259, Fortitude 3), Prowess
 *   (p.264, Potence 2): Rouse-gated, click fires a real Rouse Check then
 *   grants a scene-long condition once it resolves.
 * - Daunt (p.267, Presence 1), Eyes of the Beast (p.269, Protean 1): Free,
 *   simple on/off toggles - click again (or remove the token icon) to end.
 *
 * Deliberately NOT automated (documented here rather than silently
 * skipped): Enduring Beasts (grants Health to an ANIMAL companion - this
 * project has no animal-companion actor tracking), Lethal Body/the unarmed-
 * damage half of Prowess (both modify unarmed attacks, which don't exist
 * as a rollable concept yet - revisit once the HUD gets unarmed combat
 * buttons), Unfettered Heart (modifies the Difficulty of a "roll to stake"
 * that doesn't exist as an automated roll anywhere in this codebase - wood/
 * stake ammo already applies its own narrative Torpor-risk condition via
 * opposing-roll-trigger.js, GM adjudicates staking Difficulty by hand).
 */
import { applyStatusCondition, removeStatusCondition, hasReconcileAuthority, isConditionNamed } from './condition-application.js'
import { WEAPON_ROLL_ACTOR_SHEET_HOOKS } from './weapon-tags.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'
const ROUSE_TITLE_PREFIX = 'WOD5E.VTM.RousingBlood'
const ALWAYS_ON = { check: 'always', path: '', value: '' }

function fortitudeRating(actor) {
  return actor?.system?.disciplines?.fortitude?.value ?? 0
}

function potenceRating(actor) {
  return actor?.system?.disciplines?.potence?.value ?? 0
}

function presenceRating(actor) {
  return actor?.system?.disciplines?.presence?.value ?? 0
}

// --- Passive powers: always-on, scale with a Discipline rating, no click-
// time roll or cost. Synced whenever that Discipline changes or the power
// is granted/removed (see registerPowerEffects), so they never go stale.
const PASSIVE_POWERS = {
  resilience: {
    conditionName: 'Resilience',
    rating: fortitudeRating,
    note: (rating) => `<p><em>Gerenciado automaticamente por vtm5e-automation. Adiciona seu valor atual de Fortitude (${rating}) à Vitalidade máxima. Recalculado automaticamente se Fortitude mudar.</em></p>`,
    build: (rating) => ({ effects: [{ keys: ['system.health.max'], intValue: rating }] })
  },
  'unswayable mind': {
    conditionName: 'Unswayable Mind',
    rating: fortitudeRating,
    note: (rating) => `<p><em>Gerenciado automaticamente por vtm5e-automation. Adiciona seu valor atual de Fortitude (${rating}) como dados extras para resistir a coerção, intimidação, sedução ou influência mental sobrenatural (Dominação, Presença). O efeito é aproximado como bônus em testes de Autocontrole e Determinação, a parada de resistência mais comum no livro básico. As paradas de resistência a Disciplinas variam conforme o poder, então nem todas as combinações são cobertas. Recalculado automaticamente se Fortitude mudar.</em></p>`,
    build: (rating) => ({
      bonuses: [{ source: 'Mente Inescrutável', value: String(rating), paths: ['attributes.composure', 'attributes.resolve'], displayWhenInactive: false, activeWhen: ALWAYS_ON }]
    })
  }
}

async function syncPassivePower(actor, key) {
  const def = PASSIVE_POWERS[key]
  const powerItem = actor.items.find((i) => i.type === 'power' && enName(i).toLowerCase() === key)
  const rating = powerItem ? def.rating(actor) : 0

  if (!powerItem || rating <= 0) {
    await removeStatusCondition(actor, def.conditionName)
    return
  }

  await applyStatusCondition(actor, {
    name: def.conditionName,
    img: powerItem.img,
    note: def.note(rating),
    ...def.build(rating)
  })
}

async function handlePassivePower(actor, item) {
  await syncPassivePower(actor, enName(item).toLowerCase())
  ui.notifications.info(`${item.name} é passivo e já foi aplicado automaticamente.`)
}

// --- Rouse-gated powers: click fires a real Rouse Check (via wod5e's own
// _onRouseCheck, called directly rather than through _rollItem - rouse.js
// falls back to "cost 1" for any item.system.cost <= 0, correct no matter
// what these items' own stored cost is, and skips the buggy empty-dicepool
// roll _rollItem would otherwise force first). The resulting condition is
// granted once the Rouse roll's chat message actually appears (see
// registerPowerEffects' createChatMessage hook) - Rouse rolls are fire-and-
// forget from the caller's side, there's no promise to await completion on.
const ROUSE_GATED_POWERS = {
  toughness: {
    conditionName: 'Toughness',
    rating: fortitudeRating,
    zeroRatingWarning: 'nenhum ponto em Fortitude; Tenacidade reduziria o dano em 0',
    grant: (actor, img, rating) => applyStatusCondition(actor, {
      name: 'Toughness',
      img,
      note: `<p><em>Gerenciado automaticamente por vtm5e-automation. Reduz o dano Superficial à Vitalidade recebido pelo seu valor de Fortitude (${rating}) até o fim da cena (pelas regras, o dano de um ataque não pode ser reduzido abaixo de 1). Clique com o botão direito no ícone do token ou exclua o item para encerrar antes.</em></p>`,
      flags: { toughnessReduction: rating }
    }),
    successNote: (rating) => `dano Superficial recebido reduzido em ${rating} nesta cena`
  },
  'defy bane': {
    conditionName: 'Defy Bane',
    rating: fortitudeRating,
    zeroRatingWarning: 'nenhum ponto em Fortitude; Desafio à Perdição converteria 0 de dano',
    grant: (actor, img, rating) => applyStatusCondition(actor, {
      name: 'Defy Bane',
      img,
      note: `<p><em>Gerenciado automaticamente por vtm5e-automation. Até ${rating} pontos de dano Agravado à Vitalidade recebidos são convertidos em Superficial até o fim da cena; esse limite vale para a cena inteira. Pelas regras, esse dano convertido não pode ser curado até o fim da cena. Controle isso manualmente. Clique com o botão direito no ícone do token ou exclua o item para encerrar antes.</em></p>`,
      flags: { defyBaneBudget: rating }
    }),
    successNote: (rating) => `até ${rating} pontos de dano Agravado serão convertidos em Superficial nesta cena`
  },
  prowess: {
    conditionName: 'Prowess',
    rating: potenceRating,
    zeroRatingWarning: 'nenhum ponto em Potência; Poderio acrescentaria 0 dados',
    grant: (actor, img, rating) => applyStatusCondition(actor, {
      name: 'Prowess',
      img,
      note: `<p><em>Gerenciado automaticamente por vtm5e-automation. Adiciona seu valor de Potência (${rating}) a testes baseados em Força até o fim da cena. O efeito deste poder sobre dano desarmado ainda não é automatizado. Clique com o botão direito no ícone do token ou exclua o item para encerrar antes.</em></p>`,
      bonuses: [{ source: 'Poderio', value: String(rating), paths: ['attributes.strength'], displayWhenInactive: false, activeWhen: ALWAYS_ON }]
    }),
    successNote: (rating) => `+${rating} dados em testes baseados em Força nesta cena`
  }
}

const pendingRousedPower = new Map()

async function handleRouseGatedPower(actor, item) {
  const key = enName(item).toLowerCase()
  const def = ROUSE_GATED_POWERS[key]
  const rating = def.rating(actor)
  if (rating <= 0) ui.notifications.warn(`${MODULE_ID} | ${actor.name} possui ${def.zeroRatingWarning}.`)
  pendingRousedPower.set(actor.id, { key, name: item.name, img: item.img, rating })

  const { _onRouseCheck } = await import('/systems/wod5e/system/actor/vtm/scripts/rouse.js')
  await _onRouseCheck(actor, item)
}

async function grantRousedPower(actor, pending) {
  const def = ROUSE_GATED_POWERS[pending.key]
  if (pending.rating <= 0) return
  await def.grant(actor, pending.img, pending.rating)
  ui.notifications.info(`${MODULE_ID} | ${pending.name} ativo em ${actor.name}: ${def.successNote(pending.rating)}.`)
}

// --- Free, simple toggle powers: click again (or remove the token icon) to
// end early. No roll, no cost - just flips a condition on/off.
const TOGGLE_POWERS = {
  daunt: {
    conditionName: 'Daunt',
    rating: presenceRating,
    note: (rating) => `<p><em>Gerenciado automaticamente por vtm5e-automation. Enquanto ativo, adiciona seu valor de Presença (${rating}) a testes de Intimidação. O número de dados é fixado na ativação; reative se Presença mudar. Pelas regras, quem atacar você também deve passar antes em um teste de Determinação + Autocontrole (Dificuldade 2), e Fascínio e Amedrontar não podem ser usados juntos. Controle ambos manualmente. Clique novamente em Amedrontar ou com o botão direito no ícone do token para encerrar.</em></p>`,
    build: (rating) => [{ source: 'Amedrontar', value: String(rating), paths: ['skills.intimidation'], displayWhenInactive: false, activeWhen: ALWAYS_ON }]
  },
  'eyes of the beast': {
    conditionName: 'Eyes of the Beast',
    rating: () => 2,
    note: () => '<p><em>Gerenciado automaticamente por vtm5e-automation. Concede +2 dados em testes de Intimidação enquanto ativo. Essa aplicação simplifica a regra, que vale apenas contra mortais; use seu julgamento contra outros alvos. Pelas regras, também permite enxergar no escuro e ignorar penalidades de visão pela escuridão. Esse efeito não é automatizado; resolva-o na narrativa. Clique novamente ou com o botão direito no ícone do token para encerrar.</em></p>',
    build: () => [{ source: 'Olhos da Besta', value: '2', paths: ['skills.intimidation'], displayWhenInactive: false, activeWhen: ALWAYS_ON }]
  }
}

async function handleTogglePower(actor, item) {
  const key = enName(item).toLowerCase()
  const def = TOGGLE_POWERS[key]
  const active = actor.items.some((i) => isConditionNamed(i, def.conditionName))

  if (active) {
    await removeStatusCondition(actor, def.conditionName)
    ui.notifications.info(`${MODULE_ID} | ${item.name} desativado em ${actor.name}.`)
    return
  }

  const rating = def.rating(actor)
  await applyStatusCondition(actor, {
    name: def.conditionName,
    img: item.img,
    note: def.note(rating),
    bonuses: def.build(rating)
  })
  ui.notifications.info(`${MODULE_ID} | ${item.name} ativo em ${actor.name}.`)
}

const INTERCEPTED_POWERS = {
  resilience: handlePassivePower,
  'unswayable mind': handlePassivePower,
  toughness: handleRouseGatedPower,
  'defy bane': handleRouseGatedPower,
  prowess: handleRouseGatedPower,
  daunt: handleTogglePower,
  'eyes of the beast': handleTogglePower
}

/**
 * Public entry point - see file header. Falls through to wod5e's real
 * _rollItem for every power this file doesn't specifically know about, so
 * normal Discipline rolls are completely unaffected.
 */
export async function rollPower(actor, item) {
  if (!actor || !item) return

  const handler = item.type === 'power' ? INTERCEPTED_POWERS[enName(item).toLowerCase()] : null
  if (handler) {
    await handler(actor, item)
    return
  }

  const { _rollItem } = await import('/systems/wod5e/system/actor/scripts/item-roll.js')
  await _rollItem(actor, item)
}

function bindPowerRollInterception(app, html) {
  const actor = app.actor
  if (!actor) return

  const rollableItems = html.querySelectorAll?.('.rollable-item[data-action="rollItem"]') ?? []
  rollableItems.forEach((element) => {
    const itemId = element.closest('[data-item-id]')?.dataset.itemId
    const item = itemId ? actor.items.get(itemId) : null
    if (!item || item.type !== 'power') return
    if (!INTERCEPTED_POWERS[enName(item).toLowerCase()]) return

    if (element.dataset.vtm5eAutomationPowerBound) return
    element.dataset.vtm5eAutomationPowerBound = 'true'

    // Capture phase - must run before wod5e's own delegated rollItem
    // handler, same reasoning as weapon-tags.js's bindWeaponRollInterception.
    element.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      rollPower(actor, item)
    }, true)
  })
}

export function registerPowerEffects() {
  for (const hookName of WEAPON_ROLL_ACTOR_SHEET_HOOKS) {
    Hooks.on(hookName, bindPowerRollInterception)
  }

  // Keeps every PASSIVE_POWERS condition correct as its Discipline changes
  // (buy-up, Discipline granted/removed) - catches both the rating changing
  // and the power item being added/removed.
  Hooks.on('updateActor', async (actor, changes) => {
    if (actor.system?.gamesystem !== 'vampire' || !hasReconcileAuthority(actor)) return
    if (!foundry.utils.hasProperty(changes, 'system.disciplines')) return
    for (const key of Object.keys(PASSIVE_POWERS)) await syncPassivePower(actor, key)
  })
  Hooks.on('createItem', async (item) => {
    const actor = item.parent
    if (!(actor instanceof Actor) || !hasReconcileAuthority(actor) || item.type !== 'power') return
    const key = enName(item).toLowerCase()
    if (PASSIVE_POWERS[key]) await syncPassivePower(actor, key)
  })
  Hooks.on('deleteItem', async (item) => {
    const actor = item.parent
    if (!(actor instanceof Actor) || !hasReconcileAuthority(actor) || item.type !== 'power') return
    const key = enName(item).toLowerCase()
    if (PASSIVE_POWERS[key]) await syncPassivePower(actor, key)
  })

  // Resolves handleRouseGatedPower's pending Rouse Check - see the comment
  // above pendingRousedPower. Matched on wod5e's own Rouse Check title
  // format ("Rousing the Blood - <item name>"), same title-matching
  // convention bestial-failure.js already uses for DODGE/weapon markers.
  Hooks.on('createChatMessage', async (message) => {
    if (message.author?.id !== game.user.id) return
    const roll = message.rolls?.[0]
    if (!roll) return
    const actor = message.speakerActor
    const pending = actor ? pendingRousedPower.get(actor.id) : null
    if (!pending) return
    const expectedTitle = `${game.i18n.localize(ROUSE_TITLE_PREFIX)} - ${pending.name}`
    if (roll.options?.title !== expectedTitle) return
    pendingRousedPower.delete(actor.id)
    await grantRousedPower(actor, pending)
  })
}

// [vtm5e-ptbr] nome original em ingles de um item traduzido pelo Babele (ou o nome atual, se nao houver)
function enName (doc) {
  return doc?.flags?.babele?.originalName ?? doc?.originalName ?? doc?.name
}
