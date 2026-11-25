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
const allowed = (actor, doc) => !checkRestrictions(actor, flags(doc).restrictions ?? []).length && !checkConflicts(actor, doc.name, flags(doc).conflictsWith ?? []).length
const copy = doc => { const data = doc.toObject(); delete data._id; delete data.ownership; return data }
const shuffled = (list, pick) => { const pool = [...list]; const out = []; while (pool.length) { const item = pick(pool); pool.splice(pool.indexOf(item), 1); out.push(item) } return out }

async function addPick (actor, doc, slot, log) {
  const [item] = await actor.createEmbeddedDocuments('Item', [copy(doc)])
  const pickLabel = slot === 'clan' ? 'Clã' : 'Tipo de Predador'
  await applyTrackedGrants(actor, { slot, pickLabel, name: item.name, sourceLabel: `${pickLabel}: ${item.name}`, grants: slot === 'clan' ? clanCreationGrants(item) : flags(item).grants ?? [] }, log)
}

async function buy (actor, docs, kind, budget, pick, log) {
  let remaining = budget
  for (let attempt = 0; remaining > 0 && attempt < 200; attempt++) {
    const choices = docs.filter(doc => {
      // Fora do sorteio: pastas de Sangue-Ralo (seção própria), Caitiff de outro clã (bloqueio
      // compartilhado), Coterie (pontos da coterie), Variantes da Perdição e Míticos (regras opcionais).
      if (!kind.includes(doc.system.featuretype) || ['thinBloodMerit', 'thinBloodFlaw', 'coterie', 'baneVariant', 'mythic'].includes(featureCategory(doc))) return false
      if (chargenPurchaseBlock(actor, doc)) return false
      const existing = actor.items.find(i => i.type === 'feature' && i.name === doc.name)
      if (!allowed(actor, doc) || chargenPurchaseBlock(actor, doc)) return false
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
      log.push(`Tentativa em ${doc.name} falhou: ${error.message}`)
      docs = docs.filter(item => item !== doc)
    }
  }
  if (remaining) throw new Error(`Não foi possível gastar ${budget} pontos em ${kind.join('/')} (faltam ${remaining}).`)
}

export async function autoCreateCharacter ({ seed, name } = {}) {
  if (game.system.id !== 'wod5e') throw new Error('O sistema ativo precisa ser wod5e.')
  if (!game.user.isGM && !game.user.hasPermission('ACTOR_CREATE')) throw new Error('Você não tem permissão para criar Atores.')
  seed = String(seed || `${Date.now()}-${Math.random()}`)
  const pick = seededPicker(seed)
  const log = []
  let actor
  try {
    const packDocs = async suffix => {
      const pack = game.packs.get(`${ID}.${suffix}`)
      if (!pack) throw new Error(`Compêndio ausente: ${suffix}.`)
      return pack.getDocuments()
    }
    const [clans, predators, features] = await Promise.all(['clans', 'predatortypes', 'meritsflaws'].map(packDocs))
    let folder = game.folders.find(f => f.type === 'Actor' && f.name === 'PJs — Criação Automática')
    if (!folder) folder = await Folder.create({ name: 'PJs — Criação Automática', type: 'Actor' })
    actor = await Actor.create({ name: name?.trim() || pick(NAMES), type: 'vampire', folder: folder.id })
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
        'system.headers.concept': pick(CONCEPTS), 'system.headers.ambition': pick(AMBITIONS), 'system.headers.desire': pick(DESIRES),
        'system.headers.sire': pick(['desconhecido', ...NAMES]),
        [`flags.${ID}.skillDistribution`]: distribution, [`flags.${ID}.attributesInitialized`]: true
      }
      for (const [id, value] of Object.entries(attrs)) updates[`system.attributes.${id}.value`] = value
      for (const [id, value] of Object.entries(skills)) updates[`system.skills.${id}.value`] = value
      const count = pick([1, 2, 3])
      const suffix = ' (gerado automaticamente — revise com o Narrador)'
      updates['system.headers.tenets'] = shuffled(TENETS, pick).slice(0, count).map(s => s + suffix).join('\n')
      updates['system.headers.touchstones'] = shuffled(TOUCHSTONES, pick).slice(0, count).map(s => s + suffix).join('\n')
      await actor.update(updates)
      const candidates = predators.filter(p => allowed(actor, p))
      await addPick(actor, pick(candidates), 'predator', log)
      const specialties = {}
      for (const id of REQUIRED_SPECIALTY_SKILLS.filter(id => skills[id] > 0)) specialties[id] = pick(SPECIALTIES[id])
      const skill = pick(Object.keys(skills).filter(id => skills[id] > 0))
      const used = new Set([specialties[skill], ...(actor.system.skills?.[skill]?.bonuses ?? []).map(b => b.source)].filter(Boolean).map(s => s.toLocaleLowerCase('pt-BR')))
      const available = SPECIALTIES[skill].filter(label => !used.has(label.toLocaleLowerCase('pt-BR')))
      if (!available.length) throw new Error(`Não há Especialização livre disponível para ${skill}.`)
      specialties.free = { skill, label: pick(available) }
      await actor.setFlag(ID, 'freeSpecialties', specialties)
      await applyFreeSpecialties(actor)
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
      const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
      const formatLog = value => escape(value).replace(/&lt;(\/?)b&gt;/g, '<$1b>')
      const items = actor.items.map(i => `${i.name}${i.type === 'feature' ? ` (${i.system.points ?? 0})` : ''}`).join(', ')
      const traitLabel = (group, key) => { const i18n = `WOD5E.AttributesList.${key.charAt(0).toUpperCase()}${key.slice(1)}`; return group === 'attributes' && game.i18n.has(i18n) ? game.i18n.localize(i18n) : displayLabel(key) }
      const traits = (group, values) => Object.keys(values).filter(key => (actor.system[group]?.[key]?.value ?? 0) > 0).map(key => `${traitLabel(group, key)}: ${actor.system[group]?.[key]?.value ?? 0}`).join(', ')
      const disciplines = Object.entries(actor.system.disciplines ?? {}).filter(([, v]) => v.value).map(([k, v]) => `${displayLabel(k)}: ${v.value}`).join(', ') || 'nenhuma'
      const specialtySummary = actor.flags?.[ID]?.appliedFreeSpecialties?.map(s => `${displayLabel(s.skill)}: ${s.label}`).join(', ') ?? ''
      await ChatMessage.create({ whisper: [game.user.id], content: `<h3>${escape(actor.name)}</h3><p>Clã: ${escape(clan.name)}; geração: ${escape(generation.replace(/(?:st|nd|rd|th)$/, 'ª'))}; semente: ${escape(seed)}</p><p>Atributos: ${escape(traits('attributes', attrs))}</p><p>Habilidades: ${escape(traits('skills', skills))}</p><p>Especializações: ${escape(specialtySummary)}</p><p>Disciplinas: ${escape(disciplines)}</p><p>Itens, predador e poderes: ${escape(items)}</p><p>${log.map(formatLog).join('<br>')}</p>` })
    })
    return { actor, seed, log }
  } catch (error) {
    if (actor) {
      try { await actor.delete() } catch (rollback) { throw new Error(`${error.message} Falha ao excluir o Ator criado: ${rollback.message}`, { cause: error }) }
    }
    throw error
  }
}
