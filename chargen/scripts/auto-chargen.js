import { ChargenApp, ATTRIBUTE_GROUPS, SKILL_GROUPS, ATTRIBUTE_RATING_QUOTA, SKILL_DISTRIBUTIONS, GENERATION_INFO } from './chargen-app.js'
import { withAutoPicker, applyTrackedGrants, checkRestrictions, checkConflicts, getRatingCap, clanCreationGrants, chargenPurchaseBlock, featureCategory, REQUIRED_SPECIALTY_SKILLS, applyFreeSpecialties, applyDerivedTrackers, extraAdvantagePoints, displayLabel } from './grant-engine.js'
import { getClanKey } from '../../clans/scripts/clan-key.js'

const ID = 'vampiro-a-mascara-v5-ptbr'
const NAMES = ['Alex', 'Ariel', 'Cris', 'Dani', 'Jo', 'Lu', 'Neri', 'Sam']
const CONCEPTS = ['artista noturno', 'jornalista curioso', 'motorista discreto', 'ativista cansado', 'músico errante', 'pesquisador urbano', 'fotógrafo atento', 'mediador de conflitos']
const AMBITIONS = ['proteger o bairro', 'descobrir a verdade', 'reunir a família', 'criar um refúgio', 'construir uma comunidade', 'reparar um erro', 'preservar uma memória', 'conquistar independência']
const DESIRES = ['reencontrar um amigo', 'resolver uma dívida', 'ouvir uma canção', 'visitar um lugar seguro', 'ajudar um vizinho', 'encontrar uma pista', 'evitar uma briga', 'aprender algo novo']
const TENETS = ['proteja quem depende de você', 'cumpra sua palavra', 'não abandone seus amigos', 'respeite os mortos', 'defenda quem não tem voz', 'preserve a arte', 'não destrua por orgulho', 'ajude quem pede abrigo']
const TOUCHSTONES = ['uma professora do bairro', 'um antigo colega', 'uma vizinha solidária', 'um músico de rua', 'uma pessoa da família', 'um voluntário da comunidade', 'uma amiga de infância', 'um livreiro local']
const REVIEW = ' (gerado automaticamente — revise com o Narrador)'
const TYPES = {
  vampire: 'Vampiro', werewolf: 'Lobisomem', hunter: 'Caçador', mortal: 'Mortal', ghoul: 'Carniçal', spc: 'Personagem do Narrador', group: 'Grupo (Coterie)'
}
const CHARACTER_BOOKS = {
  werewolf: { book: 'Lobisomem: O Apocalipse', file: 'lobisomem.json' },
  hunter: { book: 'Caçador: A Revanche', file: 'cacador.json' }
}
const NPC_LEVELS = {
  weak: { label: 'Fraco', attributes: { 1: 7, 2: 2 }, skills: { 1: 5, 2: 3 }, advantages: 0, specialtyCount: 0 },
  common: { label: 'Comum', attributes: { 1: 4, 2: 3, 3: 2 }, skills: { 1: 5, 2: 4, 3: 3 }, advantages: 3, specialtyCount: 0 },
  talented: { label: 'Talentoso', attributes: { 1: 4, 2: 2, 3: 2, 4: 1 }, skills: { 1: 4, 2: 4, 3: 4, 4: 2 }, advantages: 10, specialtyCount: 1, specialtyRating: 4 },
  deadly: { label: 'Mortal', attributes: { 2: 3, 3: 2, 4: 2, 5: 2 }, skills: { 2: 6, 3: 5, 4: 3, 5: 1 }, advantages: 15, specialtyCount: 3 }
}
const PLAYER_FEATURE_FOLDERS = {
  Antecedentes: ['Aliados', 'Contatos', 'Fama', 'Influência', 'Lacaios', 'Recursos', 'Refúgio'],
  Qualidades: ['Linguística', 'Visual', 'Uso de Substâncias']
}
const GHOUL_FEATURE_FOLDERS = {
  Antecedentes: ['Status'], Qualidades: ['Qualidades de Carniçal', 'Defeitos de Carniçal']
}
const SPECIALTIES = {
  athletics: ['Corrida', 'Escalada', 'Natação'], brawl: ['Boxe', 'Agarrões', 'Esquiva'], craft: ['Carpintaria', 'Costura', 'Mecânica'], drive: ['Carros', 'Motos', 'Perseguições'], firearms: ['Pistolas', 'Rifles', 'Tiro de precisão'], larceny: ['Fechaduras', 'Bolsos', 'Alarmes'], melee: ['Facas', 'Espadas', 'Porretes'], stealth: ['Sombras', 'Silêncio', 'Multidões'], survival: ['Rastreamento', 'Abrigo', 'Orientação'],
  animalken: ['Cães', 'Gatos', 'Cavalos'], etiquette: ['Eventos', 'Negócios', 'Corte'], insight: ['Mentiras', 'Emoções', 'Motivações'], intimidation: ['Ameaças', 'Interrogatório', 'Presença'], leadership: ['Equipes', 'Comando', 'Motivação'], performance: ['Canto', 'Teatro', 'Dança'], persuasion: ['Negociação', 'Debate', 'Charme'], streetwise: ['Bairros', 'Contrabando', 'Contatos'], subterfuge: ['Disfarces', 'Mentiras', 'Blefe'],
  academics: ['História', 'Direito', 'Teologia'], awareness: ['Emboscadas', 'Ruídos', 'Detalhes'], finance: ['Investimentos', 'Contabilidade', 'Mercados'], investigation: ['Pistas', 'Arquivos', 'Entrevistas'], medicine: ['Primeiros socorros', 'Cirurgia', 'Diagnóstico'], occult: ['Rituais', 'Folclore', 'Símbolos'], politics: ['Eleições', 'Burocracia', 'Facções'], science: ['Química', 'Biologia', 'Física'], technology: ['Computadores', 'Eletrônica', 'Redes']
}

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

export function randomRatings (groups, quota, pick) {
  const available = Object.values(groups).flat().slice()
  const result = Object.fromEntries(available.map(id => [id, 0]))
  for (const [rating, count] of Object.entries(quota)) {
    for (let n = 0; n < count; n++) {
      const id = pick(available)
      available.splice(available.indexOf(id), 1)
      result[id] = Number(rating)
    }
  }
  return result
}

const flags = doc => doc.flags?.[ID] ?? {}
const allowed = (actor, doc, restrictions = flags(doc).restrictions ?? []) => !checkRestrictions(actor, restrictions).length && !checkConflicts(actor, doc.name, flags(doc).conflictsWith ?? []).length
const copy = doc => { const data = doc.toObject(); delete data._id; delete data.ownership; return data }
const shuffled = (list, pick) => { const pool = [...list]; const out = []; while (pool.length) { const item = pick(pool); pool.splice(pool.indexOf(item), 1); out.push(item) } return out }
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const normalizeSeed = seed => String(seed || `${Date.now()}-${Math.random()}`)
const normalizeLabel = label => label.trim().toLocaleLowerCase('pt-BR')

function checkCreatePermission () {
  if (game.system.id !== 'wod5e') throw new Error('O sistema ativo precisa ser wod5e.')
  if (!game.user.isGM && !game.user.hasPermission('ACTOR_CREATE')) throw new Error('Você não tem permissão para criar Atores.')
}

async function packDocs (suffix) {
  const pack = game.packs.get(`${ID}.${suffix}`)
  if (!pack) throw new Error(`Compêndio ausente: ${suffix}.`)
  return pack.getDocuments()
}

async function sortedPackDocs (suffix) {
  return [...await packDocs(suffix)].sort((a, b) => a.id.localeCompare(b.id, 'en'))
}

async function createActor (type, name) {
  const category = { spc: 'PdNs', group: 'Coteries' }[type] ?? 'PJs'
  const folderName = `${category} — Criação Automática`
  const folder = game.folders.find(f => f.type === 'Actor' && f.name === folderName) ?? await Folder.create({ name: folderName, type: 'Actor' })
  return Actor.create({ name, type, folder: folder.id })
}

async function rollbackActor (actor, error) {
  if (actor) {
    try { await actor.delete() } catch (rollback) { throw new Error(`${error.message} Falha ao excluir o Ator criado: ${rollback.message}`, { cause: error }) }
  }
  throw error
}

function conceptUpdates (pick) {
  return { 'system.headers.concept': pick(CONCEPTS), 'system.headers.ambition': pick(AMBITIONS), 'system.headers.desire': pick(DESIRES) }
}

function touchstoneUpdates (pick) {
  const count = pick([1, 2, 3])
  return {
    'system.headers.tenets': shuffled(TENETS, pick).slice(0, count).map(s => s + REVIEW).join('\n'),
    'system.headers.touchstones': shuffled(TOUCHSTONES, pick).slice(0, count).map(s => s + REVIEW).join('\n')
  }
}

function ratingUpdates (attrs, skills) {
  const updates = {}
  for (const [id, value] of Object.entries(attrs)) updates[`system.attributes.${id}.value`] = value
  for (const [id, value] of Object.entries(skills)) updates[`system.skills.${id}.value`] = value
  return updates
}

async function addFreeSpecialties (actor, skills, pick, { labels = SPECIALTIES, limitByRating = false } = {}) {
  const specialties = {}
  for (const id of REQUIRED_SPECIALTY_SKILLS.filter(id => skills[id] > 0)) specialties[id] = pick(labels[id])
  const skill = pick(Object.keys(skills).filter(id => skills[id] > (limitByRating && id !== 'craft' && specialties[id] ? 1 : 0)))
  const used = new Set([specialties[skill], ...(actor.system.skills?.[skill]?.bonuses ?? []).map(b => b.source)].filter(Boolean).map(normalizeLabel))
  const available = labels[skill].filter(label => !used.has(normalizeLabel(label)))
  if (!available.length) throw new Error(`Não há Especialização livre disponível para ${displayLabel(skill)}.`)
  specialties.free = { skill, label: pick(available) }
  await actor.setFlag(ID, 'freeSpecialties', specialties)
  await applyFreeSpecialties(actor)
  return Object.entries(specialties).map(([skill, label]) => skill === 'free' ? label : { skill, label })
}

function traitLabel (group, key) {
  const i18n = `WOD5E.AttributesList.${key.charAt(0).toUpperCase()}${key.slice(1)}`
  return group === 'attributes' && game.i18n.has(i18n) ? game.i18n.localize(i18n) : displayLabel(key)
}

function traitSummary (actor, group, keys) {
  return keys.filter(key => actor.system[group]?.[key]?.value > 0).map(key => `${traitLabel(group, key)}: ${actor.system[group][key].value}`).join(', ')
}

const specialtySummary = specialties => specialties.map(s => `${displayLabel(s.skill)}: ${s.label}`).join(', ')
const itemSummary = actor => actor.items.map(i => `${i.name}${i.type === 'feature' ? ` (${i.system.points ?? 0})` : ''}`).join(', ')
const whisper = (actor, content) => ChatMessage.create({ whisper: [game.user.id], content: `<h3>${escape(actor.name)}</h3>${content}` })

async function addPick (actor, doc, slot, log) {
  const [item] = await actor.createEmbeddedDocuments('Item', [copy(doc)])
  const pickLabel = slot === 'clan' ? 'Clã' : 'Tipo de Predador'
  await applyTrackedGrants(actor, { slot, pickLabel, name: item.name, sourceLabel: `${pickLabel}: ${item.name}`, grants: slot === 'clan' ? clanCreationGrants(item) : flags(item).grants ?? [] }, log)
}

// Analfabeto limita Erudição e Ciência a 1 e não combina com Linguística.
function illiteracyConflict (actor, doc) {
  const has = name => actor.items.some(i => i.type === 'feature' && i.name === name)
  const skill = id => actor.system.skills?.[id]?.value ?? 0
  if (doc.name === 'Analfabeto') return skill('academics') > 1 || skill('science') > 1 || has('Linguística')
  return doc.name === 'Linguística' && has('Analfabeto')
}

async function buy (actor, docs, kind, budget, pick, log, { isAllowed = allowed, retry = true } = {}) {
  let remaining = budget
  for (let attempt = 0; remaining > 0 && attempt < 200; attempt++) {
    const choices = docs.filter(doc => {
      // Fora do sorteio: pastas de Sangue-Ralo (seção própria), Caitiff de outro clã (bloqueio
      // compartilhado), Coterie (pontos da coterie), Variantes da Perdição e Míticos (regras opcionais).
      if (!kind.includes(doc.system.featuretype) || ['thinBloodMerit', 'thinBloodFlaw', 'coterie', 'baneVariant', 'mythic'].includes(featureCategory(doc))) return false
      const existing = actor.items.find(i => i.type === 'feature' && i.name === doc.name)
      if (!isAllowed(actor, doc) || chargenPurchaseBlock(actor, doc) || illiteracyConflict(actor, doc)) return false
      const current = existing?.system.points ?? 0
      const fixed = Number(doc.system.points) || 0
      const cap = getRatingCap(actor, doc) ?? 5
      const next = fixed || current + 1
      return next > current && next <= cap && next - current <= remaining
    })
    if (!choices.length) break
    const doc = pick(choices)
    const existing = actor.items.find(i => i.type === 'feature' && i.name === doc.name)
    const current = existing?.system.points ?? 0
    const next = Number(doc.system.points) || current + 1
    try {
      if (existing) await existing.update({ 'system.points': next })
      else {
        const data = copy(doc)
        data.system.points = next
        foundry.utils.setProperty(data, `flags.${ID}.grantedPoints`, 0)
        await actor.createEmbeddedDocuments('Item', [data])
      }
      remaining -= next - current
      log.push(`Compra: ${doc.name} (${next} ponto${next === 1 ? '' : 's'})`)
    } catch (error) {
      if (!retry) throw error
      log.push(`Tentativa em ${doc.name} falhou: ${error.message}`)
      docs = docs.filter(item => item !== doc)
    }
  }
  if (remaining) {
    const category = kind.includes('flaw') ? 'Defeitos' : 'Vantagens'
    throw new Error(`Não foi possível gastar ${budget} pontos em ${category}. Restam ${remaining}.`)
  }
}

export async function autoCreateCharacter ({ seed, name } = {}) {
  checkCreatePermission()
  seed = normalizeSeed(seed)
  const pick = seededPicker(seed)
  const log = []
  let actor
  try {
    const [clans, predators, features] = await Promise.all(['clans', 'predatortypes', 'meritsflaws'].map(packDocs))
    actor = await createActor('vampire', name?.trim() || pick(NAMES))
    await withAutoPicker(actor, pick, async () => {
      const clan = pick(clans)
      await addPick(actor, clan, 'clan', log)
      const thin = getClanKey(clan) === 'thin-blooded'
      const generation = pick(thin ? ['14th', '15th', '16th'] : ['12th', '13th'])
      const attrs = randomRatings(ATTRIBUTE_GROUPS, ATTRIBUTE_RATING_QUOTA, pick)
      const distribution = pick(Object.keys(SKILL_DISTRIBUTIONS))
      const skills = randomRatings(SKILL_GROUPS, SKILL_DISTRIBUTIONS[distribution].quota, pick)
      const updates = {
        'system.headers.generation': generation, 'system.blood.generation': generation,
        'system.blood.potency': GENERATION_INFO[generation].bp, 'system.bio.dateof.death': GENERATION_INFO[generation].era,
        ...conceptUpdates(pick),
        'system.headers.sire': pick(['desconhecido', ...NAMES]),
        [`flags.${ID}.skillDistribution`]: distribution, [`flags.${ID}.attributesInitialized`]: true
      }
      await actor.update({ ...updates, ...ratingUpdates(attrs, skills), ...touchstoneUpdates(pick) })
      const candidates = predators.filter(p => allowed(actor, p))
      await addPick(actor, pick(candidates), 'predator', log)
      await addFreeSpecialties(actor, skills, pick)
      if (thin) {
        const count = pick([1, 2, 3])
        for (const category of ['Merits', 'Flaws']) {
          const candidates = shuffled(features.filter(d => featureCategory(d) === (category === 'Merits' ? 'thinBloodMerit' : 'thinBloodFlaw')), pick)
          let taken = 0
          for (const doc of candidates) {
            if (taken >= count) break
            if (!allowed(actor, doc) || actor.items.some(i => i.type === 'feature' && i.name === doc.name)) continue
            try { const data = copy(doc); data.system.points = 0; await actor.createEmbeddedDocuments('Item', [data]); taken++; log.push(`Sangue-Ralo: ${doc.name}`) } catch (error) { log.push(`Tentativa em ${doc.name} falhou: ${error.message}`) }
          }
          if (taken !== count) throw new Error(`Não foi possível escolher ${count} itens de Sangue-Ralo: ${category}.`)
        }
      }
      await buy(actor, features, ['flaw'], 2, pick, log)
      await buy(actor, features, ['merit', 'background'], 7 + extraAdvantagePoints(), pick, log)
      const failures = new ChargenApp(actor).auditAllSteps(features)
      if (failures.length) throw new Error(`Auditoria incompleta: ${failures.join(' | ')}`)
      await applyDerivedTrackers(actor)
      await actor.setFlag(ID, 'wizardCompleted', true)
      await actor.setFlag(ID, 'autoGenerated', { version: 1, seed, timestamp: new Date().toISOString(), log })
      const formatLog = value => escape(value).replace(/&lt;(\/?)b&gt;/g, '<$1b>')
      const disciplines = Object.entries(actor.system.disciplines ?? {}).filter(([, v]) => v.value).map(([k, v]) => `${displayLabel(k)}: ${v.value}`).join(', ') || 'nenhuma'
      const specialties = specialtySummary(flags(actor).appliedFreeSpecialties ?? [])
      await whisper(actor, `<p>Clã: ${escape(clan.name)}; geração: ${escape(generation.replace(/(?:st|nd|rd|th)$/, 'ª'))}; semente: ${escape(seed)}</p><p>Atributos: ${escape(traitSummary(actor, 'attributes', Object.keys(attrs)))}</p><p>Habilidades: ${escape(traitSummary(actor, 'skills', Object.keys(skills)))}</p><p>Especializações: ${escape(specialties)}</p><p>Disciplinas: ${escape(disciplines)}</p><p>Itens, predador e poderes: ${escape(itemSummary(actor))}</p><p>${log.map(formatLog).join('<br>')}</p>`)
    })
    return { actor, seed, log }
  } catch (error) {
    await rollbackActor(actor, error)
  }
}

function isPermittedFeature (doc, type) {
  if (doc.type !== 'feature') return false
  const folder = doc.folder?.name
  const parent = doc.folder?.folder?.name
  const belongsTo = folders => Object.hasOwn(folders, parent) && folders[parent].includes(folder)
  return belongsTo(PLAYER_FEATURE_FOLDERS) || (type === 'ghoul' && belongsTo(GHOUL_FEATURE_FOLDERS))
}

async function addNpcSpecialties (actor, skills, level, pick) {
  const available = Object.keys(skills).filter(id => skills[id] > 0 && (!level.specialtyRating || skills[id] === level.specialtyRating))
  const specialties = []
  const labels = new Set()
  const updates = {}
  for (let n = 0; n < level.specialtyCount; n++) {
    const skill = pick(available)
    available.splice(available.indexOf(skill), 1)
    const label = pick(SPECIALTIES[skill].filter(label => !labels.has(normalizeLabel(label))))
    labels.add(normalizeLabel(label))
    const bonuses = actor.system.skills[skill].bonuses ?? []
    updates[`system.skills.${skill}.bonuses`] = [...bonuses, { source: label, value: 1, paths: [`skills.${skill}`], displayWhenInactive: true }]
    specialties.push({ skill, label })
  }
  if (specialties.length) await actor.update(updates)
  return specialties
}

const disciplineId = id => id === 'bloodsorcery' ? 'sorcery' : id

async function addGhoulPower (actor, pick) {
  const [clans, powers] = await Promise.all(['clans', 'disciplines'].map(sortedPackDocs))
  const domitor = pick(clans.filter(doc => doc.type === 'clan' && !['thin-blooded', 'thin-blood', 'sangue-ralo', 'caitiff'].includes(getClanKey(doc))))
  const grants = clanCreationGrants(domitor).filter(grant => grant.type === 'clanDisciplines' || grant.type === 'disciplineDot')
  const choices = grants.flatMap(grant => (grant.choices ?? []).map(choice => disciplineId(typeof choice === 'string' ? choice : choice.discipline)))
  const discipline = pick([...new Set(choices.filter(Boolean))])
  const power = pick(powers.filter(doc => doc.type === 'power' && disciplineId(doc.system.discipline) === discipline && Number(doc.system.level) === 1))
  const data = copy(power)
  data.system.discipline = discipline
  await actor.createEmbeddedDocuments('Item', [data])
  await actor.update({ [`system.disciplines.${discipline}.value`]: 1, 'system.headers.domitor': `domitor ${domitor.name}${REVIEW}` })
  return discipline
}

function verify (condition, message) {
  if (!condition) throw new Error(`Auditoria incompleta: ${message}.`)
}

function auditRatings (system, attrs, skills) {
  for (const [group, ratings] of Object.entries({ attributes: attrs, skills })) {
    verify(Object.entries(ratings).every(([id, value]) => system[group]?.[id]?.value === value),
      group === 'attributes' ? 'cota de Atributos incorreta' : 'cota de Habilidades incorreta')
  }
  const health = attrs.stamina + 3
  const willpower = attrs.composure + attrs.resolve
  verify(system.health?.value === health && system.health?.max === health, 'Vitalidade incorreta')
  verify(system.willpower?.value === willpower && system.willpower?.max === willpower, 'Força de Vontade incorreta')
}

function auditSpecialties (system, skills, specialties) {
  const bonuses = Object.keys(skills).flatMap(skill => (system.skills[skill].bonuses ?? [])
    .filter(b => b.value === 1 && b.displayWhenInactive === true && b.paths?.length === 1 && b.paths[0] === `skills.${skill}`)
    .map(b => ({ skill, label: b.source })))
  verify(bonuses.length === specialties.length && specialties.every(({ skill, label }) =>
    skills[skill] > 0 && bonuses.filter(b => b.skill === skill && b.label === label).length === 1), 'Especializações incorretas')
}

function auditMortalSheet (actor, { attrs, skills, permitted, advantages, flaws, specialties, discipline }) {
  const system = actor._source?.system ?? actor.system
  auditRatings(system, attrs, skills)
  const features = actor.items.filter(item => item.type === 'feature')
  const totals = { merit: 0, background: 0, flaw: 0 }
  for (const item of features) {
    const { featuretype, points } = item.system
    verify(Object.hasOwn(totals, featuretype) && permitted.some(doc => doc.name === item.name && doc.system.featuretype === featuretype) &&
      Number.isInteger(points) && points > 0, `Vantagem ou Defeito fora da lista permitida (${item.name})`)
    totals[featuretype] += points
  }
  verify(totals.merit + totals.background === advantages && totals.flaw === flaws, 'orçamento de Vantagens ou Defeitos incorreto')
  auditSpecialties(system, skills, specialties)

  if (actor.type === 'spc') {
    verify(system.spcType === 'mortal' && system.settings?.skillAttributeInputs === true, 'configuração da ficha de Personagem do Narrador incorreta')
  } else {
    verify(system.humanity?.value === 7, 'Humanidade incorreta')
    const convictions = system.headers.tenets?.split('\n') ?? []
    const touchstones = system.headers.touchstones?.split('\n') ?? []
    verify(convictions.length >= 1 && convictions.length <= 3 && touchstones.length === convictions.length &&
      [...convictions, ...touchstones].every(line => line.endsWith(REVIEW)), 'Convicções ou Pilares incorretos')
  }
  // Poderes passivos (ex.: Resiliência) ganham uma Condição criada pela automação do módulo.
  verify([...actor.items].every(item => ['feature', 'power', 'condition'].includes(item.type)), 'Item de ficha incompatível')
  const powers = actor.items.filter(item => item.type === 'power')
  const rated = Object.entries(system.disciplines ?? {}).filter(([, data]) => data.value)
  if (discipline) {
    verify(powers.length === 1 && powers[0].system.discipline === discipline && Number(powers[0].system.level) === 1 &&
      rated.length === 1 && rated[0][0] === discipline && rated[0][1].value === 1 && system.headers.domitor?.endsWith(REVIEW), 'poder, Disciplina ou domitor incorreto')
  } else {
    verify(powers.length === 0 && rated.length === 0, 'poder ou Disciplina incompatível')
  }
}

async function buildMortalSheet (actor, level, pick, log) {
  const npc = actor.type === 'spc'
  const ghoul = actor.type === 'ghoul'
  const distribution = npc ? null : pick(Object.keys(SKILL_DISTRIBUTIONS))
  const attrs = randomRatings(ATTRIBUTE_GROUPS, npc ? level.attributes : ATTRIBUTE_RATING_QUOTA, pick)
  const skills = randomRatings(SKILL_GROUPS, npc ? level.skills : SKILL_DISTRIBUTIONS[distribution].quota, pick)
  const updates = npc
    ? { 'system.spcType': 'mortal', 'system.settings.skillAttributeInputs': true }
    : { ...conceptUpdates(pick), ...touchstoneUpdates(pick), 'system.humanity.value': 7, [`flags.${ID}.skillDistribution`]: distribution }
  await actor.update({ ...updates, ...ratingUpdates(attrs, skills) })
  const specialties = npc ? await addNpcSpecialties(actor, skills, level, pick) : await addFreeSpecialties(actor, skills, pick)
  const discipline = ghoul ? await addGhoulPower(actor, pick) : null
  const advantages = npc ? level.advantages : 7
  const flaws = npc ? 0 : 2
  const permitted = advantages || flaws ? (await sortedPackDocs('meritsflaws')).filter(doc => isPermittedFeature(doc, actor.type)) : []
  const purchaseOptions = {
    // O motor do assistente rejeita ghoulOnly para Vampiros. Aqui, Carniçais podem comprar esses itens.
    isAllowed: ghoul ? (actor, doc) => allowed(actor, doc, (flags(doc).restrictions ?? []).filter(rule => rule.type !== 'ghoulOnly')) : allowed,
    retry: false
  }
  await buy(actor, permitted, ['flaw'], flaws, pick, log, purchaseOptions)
  await buy(actor, permitted, ['merit', 'background'], advantages, pick, log, purchaseOptions)
  await applyDerivedTrackers(actor)
  auditMortalSheet(actor, { attrs, skills, permitted, advantages, flaws, specialties, discipline })

  const type = npc ? `${TYPES.spc} (${level.label})` : TYPES[actor.type]
  const details = [
    `Tipo de ficha: ${type}`,
    `Atributos: ${traitSummary(actor, 'attributes', Object.keys(attrs))}`,
    `Habilidades: ${traitSummary(actor, 'skills', Object.keys(skills))}`,
    `Especializações: ${specialtySummary(specialties) || 'nenhuma'}`,
    `Vitalidade: ${actor.system.health.max}; Força de Vontade: ${actor.system.willpower.max}`,
    `Vantagens: ${advantages}; Defeitos: ${flaws}`
  ]
  if (!npc) details.push(`Conceito: ${actor.system.headers.concept}; Ambição: ${actor.system.headers.ambition}; Desejo: ${actor.system.headers.desire}`, `Humanidade: ${actor.system.humanity.value}`)
  if (ghoul) details.push(`Domitor: ${actor.system.headers.domitor}; Disciplina: ${displayLabel(discipline)} (1)`)
  if (actor.items.size || actor.items.length) details.push(`Itens: ${itemSummary(actor)}`)
  return paragraphs(details)
}

const RENOWN = { glory: 'Glória', honor: 'Honra', wisdom: 'Sabedoria' }
const ILLITERATE_SPECIALTIES = {
  ...SPECIALTIES, academics: ['História oral', 'Tradições locais'], science: ['Fases da Lua', 'Estações do ano']
}
const BASE_ADDONS = ['Arsenal Oculto', 'Sala do Pânico', 'Vigilância', 'Laboratório', 'Luxo', 'Poterna', 'Sistema de Segurança', 'Sala de Operações']
const BASE_FLAWS = ['Comprometida', 'Assustadora', 'Assombrada']
const FEATURE_PREREQUISITES = {
  Zerado: ['Máscara', 2], Sapateiro: ['Máscara', 2],
  Acompanhante: ['Pacto Espiritual', 1], Hospedeiro: ['Pacto Espiritual', 1], 'Pacto Condicional': ['Pacto Espiritual', 1],
  ...Object.fromEntries([...BASE_ADDONS, ...BASE_FLAWS].map(name =>
    [name, ['Base', ['Sala do Pânico', 'Laboratório', 'Sala de Operações'].includes(name) ? 2 : 1]]))
}
const FEATURE_EXCLUSIONS = [
  ['Vício Incurável', 'Dependência Grave', 'Dependência'],
  ['Belo', 'Deslumbrante', 'Repulsivo', 'Feio'],
  ['Emprego', 'Emprego Confirmado'], ['Cozinha Para Um', 'Chef da Célula'],
  ['Analfabeto', 'Linguística'], ['Recursos', 'Indigente', 'Destituído'],
  ['Fama', 'Infâmia'],
  ['Acesso a Caern', 'Pária de Caern'], ['Status', 'Suspeito', 'Segregado'],
  ['Influência', 'Desprezado', 'Malquisto']
]
const FEATURE_DETAILS = {
  'Vício Incurável': 'álcool',
  'Dependência Grave': 'álcool',
  Dependência: 'álcool',
  'Perdição Folclórica': 'água benta',
  'Tabu Folclórico': 'ser chamado três vezes seguidas pelo nome anterior à Primeira Transformação',
  'Sinal Folclórico': 'sombra de lobo na forma hominídea e sombra humana na forma lupina'
}

async function loadCharacterBook (file) {
  const response = await fetch(new URL('../data/' + file, import.meta.url))
  if (!response.ok) throw new Error('Não foi possível carregar os dados de criação de ' + file + '.')
  return response.json()
}

function bookItem (book, type, { name, page, description }, fields = {}) {
  const source = { book, page: String(page) }
  if (type === 'gift' && description) {
    // Os campos numéricos de custo da ficha saem do "Custo:" do livro (ex.: "1 checagem de Fúria").
    const cost = description.replace(/<[^>]+>/g, '').match(/Custo:\s*([^\n]*?)(?:Ação:|$)/)?.[1] ?? ''
    fields = { ...fields, cost: Number(cost.match(/(\d+) checagem de Fúria/)?.[1] ?? 0), willpowercost: Number(cost.match(/(\d+) de Força de Vontade/)?.[1] ?? 0) }
  }
  return { type, name, system: { ...fields, source, description: description || `<p>Ver ${book}, p. ${page}. Texto a incluir.</p>` } }
}

function bookFeatureAllowed (feature, selected, skills) {
  const { name, page } = feature
  // A Maldição altera a trilha inicial exigida para estas fichas.
  if (name === 'Maldição da Anciã') return false
  if (name === 'Analfabeto' && (skills.academics > 1 || skills.science > 1)) return false
  // Fichas de Conhecimento (Lobisomem, pp. 294–299) dependem do Narrador; o Vampiro também não sorteia Folhas de História.
  if (page >= 294) return false
  if (FEATURE_EXCLUSIONS.some(group => group.includes(name) && selected.some(other => group.includes(other.name)))) return false
  const withoutBase = ['Sem Base', 'Indigente']
  const baseFeatures = ['Base', ...BASE_ADDONS, ...BASE_FLAWS]
  if (withoutBase.includes(name) && selected.some(other => baseFeatures.includes(other.name))) return false
  if (baseFeatures.includes(name) && selected.some(other => withoutBase.includes(other.name))) return false
  return !selected.some(other => other.name === name)
}

function completeBookBudget (options, selected, remaining, skills, pick, checkPrerequisites) {
  if (remaining === 0) return selected
  const choices = options.filter(choice => choice.cost <= remaining && bookFeatureAllowed(choice, selected, skills) &&
    (!checkPrerequisites || hasFeaturePrerequisite(choice, selected)))
  while (choices.length) {
    const choice = pick(choices)
    const result = completeBookBudget(options, [...selected, choice], remaining - choice.cost, skills, pick, checkPrerequisites)
    if (result) return result
    choices.splice(choices.indexOf(choice), 1)
  }
}

function hasFeaturePrerequisite (feature, selected) {
  const requirement = FEATURE_PREREQUISITES[feature.name]
  return !requirement || selected.some(other => other.name === requirement[0] && other.cost >= requirement[1])
}

function chooseBookFeatures (catalog, skills, pick) {
  const options = catalog.flatMap(feature => feature.points.map(cost => ({ ...feature, cost })))
  const flaws = completeBookBudget(options.filter(feature => feature.featuretype === 'flaw'), [], 2, skills, pick, false)
  verify(flaws, 'orçamento de Defeitos indisponível')
  const required = []
  for (const flaw of flaws) {
    if (hasFeaturePrerequisite(flaw, required)) continue
    const [name, minimum] = FEATURE_PREREQUISITES[flaw.name]
    const old = required.findIndex(feature => feature.name === name)
    const candidates = options.filter(choice => choice.name === name && choice.cost >= minimum &&
      bookFeatureAllowed(choice, flaws, skills))
    const prerequisite = pick(candidates)
    if (old >= 0) required[old] = prerequisite
    else required.push(prerequisite)
  }
  const selected = completeBookBudget(options.filter(feature => feature.featuretype !== 'flaw'),
    [...flaws, ...required], 7 - tally(required.map(feature => feature.cost)), skills, pick, true)
  verify(selected, 'orçamento de Vantagens indisponível')
  return selected
}

function noteBookFeature ({ name, cost, points, restrictions }, pick) {
  const details = []
  if (name === 'Aliados') {
    const effectiveness = pick([1, 2, 3, 4].filter(value => cost - value >= 0 && cost - value <= 3))
    details.push(`Efetividade ${effectiveness}, Confiabilidade ${cost - effectiveness}`)
  }
  if (name === 'Linguística') details.push(shuffled(['inglês', 'espanhol', 'francês', 'italiano', 'alemão', 'japonês'], pick).slice(0, cost).join(', '))
  if (FEATURE_DETAILS[name]) details.push(FEATURE_DETAILS[name])
  if (name === 'Estigma') details.push(pick(['Vitalidade', 'Força de Vontade']))
  if (name === 'Apito para Vento' || name === 'Klaive' || name === 'Pele de Símio') details.push(cost === points[0] ? 'tálen' : 'talismã')
  if (name === 'Umbrestilha') details.push(cost === 1 ? 'para um garou' : 'para a alcateia')
  if (name === 'Apanhador de Espíritos') details.push(`valor ${cost}, para qualquer espírito`)
  if (!details.length && restrictions) details.push(restrictions)
  return `${name} (${cost})${details.length ? ' — ' + details.join('. ') : ''}`
}

async function buildWerewolf (actor, catalog, book, pick) {
  const tribe = pick(catalog.tribes)
  const auspice = pick(catalog.auspices)
  const other = pick(Object.keys(RENOWN).filter(key => key !== tribe.renown))
  const renown = Object.fromEntries(Object.keys(RENOWN).map(key => [key, { value: key === tribe.renown ? 2 : Number(key === other) }]))
  const gifts = []
  const categories = ['native', auspice.id, tribe.id]
  for (const category of categories) {
    gifts.push(pick(catalog.gifts.filter(gift => gift.category === category && gift.level <= 3 &&
      renown[gift.renown].value > 0 && !gifts.some(previous => previous.name === gift.name))))
  }
  const rite = pick(catalog.rites)
  await actor.createEmbeddedDocuments('Item', [
    bookItem(book, 'tribe', tribe, { patronSpirit: { name: tribe.patronSpirit } }),
    bookItem(book, 'auspice', auspice),
    ...gifts.map(gift => bookItem(book, 'gift', gift, { giftType: gift.category, renown: gift.renown, level: gift.level })),
    bookItem(book, 'gift', rite, { giftType: 'rite', renown: '', level: 0 })
  ])
  await actor.update({
    'system.renown': renown, 'system.rage.value': 2, 'system.balance.harano.value': 0, 'system.balance.hauglosk.value': 0,
    ...Object.fromEntries([...categories, 'rite'].map(category => [`system.gifts.${category}.visible`, true]))
  })
  return [
    `Tribo: ${tribe.name} (${tribe.patronSpirit})`, `Augúrio: ${auspice.name}`,
    `Renome: ${Object.entries(RENOWN).map(([key, label]) => `${label} ${renown[key].value}`).join(', ')}`,
    'Fúria 2, Harano 0, Hauglosk 0',
    `Dons (Inato, Augúrio e Tribo): ${gifts.map(gift => gift.name).join(', ')}`, `Ritual: ${rite.name}`
  ]
}

async function buildHunter (actor, catalog, book, pick) {
  const creed = pick(catalog.creeds)
  const drive = pick(catalog.drives)
  const first = pick(catalog.edges)
  const twoEdges = pick([true, false])
  const edges = twoEdges ? [first, pick(catalog.edges.filter(edge => edge.id !== first.id))] : [first]
  const perks = twoEdges ? [] : shuffled(first.perks, pick).slice(0, 2)
  const edgeItems = edges.map(edge => bookItem(book, 'edgepool', edge, { edge: edge.id }))
  await actor.createEmbeddedDocuments('Item', [
    bookItem(book, 'creed', creed), bookItem(book, 'drive', drive),
    ...edgeItems, ...perks.map(perk => bookItem(book, 'perk', perk, { edge: first.id }))
  ])
  const updates = { 'system.selectedEdge': first.id }
  for (const item of edgeItems) {
    const key = 'system.edges.' + item.system.edge
    updates[key + '.visible'] = true
    updates[key + '.description'] = item.system.description
    updates[key + '.selected'] = item.system.edge === first.id
  }
  await actor.update(updates)
  return [
    `Credo: ${creed.name}`, `Ímpeto: ${drive.name}`,
    `Trunfos: ${edges.map(edge => edge.name).join(', ')}`,
    ...(perks.length ? [`Distinções: ${perks.map(perk => perk.name).join(', ')}`] : []),
    'Desespero e Perigo são trilhas da célula. Defina os valores com o Narrador (p. 125).'
  ]
}

function auditWerewolf (system, items, catalog) {
  const tribes = items.filter(item => item.type === 'tribe')
  const auspices = items.filter(item => item.type === 'auspice')
  const tribe = catalog.tribes.find(entry => entry.name === tribes[0]?.name)
  const auspice = catalog.auspices.find(entry => entry.name === auspices[0]?.name)
  verify(tribes.length === 1 && tribe && tribes[0].system.patronSpirit?.name === tribe.patronSpirit, 'Tribo ou Espírito Padroeiro incorreto')
  verify(auspices.length === 1 && auspice, 'Augúrio incorreto')
  const other = Object.keys(RENOWN).filter(key => key !== tribe.renown).map(key => system.renown?.[key]?.value)
  verify(system.renown?.[tribe.renown]?.value === 2 && other.includes(1) && other.includes(0), 'Renome inicial incorreto')
  const gifts = items.filter(item => item.type === 'gift')
  const categories = ['native', auspice.id, tribe.id]
  verify(gifts.length === 4 && new Set(gifts.map(item => item.name)).size === 4 && categories.every(category =>
    gifts.filter(item => item.system.giftType === category && catalog.gifts.some(gift =>
      gift.category === category && gift.name === item.name && gift.level === item.system.level && gift.level <= 3 &&
      gift.renown === item.system.renown && system.renown[gift.renown].value > 0)).length === 1), 'Dons iniciais incorretos')
  verify(gifts.filter(item => item.system.giftType === 'rite' && catalog.rites.some(rite => rite.name === item.name)).length === 1, 'Ritual inicial incorreto')
  verify([...categories, 'rite'].every(category => system.gifts?.[category]?.visible === true), 'Dons ou Ritual ausentes da ficha')
  verify(system.rage?.value === 2 && system.balance?.harano?.value === 0 && system.balance?.hauglosk?.value === 0, 'Fúria, Harano ou Hauglosk incorreto')
}

function auditHunter (system, items, catalog) {
  for (const [type, entries, label] of [['creed', catalog.creeds, 'Credo'], ['drive', catalog.drives, 'Ímpeto']]) {
    const matches = items.filter(item => item.type === type)
    verify(matches.length === 1 && entries.some(entry => entry.name === matches[0].name), `${label} incorreto`)
  }
  const edges = items.filter(item => item.type === 'edgepool')
  const perks = items.filter(item => item.type === 'perk')
  const visible = Object.entries(system.edges ?? {}).filter(([, edge]) => edge.visible).map(([id]) => id)
  verify((edges.length === 2 && perks.length === 0) || (edges.length === 1 && perks.length === 2), 'quantidade de Trunfos ou Distinções incorreta')
  verify(visible.length === edges.length && visible.includes(system.selectedEdge) && new Set(edges.map(item => item.system.edge)).size === edges.length &&
    edges.every(item => visible.includes(item.system.edge) && catalog.edges.some(edge =>
      edge.id === item.system.edge && edge.name === item.name)), 'Trunfos incorretos')
  verify(new Set(perks.map(item => item.name)).size === perks.length && perks.every(item =>
    item.system.edge === edges[0].system.edge && catalog.edges.find(edge => edge.id === item.system.edge)
      .perks.some(perk => perk.name === item.name)), 'Distinções incorretas')
}

async function buildBookSheet (actor, { book, file }, pick, log) {
  const catalog = await loadCharacterBook(file)
  const werewolf = actor.type === 'werewolf'
  const distribution = pick(Object.keys(SKILL_DISTRIBUTIONS))
  const attrs = randomRatings(ATTRIBUTE_GROUPS, ATTRIBUTE_RATING_QUOTA, pick)
  const skills = randomRatings(SKILL_GROUPS, SKILL_DISTRIBUTIONS[distribution].quota, pick)
  const concepts = werewolf ? { 'system.headers.concept': pick(CONCEPTS) } : conceptUpdates(pick)
  const pillars = shuffled(TOUCHSTONES, pick).slice(0, pick([1, 2, 3])).map(person => person + REVIEW)
  await actor.update({
    ...concepts, ...ratingUpdates(attrs, skills),
    'system.headers.touchstones': paragraphs(pillars), [`flags.${ID}.skillDistribution`]: distribution
  })

  const features = chooseBookFeatures(catalog.features, skills, pick)
  for (const flaw of [true, false]) {
    const entries = features.filter(feature => (feature.featuretype === 'flaw') === flaw)
    await actor.createEmbeddedDocuments('Item', entries.map(feature =>
      bookItem(book, 'feature', feature, { featuretype: feature.featuretype, points: feature.cost })))
    log.push(...entries.map(feature => noteBookFeature(feature, pick)))
  }
  const illiterate = features.some(feature => feature.name === 'Analfabeto')
  const specialties = await addFreeSpecialties(actor, skills, pick, {
    labels: illiterate ? ILLITERATE_SPECIALTIES : SPECIALTIES, limitByRating: true
  })
  const details = werewolf ? await buildWerewolf(actor, catalog, book, pick) : await buildHunter(actor, catalog, book, pick)
  await applyDerivedTrackers(actor)

  const system = actor._source?.system ?? actor.system
  auditRatings(system, attrs, skills)
  auditSpecialties(system, skills, specialties)
  verify(system.headers?.touchstones === paragraphs(pillars), 'Pilares incorretos')
  const items = [...actor.items]
  const allowedTypes = werewolf ? ['tribe', 'auspice', 'gift'] : ['creed', 'drive', 'edgepool', 'perk']
  verify(items.every(item => [...allowedTypes, 'feature', 'condition'].includes(item.type)), 'Item de ficha incompatível')
  const embeddedFeatures = items.filter(item => item.type === 'feature')
  verify(embeddedFeatures.length === features.length && features.every(feature =>
    embeddedFeatures.filter(item => item.name === feature.name && item.system.featuretype === feature.featuretype &&
      item.system.points === feature.cost).length === 1), 'Vantagens ou Defeitos incorretos')
  const flaws = embeddedFeatures.filter(item => item.system.featuretype === 'flaw')
  verify(tally(flaws.map(item => item.system.points)) === 2 &&
    tally(embeddedFeatures.map(item => item.system.points)) === 9, 'orçamento de Vantagens ou Defeitos incorreto')
  if (werewolf) auditWerewolf(system, items, catalog)
  else auditHunter(system, items, catalog)

  return paragraphs([
    `Tipo de ficha: ${TYPES[actor.type]}`, `Conceito: ${system.headers.concept}`,
    ...(werewolf ? [] : [`Ambição: ${system.headers.ambition}`, `Desejo: ${system.headers.desire}`]),
    `Pilares: ${pillars.join(', ')}`, ...details,
    `Atributos: ${traitSummary(actor, 'attributes', Object.keys(attrs))}`,
    `Habilidades: ${traitSummary(actor, 'skills', Object.keys(skills))}`,
    `Especializações: ${specialtySummary(specialties)}`,
    `Vitalidade ${system.health.max} e Força de Vontade ${system.willpower.max}`,
    'Vantagens: 7 pontos. Defeitos: 2 pontos.',
    ...log
  ])
}

const DOMAIN = ['chasse', 'lien', 'portillon']
// Tipo, conceito e objetivos (Diário Tipos de Coterie), Domínio, Antecedentes e Defeitos.
const COTERIES = [
  ['Culto de Sangue', 'Deuses sedentos', 'Conduzir um culto humano, praticar magia do sangue e levar os cultistas ao poder.', [0, 1, 2], { Rebanho: 3 }, { Suspeito: 1 }],
  ['Cérbero', 'Cães acorrentados', 'Proteger um local valioso, descobrir seus segredos e negociar acesso.', [1, 0, 3], { Refúgio: 2 }],
  ['Campeões', 'Heróis locais', 'Defender o Domínio, combater o crime e preservar a esperança e a Humanidade.', [1, 3, 0], { Aliados: 1 }, { Inimigos: 2 }],
  ['Comando', 'Equipe de operações especiais', 'Cumprir missões para um patrono e manter a equipe coesa.', [1, 0, 2], { Mawla: 3, Status: 1 }, { Inimigos: 2 }],
  ['Corporativo', 'Empresa limitada', 'Administrar negócios, ampliar lucros e ganhar influência entre os mortais.', [1, 2, 0], { Influência: 2, Recursos: 3 }],
  ['Vigília Diurna', 'Soldados do sol', 'Proteger os mortos-vivos adormecidos e vigiar a cidade durante o dia.', [1, 0, 2], { Influência: 2 }, { Inimigos: 3 }],
  ['Enviados', 'Mantenedores da paz', 'Mediar conflitos, formar alianças e identificar ameaças comuns.', [1, 3, 0], { Contatos: 3, Recursos: 2 }, { Suspeito: 1 }],
  ['Família', 'Relações de sangue', 'Preservar a linhagem e negociar alianças com outras famílias.', [1, 1, 3], { Aliados: 1, Contatos: 2, Recursos: 2 }, { Inimigos: 2 }],
  ['Gangue de Presas', 'Equipe criminosa', 'Agir em conjunto e defender o território dos rivais.', [1, 1, 1], { Contatos: 1 }, { Inimigos: 2 }],
  ['Fugitivos', 'Em fuga', 'Permanecer em movimento e limpar o próprio nome.', [0, 0, 0], { Contatos: 3, Máscara: 2, Lacaios: 1 }, { Perseguidor: 1 }],
  ['Porteiros', 'Turnos de cemitério', 'Vigiar o Véu, lidar com fantasmas e proteger sepulturas.', [2, 1, 1], { Contatos: 2, Lacaios: 3 }, { Infâmia: 1 }],
  ['Grupo de Caça', 'Corretores de sangue', 'Encontrar e proteger fontes de sangue e negociar com compradores.', [3, 0, 0], { 'Aliados ou Mawla': 1 }],
  ['Maréchal', 'Administração da cidade', 'Proteger o governante da cidade e cumprir suas ordens.', [2, 0, 2], { Status: 3 }],
  ['Nômades', 'Festa itinerante', 'Viajar, seguir com o espetáculo e talvez encontrar um lar.', [0, 0, 0], { Contatos: 3, Lacaios: 2 }, { Suspeito: 1 }],
  ['Plumário', 'Pássaros da mesma plumagem', 'Cultivar um interesse comum, descobrir talentos e ofuscar os rivais.', [2, 2, 0], { Contatos: 3 }],
  ['Questari', 'Investigadores do horror', 'Pesquisar rumores, reunir material e organizar expedições.', [1, 3, 0], { Contatos: 2 }],
  ['Regência', 'Representantes do poder', 'Fortalecer a posição da cidade e administrar facções em nome de um ancião.', [2, 0, 3], { Mawla: 2, Status: 3 }],
  ['Sabotadores', 'Inimigos clandestinos', 'Permanecer ocultos e enfraquecer os adversários políticos.', [0, 0, 0], { Contatos: 2, Influência: 1, Mawla: 2, Máscara: 1, Recursos: 2 }, { Adversário: 2 }],
  ['Sbirri', 'Falsa bandeira', 'Manter o disfarce, recolher informações e administrar uma rede de espiões.', [0, 0, 0], { Mawla: 2, Máscara: 1 }],
  ['Vehme', 'Polícia secreta', 'Proteger a Máscara e levar seus infratores a julgamento.', [1, 0, 0], { Influência: 3, Status: 3 }],
  ['Vigilantes', 'Guardiões cívicos', 'Patrulhar o Domínio, ampliar a influência da seita e enfrentar seus oponentes.', [1, 2, 1], { Status: 2 }]
]
const COTERIE_ITEM_ALIASES = {
  Aliados: ['Aliados (Efetividade)'], Refúgio: ['Refúgio Base'], Inimigos: ['Inimigo'],
  Perseguidor: ['Perseguidores'], Contatos: ['Contato'], Lacaios: ['Lacaio']
}
const tally = numbers => numbers.reduce((sum, n) => sum + n, 0)
const paragraphs = lines => lines.map(line => `<p>${escape(line)}</p>`).join('')
const domainSummary = values => DOMAIN.map((key, i) => `${key[0].toUpperCase()}${key.slice(1)} ${values[i]}`).join(', ')
const pointLabel = count => `${count} ${count === 1 ? 'ponto' : 'pontos'}`

async function buildCoterie (actor, selected, players, pick, log) {
  const [type, concept, objectives, minimum, backgrounds, flaws = {}] = selected
  const requirements = Object.entries({ background: backgrounds, flaw: flaws }).flatMap(([featuretype, features]) =>
    Object.entries(features).map(([options, points]) => {
      const names = options.split(' ou ')
      return { name: names.length === 1 ? names[0] : pick(names), points, featuretype }
    }))
  const cost = tally(minimum) + tally(requirements.map(req => req.featuretype === 'flaw' ? -req.points : req.points))
  const pending = Math.max(cost - players, 0)
  const domain = [...minimum]
  for (let spare = players - cost; spare > 0; spare--) {
    domain[pick(DOMAIN.map((_, index) => index).filter(index => domain[index] < 5))]++
  }
  const docs = (await sortedPackDocs('meritsflaws')).filter(doc => doc.type === 'feature')
  const items = requirements.map(({ name, points, featuretype }) => {
    const candidates = docs.filter(doc => doc.system.featuretype === featuretype)
    const doc = [name, ...(COTERIE_ITEM_ALIASES[name] ?? [])]
      .map(normalizeLabel).map(label => candidates.find(candidate => normalizeLabel(candidate.name) === label)).find(Boolean)
    const data = doc ? copy(doc) : { name, type: 'feature', system: { description: 'Criado automaticamente — complete com o Narrador.' } }
    Object.assign(data.system, { featuretype, points })
    return data
  })
  const requirementsList = requirements.map(({ name, points, featuretype }) => `${name} ${featuretype === 'flaw' ? `(${points})` : points}`).join(', ')
  const details = [
    `Tipo de coterie: ${type}`, `Conceito: ${concept}`, `Objetivos: ${objectives}`,
    `Pré-requisitos: ${domainSummary(minimum)}. Itens: ${requirementsList}.`,
    `Domínio final: ${domainSummary(domain)}`,
    `Reserva da coterie: ${pointLabel(players)}. Custo dos pré-requisitos: ${pointLabel(cost)}.`,
    pending ? `Pendência: ${pointLabel(pending)} ${pending === 1 ? 'deve vir' : 'devem vir'} das Vantagens dos personagens.` : 'Pendências: nenhuma.'
  ]
  const biography = paragraphs(details)
  await actor.createEmbeddedDocuments('Item', items)
  await actor.update({
    'system.groupType': 'coterie', 'system.headers.concept': concept, 'system.biography': biography,
    ...Object.fromEntries(DOMAIN.map((key, i) => [`system.${key}.value`, domain[i]]))
  })

  const actualDomain = DOMAIN.map(key => actor.system[key]?.value)
  verify(actor.system.groupType === 'coterie' && actualDomain.every((value, i) => value === domain[i] && value >= minimum[i] && value <= 5) &&
    cost + tally(actualDomain) - tally(minimum) === players + pending, 'Domínio ou orçamento da coterie incorreto')
  const embedded = actor.items.filter(item => item.type === 'feature')
  verify(embedded.length === items.length && items.every(data => embedded.some(item => item.name === data.name &&
    item.system.featuretype === data.system.featuretype && item.system.points === data.system.points)), 'Antecedentes ou Defeitos da coterie incorretos')
  verify(actor.system.biography?.includes(details.at(-1)), 'pendências ausentes na biografia da coterie')
  log.push(...details)
  return biography
}

export async function autoCreate ({ type = 'vampire', seed, name, level = 'common', players = 4 } = {}) {
  if (!Object.hasOwn(TYPES, type)) throw new Error('Tipo de ficha inválido.')
  seed = seed == null ? '' : String(seed)
  if (type === 'vampire') return autoCreateCharacter({ seed, name })
  checkCreatePermission()
  if (type === 'spc' && !Object.hasOwn(NPC_LEVELS, level)) throw new Error('Nível de Personagem do Narrador inválido.')
  const group = type === 'group'
  if (group) {
    players = Number(players)
    if (!Number.isInteger(players) || players < 1 || players > 10) throw new Error('Informe de 1 a 10 personagens jogadores.')
  }
  seed = normalizeSeed(seed)
  const pick = seededPicker(seed)
  const log = []
  let actor
  try {
    const coterie = group ? pick(COTERIES) : null
    actor = await createActor(type, name?.trim() || (group ? `Coterie ${coterie[0]}` : pick(NAMES)))
    let summary
    if (group) summary = await buildCoterie(actor, coterie, players, pick, log)
    else if (CHARACTER_BOOKS[type]) summary = await buildBookSheet(actor, CHARACTER_BOOKS[type], pick, log)
    else summary = await buildMortalSheet(actor, NPC_LEVELS[level], pick, log)
    await actor.setFlag(ID, 'autoGenerated', { version: 1, type, seed, timestamp: new Date().toISOString(), log })
    await whisper(actor, paragraphs([`Semente: ${seed}`]) + summary)
    return { actor, seed, log }
  } catch (error) {
    await rollbackActor(actor, error)
  }
}

export async function openAutoCreateDialog () {
  const options = (entries, selected) => Object.entries(entries).map(([value, label]) =>
    `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('')
  const levels = Object.fromEntries(Object.entries(NPC_LEVELS).map(([id, level]) => [id, level.label]))
  try {
    const input = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Criação automática de ficha' },
      content: `
        <div class="form-group"><label for="auto-chargen-type">Tipo de ficha</label>
          <select id="auto-chargen-type" name="type">
            ${options(TYPES, 'vampire')}
          </select>
        </div>
        <div class="form-group"><label for="auto-chargen-name">Nome (opcional)</label><input id="auto-chargen-name" name="name" type="text"></div>
        <div class="form-group"><label for="auto-chargen-seed">Semente (opcional)</label><input id="auto-chargen-seed" name="seed" type="text"></div>
        <div data-sheet-type="spc" hidden>
          <div class="form-group"><label for="auto-chargen-level">Nível</label>
            <select id="auto-chargen-level" name="level" disabled>${options(levels, 'common')}</select>
          </div>
        </div>
        <div data-sheet-type="group" hidden>
          <div class="form-group"><label for="auto-chargen-players">Personagens jogadores</label>
            <input id="auto-chargen-players" name="players" type="number" min="1" max="10" step="1" value="4" required disabled>
          </div>
        </div>`,
      rejectClose: false,
      render: (_event, dialog) => {
        const type = dialog.element.querySelector('[name="type"]')
        const fields = dialog.element.querySelectorAll('[data-sheet-type]')
        const updateFields = () => {
          for (const field of fields) {
            field.hidden = field.dataset.sheetType !== type.value
            field.querySelector('[name]').disabled = field.hidden
          }
        }
        type.addEventListener('change', updateFields)
        updateFields()
      },
      buttons: [
        {
          action: 'create', label: 'Criar ficha', default: true,
          callback: (_event, button) => {
            const fields = button.form.elements
            return { type: fields.type.value, name: fields.name.value.trim(), seed: fields.seed.value.trim(), level: fields.level.value, players: fields.players.valueAsNumber }
          }
        },
        { action: 'cancel', label: 'Cancelar' }
      ]
    })
    if (input == null || input === 'cancel') return
    const result = await autoCreate(input)
    await result.actor.sheet.render(true)
    ui.notifications.info(`Ficha criada. Semente: ${result.seed}`)
    return result
  } catch (error) {
    console.error('Falha ao criar ficha automática:', error)
    ui.notifications.error(`Não foi possível criar a ficha: ${error.message}`)
  }
}
