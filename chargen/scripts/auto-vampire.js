// [vtm5e-ptbr] Criação automática de Vampiros (Manual Básico pp. 135–151), guiada por arquétipos.
//
// Fluxo (o mesmo do assistente, com escolhas automáticas):
//   1. arquétipo, clã, Mar do Tempo, nome e gênero;
//   2. Clã e Tipo de Predador pelo motor de concessões (registro em grantLedger), com um seletor que
//      segue as preferências do arquétipo;
//   3. Atributos e Habilidades pelas prioridades do arquétipo, Especializações gratuitas e Ritual gratuito;
//   4. Vantagens e Defeitos comprados em pacotes coerentes, respeitando restrições e exclusões;
//   5. auditoria completa do assistente (ChargenApp.auditAllSteps): se falhar, a ficha é apagada;
//   6. XP do Mar do Tempo gasto pela loja de XP (aparece no histórico), equipamento, textos e notas.

import { ChargenApp, ATTRIBUTE_GROUPS, SKILL_GROUPS, ATTRIBUTE_RATING_QUOTA, SKILL_DISTRIBUTIONS, GENERATION_INFO } from './chargen-app.js'
import {
  withAutoPicker, applyTrackedGrants, checkRestrictions, checkConflicts, getRatingCap, clanCreationGrants,
  chargenPurchaseBlock, featureCategory, REQUIRED_SPECIALTY_SKILLS, applyFreeSpecialties, applyDerivedTrackers,
  extraAdvantagePoints, displayLabel, exclusionConflicts, exclusionConflictsByName, powerRequirementFailures,
  chronicleSettings, baseSkillValue
} from './grant-engine.js'
import { getClanKey } from '../../clans/scripts/clan-key.js'
import { commitCart } from '../../xpshop/scripts/purchase-application.js'
import { experienceEntryUpdates } from '../../charactersheet/scripts/experience-ledger.js'
import { ARCHETYPES, PREDATOR_TEXT, GENERIC_SPECIALTY_DETAILS, FIRST_NAMES, SURNAMES } from './auto-archetypes.js'

const ID = 'vampiro-a-mascara-v5-ptbr'
const DEFAULT_FOLDER = 'PJs — Criação Automática'
const DISCIPLINE_IDS = new Set(['animalism', 'auspex', 'bloodsorcery', 'sorcery', 'celerity', 'dominate', 'fortitude', 'obfuscate', 'oblivion', 'potence', 'presence', 'protean'])
const discId = id => id === 'bloodsorcery' ? 'sorcery' : id
const REQUIRED_SPECIALTY_DEFAULTS = { academics: ['História', 'Direito', 'Literatura'], craft: ['Mecânica', 'Marcenaria', 'Costura'], performance: ['Música', 'Teatro', 'Dança'], science: ['Química', 'Biologia', 'Física'] }
const RESOURCES_CASH = [50, 300, 1200, 5000, 20000, 100000]

// Mar do Tempo (Manual Básico p. 137 e p. 151). O ano final do Neófito ("até uma década atrás") e o
// intervalo da Cria ("últimos 15 anos") dependem do ano da crônica.
export const SEA_OF_TIME = {
  childe: { label: 'Cria', gens: ['12th', '13th'], xp: 0, years: year => [year - 15, year - 1], apparent: [18, 40] },
  neonate: { label: 'Neófito', labelF: 'Neófita', gens: ['12th', '13th'], xp: 15, years: year => [1940, year - 10], apparent: [20, 45] },
  ancilla: { label: 'Ancião', labelF: 'Anciã', gens: ['10th', '11th'], xp: 35, years: () => [1780, 1940], apparent: [22, 50], bloodPotency: 1, advantages: 2, flaws: 2, humanity: -1 }
}

// ---------------------------------------------------------------- utilidades

export function seededPicker (seed) {
  let state = 2166136261
  for (const c of String(seed)) { state ^= c.codePointAt(0); state = Math.imul(state, 16777619) }
  state = state >>> 0 || 1
  return list => {
    if (!list.length) throw new Error('Não há opções disponíveis para o sorteio.')
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5
    return list[(state >>> 0) % list.length]
  }
}
const range = (a, b) => Array.from({ length: Math.max(b - a + 1, 1) }, (_, i) => a + i)
const shuffled = (list, rand) => { const pool = [...list]; const out = []; while (pool.length) { const item = rand(pool); pool.splice(pool.indexOf(item), 1); out.push(item) } return out }
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const stripTags = html => String(html).replace(/<[^>]+>/g, '')
const dots = n => '•'.repeat(Math.max(n, 0))
const copy = doc => { const data = doc.toObject(); delete data._id; delete data.ownership; return data }
const flagsOf = doc => doc.flags?.[ID] ?? {}
const lower = s => s.charAt(0).toLocaleLowerCase('pt-BR') + s.slice(1)
const upper = s => s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1)
const enName = doc => doc?.flags?.babele?.originalName ?? doc?.name

// Troca leve de posições vizinhas: mantém as prioridades do arquétipo, mas dois personagens do mesmo
// arquétipo não saem idênticos.
function prioritized (list, rand) {
  const out = [...list]
  for (let i = 0; i < out.length - 1; i++) {
    if (rand([false, false, true])) { [out[i], out[i + 1]] = [out[i + 1], out[i]]; i++ }
  }
  return out
}

function assignByPriority (order, quota) {
  const ratings = Object.entries(quota).map(([r, n]) => [Number(r), n]).sort((a, b) => b[0] - a[0])
  const result = {}
  let i = 0
  for (const [rating, count] of ratings) for (let n = 0; n < count; n++) result[order[i++]] = rating
  return result
}

async function packDocs (suffix) {
  const pack = game.packs.get(`${ID}.${suffix}`)
  if (!pack) throw new Error(`Compêndio ausente: ${suffix}.`)
  return [...await pack.getDocuments()].sort((a, b) => a.id.localeCompare(b.id, 'en'))
}

function reservedTokens (chron) {
  const words = [
    ...game.actors.map(a => a.name),
    ...chron.reservedNames.split(/[,;\n]/)
  ].flatMap(name => String(name).split(/[\s"'()]+/)).map(w => w.trim().toLocaleLowerCase('pt-BR')).filter(w => w.length > 2)
  return new Set(words)
}

function makeName (gender, rand, reserved) {
  const firsts = FIRST_NAMES[gender].filter(n => !reserved.has(n.toLocaleLowerCase('pt-BR')))
  const lasts = SURNAMES.filter(n => !reserved.has(n.toLocaleLowerCase('pt-BR')))
  const first = rand(firsts.length ? firsts : FIRST_NAMES[gender])
  const last = rand(lasts.length ? lasts : SURNAMES)
  reserved.add(first.toLocaleLowerCase('pt-BR')); reserved.add(last.toLocaleLowerCase('pt-BR'))
  return { first, last, full: `${first} ${last}` }
}

function date (year, rand) {
  const d = String(rand(range(1, 28))).padStart(2, '0')
  const m = String(rand(range(1, 12))).padStart(2, '0')
  return `${d}/${m}/${year}`
}

function attributeLabel (key) {
  const i18n = `WOD5E.AttributesList.${key.charAt(0).toUpperCase()}${key.slice(1)}`
  return game.i18n.has(i18n) ? game.i18n.localize(i18n) : displayLabel(key)
}

// ---------------------------------------------------------------- regras de compra

function illiteracyConflict (actor, doc) {
  const has = name => actor.items.some(i => i.type === 'feature' && (i.name === name || enName(i) === name))
  const skill = id => actor.system.skills?.[id]?.value ?? 0
  if (enName(doc) === 'Illiterate') return skill('academics') > 1 || skill('science') > 1 || has('Linguistics')
  return false
}

function excludedCategory (doc) {
  return ['thinBloodMerit', 'thinBloodFlaw', 'coterie', 'baneVariant', 'mythic'].includes(featureCategory(doc))
}

// Pode comprar `points` pontos (a mais) neste item? Devolve o motivo da recusa, ou null.
function purchaseProblem (actor, doc, points) {
  if (!doc || doc.type !== 'feature') return 'item inexistente'
  if (excludedCategory(doc)) return 'categoria fora da criação'
  const existing = actor.items.find(i => i.type === 'feature' && i.name === doc.name)
  const current = existing?.system.points ?? 0
  const fixed = Number(doc.system.points) || 0
  if (fixed && (existing || points !== fixed)) return 'custo fixo diferente'
  const block = chargenPurchaseBlock(actor, doc)
  if (block) return block
  if (!existing) {
    const restrictions = checkRestrictions(actor, flagsOf(doc).restrictions ?? [])
    if (restrictions.length) return restrictions.join(' ')
    if (checkConflicts(actor, doc.name, flagsOf(doc).conflictsWith ?? []).length) return 'conflito'
    if (exclusionConflicts(actor, doc).length) return 'exclusão'
    if (illiteracyConflict(actor, doc)) return 'Analfabeto'
  }
  const cap = getRatingCap(actor, doc) ?? 5
  if (current + points > cap) return 'limite de pontos'
  return null
}

async function buyFeature (actor, doc, points) {
  const existing = actor.items.find(i => i.type === 'feature' && i.name === doc.name)
  if (existing) {
    const before = existing.system.points
    await existing.update({ 'system.points': before + points })
    return async () => existing.update({ 'system.points': before })
  }
  const data = copy(doc)
  data.system.points = points
  foundry.utils.setProperty(data, `flags.${ID}.grantedPoints`, 0)
  const [item] = await actor.createEmbeddedDocuments('Item', [data])
  return async () => item.delete()
}

// Compra pacotes inteiros do arquétipo (ex.: Refúgio Base 2 + Biblioteca 1). Se um item do pacote
// falhar, o pacote é desfeito. O que sobrar é completado com pontos soltos nos itens do arquétipo e,
// por último, com o sorteio geral (sempre dentro das regras).
async function buyBudget (actor, docs, packages, budget, kinds, rand, log) {
  const find = name => docs.find(d => d.type === 'feature' && d.name === name && kinds.includes(d.system.featuretype))
  let remaining = budget
  for (const pkg of shuffled(packages, rand)) {
    const cost = pkg.reduce((sum, [, p]) => sum + p, 0)
    if (!cost || cost > remaining) continue
    const undo = []
    let ok = true
    for (const [name, points] of pkg) {
      const doc = find(name)
      if (!doc || purchaseProblem(actor, doc, points)) { ok = false; break }
      undo.push(await buyFeature(actor, doc, points))
    }
    if (!ok) { for (const fn of undo.reverse()) await fn(); continue }
    remaining -= cost
    log.push(`Compra (pacote do arquétipo): ${pkg.map(([n, p]) => `${n} ${dots(p)}`).join(' + ')}`)
    if (!remaining) return
  }
  const preferred = [...new Set(packages.flat().map(([name]) => name))]
  for (let guard = 0; remaining > 0 && guard < 50; guard++) {
    const options = preferred.map(find).filter(doc => doc && !Number(doc.system.points) && !purchaseProblem(actor, doc, 1))
    if (!options.length) break
    const doc = rand(options)
    await buyFeature(actor, doc, 1)
    remaining -= 1
    log.push(`Compra: ${doc.name} (+1)`)
  }
  for (let guard = 0; remaining > 0 && guard < 200; guard++) {
    const options = docs.filter(doc => doc.type === 'feature' && kinds.includes(doc.system.featuretype)).flatMap(doc => {
      const fixed = Number(doc.system.points) || 0
      const points = fixed || 1
      return points <= remaining && !purchaseProblem(actor, doc, points) ? [[doc, points]] : []
    })
    if (!options.length) break
    const [doc, points] = rand(options)
    await buyFeature(actor, doc, points)
    remaining -= points
    log.push(`Compra (sorteio): ${doc.name} (${points})`)
  }
  if (remaining) throw new Error(`Não foi possível gastar ${budget} pontos em ${kinds.includes('flaw') ? 'Defeitos' : 'Vantagens'}. Restam ${remaining}.`)
}

// ---------------------------------------------------------------- seletor de escolhas

// Escolhe entre as opções que o motor de concessões oferece (Disciplinas do clã, Especialização do
// Predador, Antecedente ou Defeito à escolha, poderes), seguindo o arquétipo.
function archetypePicker (actor, archetype, rand) {
  const discPrefs = archetype.disciplines.map(discId)
  return list => {
    if (!list.length) throw new Error('Não há opções disponíveis para o sorteio.')
    const sample = list[0]
    if (sample instanceof foundry.abstract.Document) return rand(list)
    if (typeof sample === 'object' && sample.skill) {
      const value = c => actor.system.skills?.[c.skill]?.value ?? 0
      const best = Math.max(...list.map(value))
      return rand(list.filter(c => value(c) === best))
    }
    if (typeof sample === 'object' && sample.name && !sample.discipline) {
      const ok = list.filter(c => !exclusionConflictsByName(actor, c.name).length)
      return rand(ok.length ? ok : list)
    }
    const key = c => typeof c === 'string' ? c : c.discipline
    const isDiscipline = DISCIPLINE_IDS.has(key(sample))
    const prefs = isDiscipline ? discPrefs : archetype.backgrounds
    const ranked = list.map(c => [c, prefs.indexOf(isDiscipline ? discId(key(c)) : key(c))]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1])
    return ranked.length ? ranked[0][0] : rand(list)
  }
}

// ---------------------------------------------------------------- etapas

async function applyPick (actor, doc, slot, log) {
  const [item] = await actor.createEmbeddedDocuments('Item', [copy(doc)])
  const pickLabel = slot === 'clan' ? 'Clã' : 'Tipo de Predador'
  await applyTrackedGrants(actor, { slot, pickLabel, name: item.name, sourceLabel: `${pickLabel}: ${item.name}`, grants: slot === 'clan' ? clanCreationGrants(item) : flagsOf(item).grants ?? [] }, log)
  return item
}

// "Empatia com Animais (Animal Específico)" vira "Empatia com Animais (Cães)".
async function concretizePredatorSpecialties (actor, rand) {
  const slot = foundry.utils.deepClone(actor.flags?.[ID]?.grantLedger?.predator)
  if (!slot) return
  let changed = false
  for (const entry of slot.entries ?? []) {
    if (entry.type !== 'specialty' || !/\([^)]*espec[ií]fic[^)]*\)$/i.test(entry.label)) continue
    const details = GENERIC_SPECIALTY_DETAILS[entry.skill]
    if (!details) continue
    const label = entry.label.replace(/\([^)]*\)$/, `(${rand(details)})`)
    const bonuses = foundry.utils.deepClone(actor.system.skills?.[entry.skill]?.bonuses ?? [])
    const bonus = bonuses.findLast(b => b.source === entry.label)
    if (!bonus) continue
    bonus.source = label
    await actor.update({ [`system.skills.${entry.skill}.bonuses`]: bonuses })
    entry.label = label
    changed = true
  }
  if (changed) await actor.setFlag(ID, 'grantLedger.predator', slot)
}

async function addFreeSpecialties (actor, archetype, skillOrder, rand) {
  const used = new Set(Object.values(actor.system.skills ?? {}).flatMap(s => (s.bonuses ?? []).map(b => b.source.toLocaleLowerCase('pt-BR'))))
  const labelFor = skill => {
    const options = [...(archetype.specialties[skill] ?? []), ...(REQUIRED_SPECIALTY_DEFAULTS[skill] ?? [])].filter(l => !used.has(l.toLocaleLowerCase('pt-BR')))
    if (!options.length) return null
    const label = rand(options)
    used.add(label.toLocaleLowerCase('pt-BR'))
    return label
  }
  const data = {}
  for (const skill of REQUIRED_SPECIALTY_SKILLS) if (baseSkillValue(actor, skill) > 0) data[skill] = labelFor(skill) ?? 'Geral'
  const freeSkill = skillOrder.find(skill => baseSkillValue(actor, skill) > 0 && (archetype.specialties[skill] ?? []).some(l => !used.has(l.toLocaleLowerCase('pt-BR')))) ??
    skillOrder.find(skill => baseSkillValue(actor, skill) > 0)
  if (!freeSkill) throw new Error('Nenhuma Habilidade disponível para a Especialização livre.')
  data.free = { skill: freeSkill, label: labelFor(freeSkill) ?? 'Prática' }
  await actor.setFlag(ID, 'freeSpecialties', data)
  await applyFreeSpecialties(actor)
}

// Feitiçaria de Sangue: um Ritual de nível 1 gratuito na criação (Manual Básico p. 271).
async function addFreeRitual (actor, powers, rand, log) {
  if ((actor.system.disciplines?.sorcery?.value ?? 0) < 1) return
  const rituals = powers.filter(d => d.type === 'power' && d.system.discipline === 'rituals' && Number(d.system.level) === 1)
  if (!rituals.length) return
  const ritual = rand(rituals)
  await actor.createEmbeddedDocuments('Item', [copy(ritual)])
  log.push(`Feitiçaria de Sangue: Ritual gratuito de nível 1, ${ritual.name} (Manual Básico p. 271)`)
}

async function addThinBloodFeatures (actor, features, rand, log) {
  const count = rand([1, 2, 3])
  for (const category of ['thinBloodMerit', 'thinBloodFlaw']) {
    let taken = 0
    for (const doc of shuffled(features.filter(d => featureCategory(d) === category), rand)) {
      if (taken >= count) break
      if (checkRestrictions(actor, flagsOf(doc).restrictions ?? []).length || checkConflicts(actor, doc.name, flagsOf(doc).conflictsWith ?? []).length) continue
      if (actor.items.some(i => i.type === 'feature' && i.name === doc.name)) continue
      const data = copy(doc); data.system.points = 0
      await actor.createEmbeddedDocuments('Item', [data])
      taken++
      log.push(`Sangue-Ralo: ${doc.name}`)
    }
    if (taken !== count) throw new Error('Não foi possível escolher as Qualidades e Defeitos de Sangue-Ralo.')
  }
}

// Gasta o XP do Mar do Tempo como a loja de XP faria (Manual Básico p. 137, tabela de custos):
// Disciplina de clã nível × 5 (Caitiff × 6), Habilidade nível × 3, Atributo nível × 5,
// Especialização 3, Ritual nível × 3. Cada compra vira uma linha no histórico de Experiência.
async function spendExperience (actor, { total, award, archetype, clanDisciplines, caitiff, thin, powers, rand, ageKey }) {
  if (!total) return []
  await actor.update(experienceEntryUpdates([{ id: foundry.utils.randomID(8), name: award, value: total, timestamp: Date.now() - 1000 }]))
  const sys = actor.system
  const sim = {
    attributes: Object.fromEntries(Object.entries(sys.attributes).map(([k, v]) => [k, v.value])),
    skills: Object.fromEntries(Object.entries(sys.skills).map(([k, v]) => [k, v.value])),
    disciplines: Object.fromEntries(Object.entries(sys.disciplines ?? {}).map(([k, v]) => [k, v.value ?? 0])),
    powerNames: new Set(actor.items.filter(i => i.type === 'power').map(i => i.name)),
    specialties: new Set(Object.values(sys.skills).flatMap(s => (s.bonuses ?? []).map(b => b.source.toLocaleLowerCase('pt-BR'))))
  }
  const cap = ageKey === 'ancilla' ? 5 : 4
  const discCap = ageKey === 'ancilla' ? 4 : 3
  const discOrder = archetype.disciplines.map(discId).filter(id => clanDisciplines.includes(id))
  const powerOptions = (id, level) => powers.filter(doc => doc.type === 'power' && discId(doc.system.discipline) === id && Number(doc.system.level) === level &&
    !sim.powerNames.has(doc.name) && powerRequirementFailures(actor, doc, { disciplines: sim.disciplines, powerNames: [...sim.powerNames] }).length === 0)

  const options = {
    disciplines: () => {
      if (thin) return null
      for (const id of discOrder) {
        const next = (sim.disciplines[id] ?? 0) + 1
        if (next > discCap) continue
        const candidates = powerOptions(id, next)
        if (!candidates.length) continue
        const power = rand(candidates)
        return { category: 'disciplines', traitId: id, targetLevel: next, powerId: power.id, powerName: power.name, cost: next * (caitiff ? 6 : 5), label: `${displayLabel(id)} ${next} — ${power.name}`, apply: () => { sim.disciplines[id] = next; sim.powerNames.add(power.name) } }
      }
      return null
    },
    rituals: () => {
      const level = Math.min(sim.disciplines.sorcery ?? 0, 2)
      if (level < 1) return null
      const candidates = powers.filter(d => d.type === 'power' && d.system.discipline === 'rituals' && Number(d.system.level) <= level && !sim.powerNames.has(d.name))
      if (!candidates.length) return null
      const ritual = rand(candidates)
      const lvl = Number(ritual.system.level)
      return { category: 'extraPowers', traitId: 'sorcery', targetLevel: lvl, powerId: ritual.id, powerName: ritual.name, cost: lvl * 3, label: `Ritual: ${ritual.name} (nível ${lvl})`, apply: () => sim.powerNames.add(ritual.name) }
    },
    skills: () => {
      const top = archetype.skills.slice(0, 6).filter(s => (sim.skills[s] ?? 0) > 0 && sim.skills[s] < cap)
      if (!top.length) return null
      const skill = top.reduce((a, b) => (sim.skills[b] > sim.skills[a] ? b : a))
      const next = sim.skills[skill] + 1
      return { category: 'skills', traitId: skill, targetLevel: next, cost: next * 3, label: `${displayLabel(skill)} → ${next}`, apply: () => { sim.skills[skill] = next } }
    },
    specialties: () => {
      for (const skill of archetype.skills.slice(0, 8)) {
        if ((sim.skills[skill] ?? 0) < 1) continue
        const labels = (archetype.specialties[skill] ?? []).filter(l => !sim.specialties.has(l.toLocaleLowerCase('pt-BR')))
        if (!labels.length) continue
        const text = rand(labels)
        return { category: 'specialties', traitId: null, skillId: skill, text, cost: 3, label: `Especialização: ${displayLabel(skill)} (${text})`, apply: () => sim.specialties.add(text.toLocaleLowerCase('pt-BR')) }
      }
      return null
    },
    attributes: () => {
      const attr = archetype.attrs.slice(0, 3).find(a => sim.attributes[a] < cap)
      if (!attr) return null
      const next = sim.attributes[attr] + 1
      return { category: 'attributes', traitId: attr, targetLevel: next, cost: next * 5, label: `${attributeLabel(attr)} → ${next}`, apply: () => { sim.attributes[attr] = next } }
    }
  }
  const order = ['disciplines', 'skills', 'specialties', 'rituals', 'attributes', 'disciplines', 'skills', 'specialties']
  const cart = []
  let remaining = total
  for (let round = 0; remaining >= 3 && round < 40; round++) {
    const start = rand(range(0, order.length - 1))
    let bought = false
    for (let i = 0; i < order.length; i++) {
      const option = options[order[(start + i) % order.length]]()
      if (!option || option.cost > remaining) continue
      option.apply()
      delete option.apply
      cart.push({ id: foundry.utils.randomID(8), ...option })
      remaining -= option.cost
      bought = true
      break
    }
    if (!bought) break
  }
  if (cart.length) await commitCart(actor, cart)
  return cart.map(e => `${e.label} (${e.cost} XP)`)
}

// ---------------------------------------------------------------- textos

// O nome do Pilar acompanha o gênero da descrição ("mãe idosa", "irmão mais velho"...).
const PILLAR_FEMININE = /^(dona|antiga|bibliotecária|sobrinha|governanta|irmã|mãe|enfermeira|filha|avó|editora|líder comunitária|freira|esposa)\b/i
const PILLAR_MASCULINE = /^(irmão|treinador|filho|repórter policial|sobrinho|dono|garçom|juiz|voluntário|brigadista|parceiro|informante|antigo|padre|coveiro|marido)\b/i
function pillarGender (description) {
  if (PILLAR_FEMININE.test(description)) return 'f'
  if (PILLAR_MASCULINE.test(description)) return 'm'
  return null
}

// Pilares: a idade segue o parentesco ({ rel } = relativa à idade real do personagem, como se vivo;
// { abs } = faixa fixa). Pares impossíveis (Pilar com menos de 16 ou mais de 98 anos) ficam de fora.
function convictionsHtml (archetype, pcFirst, pcTrueAge, rand, reserved, g) {
  const ageOf = rule => rule?.rel ? pcTrueAge + rand(range(...rule.rel)) : rand(range(...(rule?.abs ?? [19, 78])))
  const pairs = shuffled(archetype.convictions, rand)
    .map(([conviction, pillar, rule]) => ({ conviction, pillar, age: ageOf(rule) }))
    .filter(pair => pair.age >= 16 && pair.age <= 98)
  const count = Math.min(rand([1, 2, 3]), pairs.length)
  if (!count) throw new Error('Nenhum Pilar possível para este arquétipo e idade.')
  return pairs.slice(0, count).map(({ conviction, pillar, age }) => {
    const person = makeName(pillarGender(pillar) ?? rand(['m', 'f']), rand, reserved)
    return `<p><b>Convicção:</b> ${escape(conviction)}.<br><b>Pilar:</b> ${escape(person.full)}, ${age} anos, ${escape(g(pillar).replaceAll('{nome}', pcFirst))}.</p>`
  }).join('')
}

function tenetsHtml (chron) {
  return `<p><b>Princípios da Crônica</b> (confirme com o Narrador; Manual Básico p. 172):</p><ul>${chron.tenets.map(t => `<li>${escape(t)}</li>`).join('')}</ul>`
}

function featureSummary (actor, flaw) {
  return actor.items.filter(i => i.type === 'feature' && (i.system.featuretype === 'flaw') === flaw && i.system.points > 0)
    .map(i => `${i.name} ${dots(i.system.points)}${(i.flags?.[ID]?.grantedPoints ?? 0) > 0 ? ' (concedido)' : ''}`)
}

function disciplineSummary (actor) {
  return Object.entries(actor.system.disciplines ?? {}).filter(([, v]) => v.value > 0).map(([id, v]) => {
    const names = actor.items.filter(i => i.type === 'power' && discId(i.system.discipline) === id).map(i => i.name)
    return `${displayLabel(id)} ${dots(v.value)}${names.length ? ` (${names.join(', ')})` : ''}`
  })
}

// ---------------------------------------------------------------- entrada principal

export async function autoCreateVampire ({ seed, name, clan: clanChoice, age, archetype: archetypeChoice, gender: genderChoice, folder } = {}) {
  if (game.system.id !== 'wod5e') throw new Error('O sistema ativo precisa ser wod5e.')
  if (!game.user.isGM && !game.user.hasPermission('ACTOR_CREATE')) throw new Error('Você não tem permissão para criar Atores.')
  seed = String(seed || `${Date.now()}-${Math.random()}`)
  const rand = seededPicker(seed)
  const chron = chronicleSettings()
  const city = chron.city || 'sua cidade'
  const log = []
  const [clans, predators, features, powers, equipment] = await Promise.all(['clans', 'predatortypes', 'meritsflaws', 'disciplines', 'equipment'].map(packDocs))

  const archetype = ARCHETYPES.find(a => a.id === archetypeChoice) ?? rand(ARCHETYPES)
  const clanDoc = clanChoice ? clans.find(c => c.name === clanChoice || getClanKey(c) === clanChoice) : rand(clans.filter(c => c.type === 'clan'))
  if (!clanDoc) throw new Error(`Clã não encontrado: ${clanChoice}.`)
  const thin = getClanKey(clanDoc) === 'thin-blooded'
  const caitiff = getClanKey(clanDoc) === 'caitiff'
  const ageKey = thin ? 'childe' : (SEA_OF_TIME[age] ? age : 'neonate')
  const sea = SEA_OF_TIME[ageKey]
  const gender = ['m', 'f'].includes(genderChoice) ? genderChoice : rand(['m', 'f'])
  const g = text => String(text).replace(/\[([^|\]]*)\|([^\]]*)\]/g, (_, m, f) => (gender === 'm' ? m : f))
  const reserved = reservedTokens(chron)
  const pcName = name?.trim() ? { full: name.trim(), first: name.trim().split(/\s+/)[0].replace(/^["']/, '') } : makeName(gender, rand, reserved)
  const T = text => g(text).replaceAll('{cidade}', city).replaceAll('{nome}', pcName.first)
  const seaLabel = gender === 'f' && sea.labelF ? sea.labelF : sea.label

  const folderName = folder?.trim() || DEFAULT_FOLDER
  const folderDoc = game.folders.find(f => f.type === 'Actor' && f.name === folderName) ?? await Folder.create({ name: folderName, type: 'Actor' })
  const actor = await Actor.create({ name: pcName.full, type: 'vampire', folder: folderDoc.id })

  try {
    // Datas do Mar do Tempo
    const [from, to] = sea.years(chron.year)
    const embraceYear = rand(range(Math.min(from, to), Math.max(from, to)))
    const apparent = rand(range(...sea.apparent))
    const birthYear = embraceYear - apparent
    const generation = rand(thin ? ['14th', '15th', '16th'] : sea.gens)
    const sireKnown = rand([true, true, true, false])
    const sire = sireKnown ? makeName(rand(['m', 'f']), rand, reserved) : null
    const sireFate = rand(['paradeiro desconhecido', 'Morte Final há alguns anos', 'ainda ativo na cidade', 'deixou a cidade'])

    const attrOrder = prioritized(archetype.attrs, rand)
    const attrs = assignByPriority(attrOrder, ATTRIBUTE_RATING_QUOTA)
    // Força de Vontade (Autocontrole + Determinação) nunca abaixo de 4: troca o ponto único com o 2 de menor prioridade.
    for (let guard = 0; attrs.composure + attrs.resolve < 4 && guard < 4; guard++) {
      const low = attrs.composure <= attrs.resolve ? 'composure' : 'resolve'
      const swap = [...attrOrder].reverse().find(k => !['composure', 'resolve'].includes(k) && attrs[k] > attrs[low])
      if (!swap) break
      ;[attrs[low], attrs[swap]] = [attrs[swap], attrs[low]]
    }
    const distribution = rand(archetype.dists.filter(d => SKILL_DISTRIBUTIONS[d]))
    const quota = SKILL_DISTRIBUTIONS[distribution].quota
    const skillCount = Object.values(quota).reduce((a, b) => a + b, 0)
    const skillOrder = prioritized(archetype.skills, rand)
    const skills = assignByPriority(skillOrder.slice(0, skillCount), quota)

    await withAutoPicker(actor, archetypePicker(actor, archetype, rand), async () => {
      await applyPick(actor, clanDoc, 'clan', log)
      const updates = {
        'system.headers.generation': generation, 'system.blood.generation': generation,
        'system.blood.potency': GENERATION_INFO[generation].bp + (sea.bloodPotency ?? 0),
        'system.headers.concept': T(rand(archetype.concepts)),
        'system.headers.ambition': T(rand(archetype.ambitions)),
        'system.headers.desire': T(rand(archetype.desires)),
        'system.headers.chronicle': chron.name,
        'system.headers.sire': sire ? `${sire.full} (${clanDoc.name}; ${sireFate})` : 'Desconhecido',
        'system.headers.tenets': tenetsHtml(chron),
        'system.headers.touchstones': convictionsHtml(archetype, pcName.first, chron.year - birthYear, rand, reserved, g),
        'system.bio.dateof.birth': date(birthYear, rand),
        'system.bio.dateof.death': `${date(embraceYear, rand)} (Abraço — ${seaLabel})`,
        'system.bio.age.apparent': String(apparent),
        'system.bio.age.trueage': String(chron.year - birthYear),
        'system.humanity.value': 7,
        [`flags.${ID}.skillDistribution`]: distribution,
        [`flags.${ID}.attributesInitialized`]: true,
        [`flags.${ID}.seaOfTime`]: ageKey
      }
      for (const key of Object.values(ATTRIBUTE_GROUPS).flat()) updates[`system.attributes.${key}.value`] = attrs[key] ?? 0
      for (const key of Object.values(SKILL_GROUPS).flat()) updates[`system.skills.${key}.value`] = skills[key] ?? 0
      await actor.update(updates)

      const allowed = predators.filter(p => !checkRestrictions(actor, flagsOf(p).restrictions ?? []).length && !checkConflicts(actor, p.name, flagsOf(p).conflictsWith ?? []).length)
      const preferred = archetype.predators.map(n => allowed.find(p => p.name === n)).filter(Boolean)
      await applyPick(actor, rand(preferred.length ? preferred : allowed), 'predator', log)
      await concretizePredatorSpecialties(actor, rand)
      await addFreeSpecialties(actor, archetype, skillOrder, rand)
      await addFreeRitual(actor, powers, rand, log)
      if (thin) await addThinBloodFeatures(actor, features, rand, log)
    })

    await buyBudget(actor, features, archetype.flaws.map(f => [f]), 2 + (sea.flaws ?? 0), ['flaw'], rand, log)
    await buyBudget(actor, features, archetype.packages, 7 + extraAdvantagePoints() + (sea.advantages ?? 0), ['merit', 'background'], rand, log)
    if (sea.humanity) await actor.update({ 'system.humanity.value': actor.system.humanity.value + sea.humanity })

    const failures = new ChargenApp(actor).auditAllSteps(features)
    if (failures.length) throw new Error(`Auditoria incompleta: ${failures.join(' | ')}`)
    await applyDerivedTrackers(actor)
    await actor.setFlag(ID, 'wizardCompleted', true)

    // Experiência (depois da auditoria, porque o XP muda as cotas de criação)
    const clanDisciplines = caitiff
      ? Object.entries(actor.system.disciplines ?? {}).filter(([, v]) => v.value > 0).map(([k]) => k)
      : [...new Set(clanCreationGrants(clanDoc).filter(gr => gr.type === 'clanDisciplines').flatMap(gr => gr.choices.map(c => discId(typeof c === 'string' ? c : c.discipline))))]
    const xpLines = await spendExperience(actor, {
      total: sea.xp, award: `XP inicial — ${seaLabel}: Mar do Tempo (Manual Básico pp. 137 e 151)`,
      archetype, clanDisciplines, caitiff, thin, powers, rand, ageKey
    })

    // Equipamento
    const items = []
    for (const gear of archetype.gear) {
      if (gear.from) {
        const doc = equipment.find(e => e.name === gear.from)
        if (!doc) continue
        const data = copy(doc)
        if (gear.name) data.name = gear.name
        if (gear.qty) data.system.quantity = gear.qty
        items.push(data)
      } else {
        items.push({ name: gear.name, type: 'gear', system: { description: `<p>${escape(T(gear.note ?? ''))}</p>`, quantity: gear.qty ?? 1 } })
      }
    }
    if (items.length) await actor.createEmbeddedDocuments('Item', items)
    const resources = actor.items.find(i => i.type === 'feature' && enName(i) === 'Resources')?.system.points ?? 0

    // Textos
    const predator = actor.items.find(i => i.type === 'predatorType')
    const merits = featureSummary(actor, false)
    const flaws = featureSummary(actor, true)
    const disciplines = disciplineSummary(actor)
    const sireShort = sire ? `${sire.full}, do clã ${clanDoc.name},` : 'um vampiro que nunca revelou o nome'
    const embrace = T(rand(archetype.embrace))
    const fateSentence = sire
      ? { 'paradeiro desconhecido': `Hoje, ninguém sabe onde ${sire.first} está.`, 'Morte Final há alguns anos': `${sire.first} sofreu a Morte Final há alguns anos.`, 'ainda ativo na cidade': `${sire.first} ainda está na cidade.`, 'deixou a cidade': `${sire.first} deixou a cidade pouco depois.` }[sireFate]
      : 'Seu senhor nunca mais apareceu.'
    const meritNames = actor.items.filter(i => i.type === 'feature' && i.system.featuretype !== 'flaw' && i.system.points > 0).map(i => `${i.name} ${dots(i.system.points)}`)
    const bio = [
      `${pcName.first} ${lower(T(archetype.life))}`,
      `Em ${embraceYear}, ${sireShort} ${embrace}. Por isso, ${g('[o|a]')} Abraçou. ${fateSentence}`,
      `Hoje, ${pcName.first} ${PREDATOR_TEXT[predator?.name] ?? 'caça como pode'}.${meritNames.length ? ` Conta com ${meritNames.slice(0, 3).join(', ')}.` : ''} No momento, quer ${lower(T(actor.system.headers.desire))}.`
    ]
    const ritualNames = actor.items.filter(i => i.type === 'power' && i.system.discipline === 'rituals').map(i => i.name)
    const notes = [
      `<p><b>Arquétipo:</b> ${escape(archetype.label)}. <b>Mar do Tempo:</b> ${escape(seaLabel)} (${generation.replace(/(st|nd|rd|th)$/, 'ª')} Geração, Potência do Sangue ${actor.system.blood.potency}).</p>`,
      `<p><b>Clã:</b> ${escape(clanDoc.name)} (a Perdição e a Compulsão estão no cabeçalho da ficha e no item do Clã).</p>`,
      `<p><b>Tipo de Predador:</b> ${escape(predator?.name ?? '—')}: ${escape(PREDATOR_TEXT[predator?.name] ?? '')}.</p>`,
      `<p><b>Disciplinas:</b> ${escape(disciplines.join('; ') || 'nenhuma')}.</p>`,
      ritualNames.length ? `<p><b>Rituais:</b> ${escape(ritualNames.join(', '))}.</p>` : '',
      `<p><b>Vantagens:</b> ${escape(merits.join('; ') || 'nenhuma')}.</p>`,
      `<p><b>Defeitos:</b> ${escape(flaws.join('; ') || 'nenhum')}.</p>`,
      sea.xp ? `<p><b>Experiência:</b> ${sea.xp} XP de ${escape(seaLabel)} gastos em ${escape(xpLines.join('; ') || 'nada')}.</p>` : ''
    ].join('')
    await actor.update({
      'system.appearance': `<p>${escape(T(rand(archetype.appearance)))}</p>`,
      'system.biography': bio.map(p => `<p>${escape(p)}</p>`).join(''),
      'system.equipment': `<p>Leva consigo: ${escape(items.map(i => i.name).join(', ') || 'pouca coisa')}.</p>`,
      'system.notes': notes,
      'system.privatenotes': `<p><b>Para o Narrador:</b> ${escape(T(rand(archetype.hooks)))}</p><p>Ficha gerada automaticamente (semente <code>${escape(seed)}</code>). Revise com o jogador o senhor, os Pilares e os ganchos.</p>`,
      [`flags.${ID}.currency`]: RESOURCES_CASH[Math.min(resources, 5)]
    })
    await actor.setFlag(ID, 'autoGenerated', { version: 2, seed, archetype: archetype.id, seaOfTime: ageKey, timestamp: new Date().toISOString(), log })

    const summary = [
      `Arquétipo: ${archetype.label}; Clã: ${clanDoc.name}; ${seaLabel}; semente: ${seed}`,
      `Atributos: ${Object.entries(actor.system.attributes).filter(([, v]) => v.value).map(([k, v]) => `${attributeLabel(k)} ${v.value}`).join(', ')}`,
      `Habilidades: ${Object.entries(actor.system.skills).filter(([, v]) => v.value).map(([k, v]) => `${displayLabel(k)} ${v.value}`).join(', ')}`,
      `Disciplinas: ${disciplines.join('; ')}`,
      `Vantagens: ${merits.join('; ')}`, `Defeitos: ${flaws.join('; ')}`,
      ...(xpLines.length ? [`XP: ${xpLines.join('; ')}`] : []),
      ...log.map(stripTags)
    ]
    await ChatMessage.create({ whisper: [game.user.id], content: `<h3>${escape(actor.name)}</h3>${summary.map(l => `<p>${escape(l)}</p>`).join('')}` })
    return { actor, seed, log }
  } catch (error) {
    try { await actor.delete() } catch (rollback) { throw new Error(`${error.message} Falha ao excluir o Ator criado: ${rollback.message}`, { cause: error }) }
    throw error
  }
}

export const ARCHETYPE_OPTIONS = Object.fromEntries(ARCHETYPES.map(a => [a.id, a.label]))
