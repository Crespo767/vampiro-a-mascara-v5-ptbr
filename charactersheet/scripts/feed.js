// "Feed" button (header quick-rolls, next to Rouse/Frenzy): rolls the
// character's Predator Type dicepool (same dice-computation as wod5e's
// own _rollItem in system/actor/scripts/item-roll.js - duplicated rather
// than reused because _rollItem's own callback is hardcoded to the Rouse-
// check flow for cost>0 items and doesn't accept an external one), then
// on a successful roll asks what kind of vessel it was (Human/Animal/
// Kindred, 2026-07-28) and branches into the matching Feeding rules
// (corebook p.212-213) before rolling the V5 corebook's own Random
// Temperament / Random Resonance tables (p.229) and applying the result -
// embedding a matching Resonance Item from vampiro-a-mascara-v5-ptbr.disciplines
// (see configure-resonances-compendium.js) on Intense/Acute, or just
// narrating Fleeting/none in chat.
//
// Deliberately does NOT try to automate which specific feeding method was
// used (sip/full drink/kill/animal size/etc.) beyond letting the player
// pick the resulting Hunger loss from the corebook's Feeding Table - the
// "Harmful drink" tier (Aggravated damage to the victim, corebook p.212)
// is left out entirely since it targets a vessel this module has no
// tracking for; narrating HOW the feed happened, and any Masquerade/
// witness complications on a failed roll, stays a table/Storyteller call,
// not something this button decides. Likewise Dyscrasia effects on an
// Acute result are flagged, not assigned - the corebook is explicit that
// these should be curated per-vessel by the Storyteller (p.229), not
// randomly generated.

import { getActiveModifiers } from '/systems/wod5e/system/scripts/rolls/situational-modifiers.js'

// Alternate pools described in the Player's Guide predator entries.
const PREDATOR_POOL_ALTERNATIVES = {
  montero: { defaultLabel: 'Inteligência + Furtividade', paths: ['attributes.resolve', 'skills.stealth'], label: 'Determinação + Furtividade' },
  extortionist: { defaultLabel: 'Manipulação + Intimidação', paths: ['attributes.strength', 'skills.intimidation'], label: 'Força + Intimidação' },
  trapdoor: { defaultLabel: 'Carisma + Furtividade', paths: ['attributes.dexterity', 'skills.stealth'], label: 'Destreza + Furtividade' },
  'grim reaper': { defaultLabel: 'Inteligência + Percepção', paths: ['attributes.intelligence', 'skills.medicine'], label: 'Inteligência + Medicina' },
  pursuer: { defaultLabel: 'Inteligência + Investigação', paths: ['attributes.stamina', 'skills.stealth'], label: 'Vigor + Furtividade' },
  graverobber: { defaultLabel: 'Determinação + Medicina', paths: ['attributes.manipulation', 'skills.insight'], label: 'Manipulação + Intuição' }
}
const PREDATOR_POOL_ALIASES = new Map([
  ['extorsionista', 'extortionist'], ['alçapão', 'trapdoor'], ['ceifador', 'grim reaper'],
  ['perseguidor', 'pursuer'], ['ladrão de túmulos', 'graverobber']
])

async function choosePredatorPool (predator) {
  const dicepool = predator.system.dicepool ?? {}
  const paths = Object.values(dicepool).map(entry => entry?.path).filter(Boolean)
  const name = predator.flags?.babele?.originalName || predator.originalName || predator.name
  const key = name.trim().toLocaleLowerCase('pt-BR')
  const alternate = PREDATOR_POOL_ALTERNATIVES[PREDATOR_POOL_ALIASES.get(key) ?? key]
  if (!paths.length || !alternate?.paths) return paths

  return foundry.applications.api.DialogV2.wait({
    window: { title: `Parada de Predador — ${predator.name}` },
    content: '<p>Escolha a parada de acordo com a abordagem da caça.</p>',
    rejectClose: false,
    buttons: [
      { action: 'defaultPool', label: alternate.defaultLabel, default: true, callback: () => paths },
      { action: 'alternatePool', label: alternate.label, callback: () => alternate.paths },
      { action: 'cancel', label: 'Cancelar', callback: () => null }
    ]
  })
}

// [vtm5e-ptbr] As Ressonâncias não existem no compêndio de Disciplinas deste
// módulo (os itens do VtM5e Tools original se perderam na junção), então
// o item é montado aqui. Chave = nome interno em inglês (RESONANCE_TABLE).
// Termos e tabela: livro básico, p. 226-229.
const RESONANCE_ITEMS = {
  Choleric: {
    label: 'Colérica',
    paths: ['celerity', 'potence'],
    description: '<p><b>Humor:</b> Colérico (elemento Fogo; hormônio: adrenalina)</p><p><b>Emoções e condições:</b> Irado, violento, provocador, passional, invejoso</p><p><b>Disciplinas:</b> Celeridade, Potência</p><p><b>Efêmero:</b> só sabor, sem efeito mecânico (ainda justifica comprar pontos nessas Disciplinas).</p><p><b>Intenso:</b> +1 dado nas paradas que envolvam essas Disciplinas, até a próxima vez que o vampiro beber sangue ou até a Fome chegar a 5.</p><p><b>Agudo (Discrasia):</b> o mesmo +1 dado do Intenso, mais um efeito de Discrasia que o Narrador define de acordo com a bolsa. Mesma duração.</p>'
  },
  Melancholic: {
    label: 'Melancólica',
    paths: ['fortitude', 'obfuscate'],
    description: '<p><b>Humor:</b> Melancólico (elemento Terra; hormônio: tireoide)</p><p><b>Emoções e condições:</b> Triste, assustado, intelectual, deprimido, equilibrado</p><p><b>Disciplinas:</b> Fortitude, Ofuscação</p><p><b>Efêmero:</b> só sabor, sem efeito mecânico (ainda justifica comprar pontos nessas Disciplinas).</p><p><b>Intenso:</b> +1 dado nas paradas que envolvam essas Disciplinas, até a próxima vez que o vampiro beber sangue ou até a Fome chegar a 5.</p><p><b>Agudo (Discrasia):</b> o mesmo +1 dado do Intenso, mais um efeito de Discrasia que o Narrador define de acordo com a bolsa. Mesma duração.</p>'
  },
  Phlegmatic: {
    label: 'Fleumática',
    paths: ['auspex', 'dominate'],
    description: '<p><b>Humor:</b> Fleumático (elemento Água; hormônio: pituitária)</p><p><b>Emoções e condições:</b> Preguiçoso, apático, calmo, controlador, sentimental</p><p><b>Disciplinas:</b> Auspícios, Dominação</p><p><b>Efêmero:</b> só sabor, sem efeito mecânico (ainda justifica comprar pontos nessas Disciplinas).</p><p><b>Intenso:</b> +1 dado nas paradas que envolvam essas Disciplinas, até a próxima vez que o vampiro beber sangue ou até a Fome chegar a 5.</p><p><b>Agudo (Discrasia):</b> o mesmo +1 dado do Intenso, mais um efeito de Discrasia que o Narrador define de acordo com a bolsa. Mesma duração.</p>'
  },
  Sanguine: {
    label: 'Sanguínea',
    paths: ['sorcery', 'presence'],
    description: '<p><b>Humor:</b> Sanguíneo (elemento Ar; hormônio: testosterona/estrogênio)</p><p><b>Emoções e condições:</b> Excitado, feliz, viciado, ativo, volúvel, entusiasmado</p><p><b>Disciplinas:</b> Feitiçaria de Sangue, Presença</p><p><b>Efêmero:</b> só sabor, sem efeito mecânico (ainda justifica comprar pontos nessas Disciplinas).</p><p><b>Intenso:</b> +1 dado nas paradas que envolvam essas Disciplinas, até a próxima vez que o vampiro beber sangue ou até a Fome chegar a 5.</p><p><b>Agudo (Discrasia):</b> o mesmo +1 dado do Intenso, mais um efeito de Discrasia que o Narrador define de acordo com a bolsa. Mesma duração.</p>'
  },
  'Animal Blood': {
    label: 'Animal',
    paths: ['animalism', 'protean'],
    description: '<p><b>Humor:</b> não se aplica (bolsa não humana)</p><p><b>Emoções e condições:</b> Ameaçado ou ameaçando: Colérico. No cio: Sanguíneo. Fora isso, em geral Melancólico ou Fleumático (a critério do Narrador).</p><p><b>Disciplinas:</b> Animalismo, Proteanismo</p><p><b>Efêmero:</b> só sabor, sem efeito mecânico (ainda justifica comprar pontos nessas Disciplinas).</p><p><b>Intenso:</b> +1 dado nas paradas que envolvam essas Disciplinas, até a próxima vez que o vampiro beber sangue ou até a Fome chegar a 5.</p><p><b>Agudo (Discrasia):</b> o mesmo +1 dado do Intenso, mais um efeito de Discrasia que o Narrador define de acordo com a bolsa. Mesma duração.</p><p><em>Sangue animal nunca tem Discrasia e, para vampiros com Potência do Sangue acima de 2, não sacia Fome. É mais intenso logo depois de o animal matar ou durante o acasalamento.</em></p>'
  }
}

function resonanceLabel (name) {
  return RESONANCE_ITEMS[name]?.label ?? name
}

const RESONANCE_TABLE = [
  { min: 1, max: 3, name: 'Phlegmatic' },
  { min: 4, max: 6, name: 'Melancholic' },
  { min: 7, max: 8, name: 'Choleric' },
  { min: 9, max: 10, name: 'Sanguine' }
]

function d10Result (roll) {
  return roll.total === 10 ? 10 : roll.total
}

function pickFromTable (table, rollValue) {
  return table.find((row) => rollValue >= row.min && rollValue <= row.max)
}

async function rollTemperament () {
  const roll = await new Roll('1d10').evaluate()
  const value = d10Result(roll)

  if (value <= 5) return { temperament: 'none', roll }
  if (value <= 8) return { temperament: 'fleeting', roll }

  // 9-10: Intense, potentially Acute - roll again
  const secondRoll = await new Roll('1d10').evaluate()
  const secondValue = d10Result(secondRoll)
  const temperament = secondValue >= 9 ? 'acute' : 'intense'

  return { temperament, roll, secondRoll }
}

async function rollResonanceType () {
  const roll = await new Roll('1d10').evaluate()
  const value = d10Result(roll)
  const row = pickFromTable(RESONANCE_TABLE, value)

  return { name: row.name, roll }
}

async function clearExistingResonance (actor, keepId) {
  const existing = actor.items.filter(item => item.type === 'resonance' && item.id !== keepId)
  if (existing.length) await actor.deleteEmbeddedDocuments('Item', existing.map(item => item.id))
}

const RESONANCE_STRENGTHS = { fleeting: 'Efêmera', intense: 'Intensa', acute: 'Aguda' }
const RESONANCE_MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

export function registerResonanceExpiry () {
  Hooks.on('updateActor', async (actor, changes, _options, userId) => {
    if (userId !== game.user.id || actor.type !== 'vampire') return
    if (!Object.hasOwn(changes, 'system.hunger.value') && !foundry.utils.hasProperty(changes, 'system.hunger.value')) return
    const hunger = actor.system.hunger
    if (!hunger || hunger.value < hunger.max) return

    const expired = actor.items.filter(item => {
      if (item.type !== 'resonance') return false
      const flags = item.flags?.[RESONANCE_MODULE_ID]
      return flags?.resonanceKey && flags.resonanceStrength !== 'fleeting'
    })
    if (expired.length) await actor.deleteEmbeddedDocuments('Item', expired.map(item => item.id))
  })
}

async function applyResonance (actor, resonanceName, strength) {
  const def = RESONANCE_ITEMS[resonanceName]
  if (!def) {
    ui.notifications.error(`Ressonância desconhecida: "${resonanceName}".`)
    return null
  }

  const strengthLabel = RESONANCE_STRENGTHS[strength]
  let description = def.description
  if (strength === 'acute') {
    description += '<p><b>Discrasia:</b> esta bolsa tinha uma Discrasia além do bônus da Ressonância aguda; pergunte ao Narrador qual é o efeito.</p>'
  }

  const itemData = {
    name: `Ressonância ${def.label} (${strengthLabel})`,
    type: 'resonance',
    img: 'systems/wod5e/assets/icons/items/discipline.png',
    system: {
      description,
      bonuses: strength === 'fleeting' ? [] : [{
        source: `Ressonância ${def.label}`,
        value: 1,
        paths: def.paths,
        unless: [],
        displayWhenInactive: true,
        activeWhen: { check: 'always' }
      }],
      source: { book: 'V5 Core Rulebook', page: '226-229' }
    },
    flags: { [RESONANCE_MODULE_ID]: { resonanceKey: resonanceName, resonanceStrength: strength } }
  }

  const [created] = await actor.createEmbeddedDocuments('Item', [itemData])
  if (created) await clearExistingResonance(actor, created.id)
  return created
}

export async function onEditResonance (_event, target) {
  if (!this.isEditable || target.disabled) return
  const actor = this.actor
  const current = actor.items.find(item => item.type === 'resonance')
  const flags = current?.flags?.[RESONANCE_MODULE_ID]
  const currentStrength = flags?.resonanceStrength ?? (current?.name?.endsWith(' (Aguda)') ? 'acute' : 'intense')
  const choices = Object.entries(RESONANCE_ITEMS).map(([key, item]) =>
    `<option value="${key}"${flags?.resonanceKey === key ? ' selected' : ''}>${item.label}</option>`
  ).join('')
  const strengths = Object.entries(RESONANCE_STRENGTHS).map(([key, label]) =>
    `<option value="${key}"${currentStrength === key ? ' selected' : ''}>${label}</option>`
  ).join('')

  target.disabled = true
  try {
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: 'Ressonância do Sangue' },
      content: `<div class="form-group"><label for="resonanceType">Ressonância</label>
        <select id="resonanceType" name="type">
          <option value="" disabled${flags?.resonanceKey ? '' : ' selected'}>Escolha uma Ressonância</option><option value="none">Nenhuma</option>${choices}
        </select></div>
        <div class="form-group"><label for="resonanceStrength">Intensidade</label>
        <select id="resonanceStrength" name="strength">${strengths}</select></div>`,
      rejectClose: false,
      ok: {
        label: 'Salvar',
        callback: (_event, button) => ({
          type: button.form.elements.type.value,
          strength: button.form.elements.strength.value
        })
      }
    })
    if (!result || !this.isEditable) return
    if (result.type === 'none') {
      await clearExistingResonance(actor)
      return
    }
    if (!Object.hasOwn(RESONANCE_ITEMS, result.type) || !Object.hasOwn(RESONANCE_STRENGTHS, result.strength)) return
    if (result.type === 'Animal Blood' && result.strength === 'acute') {
      ui.notifications.warn('Sangue animal não tem Ressonância aguda. Escolha Efêmera ou Intensa.')
      return
    }
    const hunger = actor.system.hunger
    if (result.strength !== 'fleeting' && hunger && hunger.value >= hunger.max) {
      ui.notifications.warn('Ressonâncias intensas e agudas expiram ao atingir a Fome máxima.')
      return
    }
    await applyResonance(actor, result.type, result.strength)
  } finally {
    target.disabled = false
  }
}

function buildFeedResultHTML ({ title = 'Resultado da Alimentação', hungerLabel, hungerAmount, hungerBefore, hungerAfter, temperamentResult, resonanceResult, extraRows = [], skipResonance = false }) {
  const rows = [
    `<p class="vtm5e-cs-feed-title"><b>${title}</b></p>`,
    `<p>${hungerLabel}: Fome ${hungerBefore} → ${hungerAfter} (-${hungerAmount})</p>`,
    ...extraRows
  ]

  if (skipResonance) {
    // no-op - vitae (Kindred vessel) doesn't carry a Resonance roll
  } else if (!temperamentResult || temperamentResult.temperament === 'none') {
    rows.push('<p>Ressonância: bolsa equilibrada, sem Ressonância relevante.</p>')
  } else if (temperamentResult.temperament === 'fleeting') {
    rows.push(`<p>Ressonância: ${resonanceLabel(resonanceResult.name)} efêmera; só sabor, sem bônus mecânico.</p>`)
  } else {
    const strength = temperamentResult.temperament === 'acute' ? 'aguda (Discrasia)' : 'intensa'
    rows.push(`<p>Ressonância: <b>${resonanceLabel(resonanceResult.name)} ${strength}</b>; +1 dado nas Disciplinas ligadas a ela até a próxima alimentação ou até Fome 5.</p>`)
    if (temperamentResult.temperament === 'acute') {
      rows.push('<p><em>Esta bolsa tinha uma Discrasia; consulte o Narrador sobre o efeito.</em></p>')
    }
  }

  return `<div class="vtm5e-cs-feed-result">${rows.join('')}</div>`
}

async function handleHumanFeed (actor) {
  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Quanto você saciou?' },
    content: '<p>Pela tabela de Alimentação (livro básico, p. 212), escolha o que mais se aproxima do que aconteceu na cena.</p>',
    buttons: [
      { action: 'sip', label: 'Um gole (1 de Fome)' },
      { action: 'drink', label: 'Beber à vontade (2 de Fome)' },
      { action: 'kill', label: 'Drenar e matar (5 de Fome)' },
      { action: 'none', label: 'Não saciou' }
    ]
  })

  if (!choice || choice === 'none') return

  const HUNGER_BY_CHOICE = { sip: 1, drink: 2, kill: 5 }
  const LABEL_BY_CHOICE = { sip: 'Um gole', drink: 'Beber à vontade', kill: 'Drenar e matar' }
  const hungerAmount = HUNGER_BY_CHOICE[choice]

  const hungerBefore = actor.system.hunger.value
  const hungerAfter = Math.max(hungerBefore - hungerAmount, 0)
  await actor.update({ 'system.hunger.value': hungerAfter })

  const temperamentResult = await rollTemperament()
  let resonanceResult = null

  if (temperamentResult.temperament === 'none') {
    await clearExistingResonance(actor)
  } else if (temperamentResult.temperament === 'fleeting') {
    await clearExistingResonance(actor)
    resonanceResult = await rollResonanceType()
  } else {
    resonanceResult = await rollResonanceType()
    await applyResonance(actor, resonanceResult.name, temperamentResult.temperament)
  }

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: buildFeedResultHTML({
      title: 'Resultado da Alimentação: bolsa humana',
      hungerLabel: LABEL_BY_CHOICE[choice],
      hungerAmount,
      hungerBefore,
      hungerAfter,
      temperamentResult,
      resonanceResult
    })
  })
}

// Feeding from Animals (corebook p.212) - Hunger slaked is capped by the
// animal's size rather than a sip/drink/kill choice, and above Blood
// Potency 2 animal blood can't slake any Hunger at all. Animal blood is
// always its own single Resonance category (never one of the 4 human
// humors, and per p.227 never carries a Dyscrasia) - so the humor-table
// roll (rollResonanceType) is skipped entirely in favor of a fixed
// 'Animal Blood' name, and an Acute result downgrades to Intense.
async function handleAnimalFeed (actor) {
  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Alimentação de animais (livro básico, p. 212)' },
    content: '<p>Alimentar-se de um animal em geral o mata. Escolha o que mais se aproxima da cena.</p>',
    buttons: [
      { action: 'small', label: 'Vários animais pequenos (1 de Fome)' },
      { action: 'medium', label: 'Animal médio (1 de Fome)' },
      { action: 'large', label: 'Animal grande, como um cavalo (2 de Fome)' },
      { action: 'none', label: 'Não saciou' }
    ]
  })

  if (!choice || choice === 'none') return

  const HUNGER_BY_CHOICE = { small: 1, medium: 1, large: 2 }
  const LABEL_BY_CHOICE = { small: 'Vários animais pequenos', medium: 'Animal médio', large: 'Animal grande' }

  const bloodPotency = actor.system.blood?.potency ?? 0
  const cappedByPotency = bloodPotency > 2
  const hungerAmount = cappedByPotency ? 0 : HUNGER_BY_CHOICE[choice]

  const hungerBefore = actor.system.hunger.value
  const hungerAfter = Math.max(hungerBefore - hungerAmount, 0)
  if (hungerAmount > 0) await actor.update({ 'system.hunger.value': hungerAfter })

  let temperamentResult = null
  const resonanceResult = { name: 'Animal Blood' }

  if (hungerAmount > 0) {
    temperamentResult = await rollTemperament()
    if (temperamentResult.temperament === 'acute') temperamentResult.temperament = 'intense'

    if (temperamentResult.temperament === 'none') {
      await clearExistingResonance(actor)
    } else if (temperamentResult.temperament === 'fleeting') {
      await clearExistingResonance(actor)
    } else {
      await applyResonance(actor, 'Animal Blood', 'intense')
    }
  } else {
    await clearExistingResonance(actor)
  }

  const extraRows = cappedByPotency
    ? ['<p><em>Potência do Sangue acima de 2: sangue animal não sacia Fome (livro básico, p. 212).</em></p>']
    : []

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: buildFeedResultHTML({
      title: 'Resultado da Alimentação: bolsa animal',
      hungerLabel: LABEL_BY_CHOICE[choice],
      hungerAmount,
      hungerBefore,
      hungerAfter,
      temperamentResult,
      resonanceResult,
      extraRows
    })
  })
}

// Feeding from Other Vampires (corebook p.213) - a wholly different
// mechanic from human/animal vessels: Hunger slaked depends on the gap
// between the two vampires' Blood Potency, not a fixed table. No
// Temperament/Resonance roll (vitae doesn't carry a vessel's Resonance the
// way blood-with-a-heartbeat does). The donor isn't necessarily a
// controlled actor in this scene, so this only tracks the feeding
// vampire's own Hunger - the Hunger inflicted on the donor, and any Blood
// Bond risk (p.233), are flagged in the chat card for the Storyteller to
// apply by hand rather than guessed at by targeting an arbitrary actor.
async function handleKindredFeed (actor) {
  const myPotency = actor.system.blood?.potency ?? 0

  const result = await foundry.applications.api.DialogV2.input({
    window: { title: 'Alimentar-se de outro Membro (livro básico, p. 213)' },
    content: `
      <form class="vtm5e-cs-kindred-feed-dialog">
        <div class="form-group">
          <label>Pontos de Fome causados no doador</label>
          <input type="number" name="inflicted" value="1" min="1" max="5" step="1" />
        </div>
        <div class="form-group">
          <label>Potência do Sangue do doador</label>
          <input type="number" name="donorPotency" value="${myPotency}" min="0" max="10" step="1" />
        </div>
      </form>
    `,
    ok: { icon: 'fas fa-check', label: 'Alimentar-se' },
    buttons: [{ action: 'cancel', icon: 'fas fa-times', label: 'Cancelar' }],
    classes: ['wod5e']
  })

  if (!result || result === 'cancel') return

  const inflicted = Number(result.inflicted) || 0
  const donorPotency = Number(result.donorPotency) || 0
  if (inflicted <= 0) return

  const gap = donorPotency - myPotency
  let hungerAmount
  if (gap >= 2) hungerAmount = inflicted * 2
  else if (gap <= -2) hungerAmount = Math.floor(inflicted / 2)
  else hungerAmount = inflicted

  const hungerBefore = actor.system.hunger.value
  const hungerAfter = Math.max(hungerBefore - hungerAmount, 0)
  await actor.update({ 'system.hunger.value': hungerAfter })
  await clearExistingResonance(actor)

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: buildFeedResultHTML({
      title: 'Resultado da Alimentação: outro Membro',
      hungerLabel: `${inflicted} de Fome causada no doador (Potência do Sangue ${donorPotency})`,
      hungerAmount,
      hungerBefore,
      hungerAfter,
      extraRows: ['<p><em>Aplique a Fome causada na ficha do doador manualmente, se ele for um ator controlado. Beber diretamente de outro vampiro arrisca um Laço de Sangue (livro básico, p. 233), que este módulo não acompanha.</em></p>'],
      skipResonance: true
    })
  })
}

// Drinking an owned Blood Bag (see configure-shops-clinic.js - The Night
// Ward sells them, $349.99+ per Jake's real-world-cost floor) is
// guaranteed, no roll, no Masquerade risk, no Resonance (not a live
// vessel) - but per Jake's call it only restores a sip (1 Hunger), same
// floor as the weakest human-feeding option.
async function handleBloodBagFeed (actor, bloodBag) {
  const hungerBefore = actor.system.hunger.value
  const hungerAfter = Math.max(hungerBefore - 1, 0)
  await actor.update({ 'system.hunger.value': hungerAfter })

  const remaining = (bloodBag.system.quantity ?? 1) - 1
  if (remaining > 0) await bloodBag.update({ 'system.quantity': remaining })
  else await bloodBag.delete()

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: buildFeedResultHTML({
      title: 'Resultado da Alimentação: bolsa de sangue',
      hungerLabel: 'Um gole',
      hungerAmount: hungerBefore - hungerAfter,
      hungerBefore,
      hungerAfter,
      extraRows: ['<p><em>Origem ética: sem teste de caça, sem Ressonância, sem risco à Máscara.</em></p>'],
      skipResonance: true
    })
  })
}

export async function onFeed (actor) {
  const bloodBag = actor.items.find((i) => ['Blood Bags', 'Bolsas de Sangue'].includes(i.flags?.babele?.originalName ?? i.name) && i.type === 'gear' && (i.system.quantity ?? 1) > 0)

  if (bloodBag) {
    const mode = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Como você vai se alimentar?' },
      content: `<p>Você tem ${bloodBag.system.quantity ?? 1} bolsa(s) de sangue; beber uma é garantido, mas só equivale a um gole.</p>`,
      buttons: [
        { action: 'bloodbag', label: 'Beber uma bolsa de sangue (um gole, 1 de Fome)' },
        { action: 'hunt', label: 'Caçar uma vítima' }
      ]
    })
    if (!mode) return
    if (mode === 'bloodbag') {
      await handleBloodBagFeed(actor, bloodBag)
      return
    }
  }

  const predator = actor.items.find((i) => i.type === 'predatorType')
  if (!predator) {
    ui.notifications.warn('Escolha um Tipo de Predador antes de se alimentar: clique em "Selecionar Predador" no cabeçalho.')
    return
  }

  const paths = await choosePredatorPool(predator)
  if (!paths) return
  if (!paths.length) {
    ui.notifications.warn(`${predator.name} não tem parada de caça definida; faça a rolagem de alimentação manualmente desta vez.`)
    return
  }

  const selectors = ['feeding', ...paths.flatMap(path => [...path.split('.'), path])]
  const valuePaths = paths.map(path => `${path}.value`)
  const activeModifiers = await getActiveModifiers({ actor, selectors })

  let basicDice = await WOD5E.api.getBasicDice({
    valuePaths,
    flatMod: activeModifiers.totalValue,
    actor
  })
  let advancedDice = await WOD5E.api.getAdvancedDice({ actor })

  // Mix Hunger dice into the pool the same way every other vampire roll
  // does (mirrors _rollItem in wod5e's own item-roll.js)
  advancedDice = Math.min(basicDice, advancedDice)
  basicDice = Math.max(basicDice - advancedDice, 0)

  WOD5E.api.Roll({
    basicDice,
    advancedDice,
    actor,
    data: actor.system,
    title: `Alimentação - ${predator.name}`,
    difficulty: 2,
    flavor: predator.system.description || '',
    selectors,
    callback: async (err, roll) => {
      if (err) {
        console.error('vtm5e-charactersheet | Feed roll error:', err)
        return
      }
      if (!roll.rollSuccessful) {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: '<p class="vtm5e-cs-feed-title"><b>Resultado da Alimentação</b></p><p>A caçada não deu certo desta vez: nenhuma Fome saciada, nenhuma Ressonância. O Narrador pode ter uma complicação em mente.</p>'
        })
        return
      }

      const vesselType = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Que tipo de bolsa?' },
        content: '<p>Pelas regras de Alimentação (livro básico, p. 212-213), do que você se alimentou?</p>',
        buttons: [
          { action: 'human', label: 'Humano' },
          { action: 'animal', label: 'Animal' },
          { action: 'kindred', label: 'Outro Membro' }
        ]
      })

      if (vesselType === 'animal') await handleAnimalFeed(actor)
      else if (vesselType === 'kindred') await handleKindredFeed(actor)
      else if (vesselType === 'human') await handleHumanFeed(actor)
    }
  })
}
