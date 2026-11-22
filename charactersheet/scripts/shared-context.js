// Prep helpers identical across every vampire-family sheet this module
// reskins (Vampire, Ghoul - both extend wod5e's own vampire-side actor
// classes and share the exact same Disciplines/Features/Equipment context
// shape). Split out once a second concrete sheet needed the same logic
// verbatim, rather than duplicated per-class.
const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

const boundTraitSheets = new WeakSet()

export function bindTraitDecrement (app) {
  const root = app.element
  if (!root?.querySelector('[data-decrease-trait]') || boundTraitSheets.has(root)) return

  boundTraitSheets.add(root)
  let pending = Promise.resolve()
  root.addEventListener('contextmenu', event => {
    const dot = event.target.closest('[data-decrease-trait] > .resource-value-step')
    if (!dot || !app.isEditable) return

    event.preventDefault()
    const path = dot.parentElement.dataset.name
    pending = pending.then(async () => {
      if (!app.isEditable) return
      const actor = app.document
      if (actor.system.locked) {
        ui.notifications.warn(game.i18n.format('WOD5E.Notifications.CannotModifyResourceString', { string: actor.name }))
        return
      }

      const value = foundry.utils.getProperty(actor._source, path) ?? foundry.utils.getProperty(actor, path)
      if (Number.isInteger(value) && value > 0) await actor.update({ [path]: value - 1 })
    }).catch(error => {
      console.error(`${MODULE_ID} | Falha ao reduzir Atributo ou Habilidade`, error)
      ui.notifications.error('Não foi possível remover o ponto.')
    })
    return pending
  })
}

export const FEATURE_COLUMNS = [
  { key: 'merit', label: 'Qualidades' },
  { key: 'flaw', label: 'Defeitos' },
  { key: 'background', label: 'Antecedentes' },
  { key: 'boon', label: 'Favores' }
]

// Short hover-tooltip blurbs for Attributes/Skills - universal across every
// splat this module reskins, since they all share attributes-skills.hbs and
// wod5e's own Attributes/Skills definitions (system/api/def/attributes.js,
// def/skills.js) unchanged. Keyed by the same id wod5e itself uses
// (attribute.id/skill.id, e.g. "animalken" not "animal ken").
const ATTRIBUTE_TOOLTIPS = {
  strength: 'Poder físico bruto: erguer, golpear e abrir caminho à força.',
  dexterity: 'Agilidade, reflexos e coordenação motora.',
  stamina: 'Resistência física e capacidade de suportar dano ou privação.',
  charisma: 'Charme natural, presença e magnetismo social.',
  manipulation: 'Talento para enganar, seduzir ou influenciar os outros.',
  composure: 'Sangue-frio sob pressão: manter a calma e esconder o que sente de verdade.',
  intelligence: 'Capacidade mental, memória e raciocínio lógico.',
  wits: 'Pensamento rápido, atenção e improviso sob pressão.',
  resolve: 'Foco, força de vontade e persistência para levar uma tarefa até o fim.'
}

const SKILL_TOOLTIPS = {
  athletics: 'Correr, saltar, escalar e outros esforços físicos.',
  brawl: 'Combate desarmado: punhos, dentes e agarrões improvisados.',
  craft: 'Construir, consertar ou criar objetos com as mãos.',
  drive: 'Dirigir carros e outros veículos terrestres, inclusive sob pressão.',
  firearms: 'Mirar e disparar armas de fogo de todo tipo.',
  larceny: 'Arrombar fechaduras, burlar sistemas de segurança e furtar.',
  melee: 'Lutar com armas brancas: lâminas, porretes e afins.',
  stealth: 'Mover-se sem ser visto nem ouvido.',
  survival: 'Viver da terra e sobreviver em ambientes selvagens.',
  animalken: 'Entender, acalmar e controlar animais.',
  etiquette: 'Conhecer e usar os costumes e as boas maneiras certos.',
  insight: 'Perceber os verdadeiros sentimentos e motivações das pessoas.',
  intimidation: 'Coagir os outros com ameaças, presença ameaçadora ou força de vontade.',
  leadership: 'Inspirar, organizar e comandar os outros.',
  performance: 'Atuação, música, oratória e outras artes cênicas.',
  persuasion: 'Convencer os outros com argumentos honestos e charme.',
  streetwise: 'Circular pelo submundo do crime e pela cultura das ruas.',
  subterfuge: 'Mentir de forma convincente e perceber as mentiras dos outros.',
  academics: 'Educação formal, história e pesquisa.',
  awareness: 'Notar detalhes e pressentir perigo ou problemas.',
  finance: 'Entender de dinheiro, mercados e economia.',
  investigation: 'Juntar pistas e encontrar informações escondidas.',
  medicine: 'Diagnosticar e tratar ferimentos e doenças.',
  occult: 'Conhecimento do sobrenatural e de saberes esotéricos.',
  politics: 'Entender burocracias, facções e estruturas de poder.',
  science: 'Conhecimento científico formal e método.',
  technology: 'Computadores, invasão de sistemas e eletrônica moderna.'
}

// Discipline category tooltips - vampire/ghoul only (both share the exact
// same Discipline data). Rituals/Ceremonies are Blood Sorcery/Oblivion's
// own non-dot-rated power subgroups, not separate Disciplines, but they get
// their own group header in the flat list so they need a blurb too.
const DISCIPLINE_TOOLTIPS = {
  animalism: 'Comandar animais e se comunicar com eles, e sentir ou acalmar a Besta dos outros.',
  auspex: 'Sentidos aguçados, telepatia e percepção sobrenatural.',
  celerity: 'Velocidade e reflexos sobrenaturais.',
  dominate: 'Dobrar a mente e a vontade de um mortal ou vampiro à sua.',
  fortitude: 'Resistência sobrenatural a ferimentos e danos.',
  obfuscate: 'Ficar invisível, passar despercebido ou se disfarçar.',
  oblivion: 'Comandar a morte, as sombras e os espíritos dos mortos.',
  potence: 'Força física sobrenatural.',
  presence: 'Provocar nos outros atração, fascínio ou medo sobrenaturais.',
  protean: 'Mudar a forma do corpo: garras, névoa, forma animal e mais.',
  sorcery: 'Magia ritual realizada por meio da vitae.',
  alchemy: 'Preparar fórmulas sobrenaturais com vitae e ingredientes comuns.',
  rituals: 'Rituais de Feitiçaria de Sangue: operações mágicas complexas feitas ao longo do tempo, não rolagens do momento.',
  ceremonies: 'Cerimônias de Oblívio: operações rituais envolvendo a morte e os mortos inquietos.'
}

// Decorates sortedAttributes/sortedSkills (nested {group: {id: {...}}}
// objects already built by wod5e's own prepareStatsContext) with a
// .tooltip field per leaf attribute/skill, for the Attributes & Skills tab
// shared by every splat.
export function decorateStatsTooltips (context, canEdit) {
  context.canEditSkills = canEdit
  for (const group of Object.values(context.sortedAttributes ?? {})) {
    for (const attribute of Object.values(group)) {
      attribute.tooltip = ATTRIBUTE_TOOLTIPS[attribute.id] || ''
    }
  }

  for (const group of Object.values(context.sortedSkills ?? {})) {
    for (const skill of Object.values(group)) {
      skill.tooltip = SKILL_TOOLTIPS[skill.id] || ''
    }
  }

  return context
}

const ROUSE_COST_WORDS = [
  'Gratuito',
  'Uma Checagem de Sangue',
  'Duas Checagens de Sangue',
  'Três Checagens de Sangue',
  'Quatro Checagens de Sangue',
  'Cinco Checagens de Sangue'
]

// wod5e's own prepareDisciplinesContext (run by super._preparePartContext)
// already builds context.disciplines with each discipline's owned powers
// grouped/sorted and every item's system.enrichedDescription already
// populated - this just decorates each power with display-ready cost text
// for the flat list template.
export function prepareDisciplinesFlatContext (context) {
  context.hasVisibleDisciplines = Object.values(context.disciplines ?? {}).some(discipline => discipline.visible)
  for (const [discKey, discipline] of Object.entries(context.disciplines ?? {})) {
    discipline.tooltip = DISCIPLINE_TOOLTIPS[discKey] || ''

    for (const power of discipline.powers ?? []) {
      const cost = power.system?.cost ?? 0
      power.costText = ROUSE_COST_WORDS[cost] ?? `${cost} Checagens de Sangue`
    }
  }

  return context
}

export function prepareMeritsFlawsContext (context, actor, canEdit) {
  context.mfColumns = FEATURE_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    itemType: col.key === 'boon' ? 'boon' : 'feature',
    subtype: col.key === 'boon' ? null : col.key,
    canCreate: canEdit && (col.key !== 'boon' || ['vampire', 'ghoul'].includes(actor.type)),
    items: Object.values(context.features?.[col.key] ?? {})
  }))
  context.hasMeritsFlaws = context.mfColumns.some(column => column.items.length > 0)

  return context
}

export function prepareEquipmentSheetContext (context, actor, canEdit) {
  context.currency = actor.getFlag(MODULE_ID, 'currency') ?? 0
  context.canEditEquipment = canEdit
  context.hasEquipment = Object.values(context.equipmentItems ?? {}).some(items => items.length > 0)

  return context
}

// wod5e's own toggleCollapse action sizes .collapsible-content by reading
// scrollHeight and writing it back as an inline max-height - which breaks
// down here: with display:none it always reads scrollHeight as 0 (so it can
// never open), and with the max-height/overflow version it was visually
// leaking content past the clip regardless of !important. A plain class
// toggle sidesteps both failure modes entirely. Shared by every expandable-
// row list on these sheets (Disciplines powers, Merits & Flaws, Equipment).
export async function onToggleExpandRow (event, target) {
  event.preventDefault()
  target.closest('.cs-expand-row')?.classList.toggle('cs-expanded')
}
