import { checkRestrictions, checkConflicts, getRatingCap } from './restrictions.js'
import {
  costForRaise,
  ATTRIBUTE_MULTIPLIER,
  SKILL_MULTIPLIER,
  BLOOD_POTENCY_MULTIPLIER,
  DISCIPLINE_MULTIPLIER,
  SPECIALTY_COST,
  RITUAL_FORMULA_MULTIPLIER,
  ADVANTAGE_COST_PER_DOT
} from './cost-tables.js'
import { commitCart } from './purchase-application.js'
import { getClanKey } from '../../clans/scripts/clan-key.js'
import { clanAppearanceBlock } from '../../chargen/scripts/grant-engine.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'
const activeCheckouts = new WeakSet()

const ATTRIBUTE_GROUPS = {
  physical: ['strength', 'dexterity', 'stamina'],
  social: ['charisma', 'manipulation', 'composure'],
  mental: ['intelligence', 'wits', 'resolve']
}

const SKILL_GROUPS = {
  physical: ['athletics', 'brawl', 'craft', 'drive', 'firearms', 'larceny', 'melee', 'stealth', 'survival'],
  social: ['animalken', 'etiquette', 'insight', 'intimidation', 'leadership', 'performance', 'persuasion', 'streetwise', 'subterfuge'],
  mental: ['academics', 'awareness', 'finance', 'investigation', 'medicine', 'occult', 'politics', 'science', 'technology']
}

// Discipline id spellings that differ between the clan-grant data
// (configure-clans-grants.js, vtm5e-clans compendium) and wod5e's own
// canonical ids (system/api/def/disciplines.js) - found during design
// review. Normalize before comparing, don't trust the raw string.
const DISCIPLINE_ID_ALIASES = { bloodsorcery: 'sorcery' }
const EXTRA_POWERS = {
  rituals: { discipline: 'sorcery', label: 'Ritual' },
  ceremonies: { discipline: 'oblivion', label: 'Cerimônia' },
  alchemy: { discipline: 'alchemy', label: 'Fórmula' }
}

const CATEGORIES = [
  { id: 'attributes', label: 'Atributos' },
  { id: 'skills', label: 'Habilidades' },
  { id: 'specialties', label: 'Especializações' },
  { id: 'disciplines', label: 'Disciplinas' },
  { id: 'bloodpotency', label: 'Potência do Sangue' },
  { id: 'advantages', label: 'Vantagens' }
]

const TRAIT_LABELS = {
  physical: 'Físicos',
  social: 'Sociais',
  mental: 'Mentais',
  strength: 'Força',
  dexterity: 'Destreza',
  stamina: 'Vigor',
  charisma: 'Carisma',
  manipulation: 'Manipulação',
  composure: 'Autocontrole',
  intelligence: 'Inteligência',
  wits: 'Raciocínio',
  resolve: 'Determinação',
  athletics: 'Atletismo',
  brawl: 'Briga',
  craft: 'Ofícios',
  drive: 'Condução',
  firearms: 'Armas de Fogo',
  larceny: 'Ladroagem',
  melee: 'Armas Brancas',
  stealth: 'Furtividade',
  survival: 'Sobrevivência',
  animalken: 'Empatia com Animais',
  etiquette: 'Etiqueta',
  insight: 'Sagacidade',
  intimidation: 'Intimidação',
  leadership: 'Liderança',
  performance: 'Performance',
  persuasion: 'Persuasão',
  streetwise: 'Manha',
  subterfuge: 'Subterfúgio',
  academics: 'Erudição',
  awareness: 'Percepção',
  finance: 'Finanças',
  investigation: 'Investigação',
  medicine: 'Medicina',
  occult: 'Ocultismo',
  politics: 'Política',
  science: 'Ciência',
  technology: 'Tecnologia',
  animalism: 'Animalismo',
  auspex: 'Auspícios',
  celerity: 'Celeridade',
  dominate: 'Dominação',
  fortitude: 'Fortitude',
  obfuscate: 'Ofuscação',
  oblivion: 'Oblívio',
  potence: 'Potência',
  presence: 'Presença',
  protean: 'Proteanismo',
  sorcery: 'Feitiçaria de Sangue',
  bloodsorcery: 'Feitiçaria de Sangue',
  alchemy: 'Alquimia Sangue-Ralo',
}

function capitalize (id) {
  return TRAIT_LABELS[id] ?? id.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

export class XPShopApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    tag: 'div',
    window: {
      title: 'Gastar Experiência',
      icon: 'fas fa-coins',
      resizable: true
    },
    position: {
      width: 880,
      height: 700
    },
    actions: {
      switchCategory: XPShopApp.#onSwitchCategory,
      adjustAttribute: XPShopApp.#onAdjustAttribute,
      adjustSkill: XPShopApp.#onAdjustSkill,
      adjustBloodPotency: XPShopApp.#onAdjustBloodPotency,
      addSpecialty: XPShopApp.#onAddSpecialty,
      addDisciplineDot: XPShopApp.#onAddDisciplineDot,
      cancelDisciplinePick: XPShopApp.#onCancelDisciplinePick,
      toggleExpandPower: XPShopApp.#onToggleExpandPower,
      pickDisciplinePower: XPShopApp.#onPickDisciplinePower,
      addExtraPower: XPShopApp.#onAddExtraPower,
      adjustAdvantage: XPShopApp.#onAdjustAdvantage,
      toggleAdvantageFolder: XPShopApp.#onToggleAdvantageFolder,
      removeCartLine: XPShopApp.#onRemoveCartLine,
      commitCart: XPShopApp.#onCommitCart
    }
  }

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/xpshop/templates/xp-shop.hbs` }
  }

  constructor (actor, options = {}) {
    super({ ...options, id: `vtm5e-xpshop-${actor.id}` })
    this.actor = actor
    this.category = 'attributes'
    this.cart = []
    this.clanItems = null
    this.disciplinePowerItems = null
    this.meritsFlawsItems = null
    this.pendingDisciplinePick = null // { disciplineId, level }
    this.expandedPowerIds = new Set()
    this.advantageSearch = ''
    this.advantageSearchFocused = false
    this.openFolders = new Set()
  }

  async #ensureCompendiumData () {
    if (!this.clanItems) {
      const pack = game.packs.get('vampiro-a-mascara-v5-ptbr.clans')
      this.clanItems = pack ? await pack.getDocuments() : []
    }
    if (!this.disciplinePowerItems) {
      const pack = game.packs.get('vampiro-a-mascara-v5-ptbr.disciplines')
      this.disciplinePowerItems = pack ? await pack.getDocuments() : []
    }
    if (!this.meritsFlawsItems) {
      const pack = game.packs.get('vampiro-a-mascara-v5-ptbr.meritsflaws')
      this.meritsFlawsItems = pack ? await pack.getDocuments() : []
    }
  }

  // ---------- Cart-aware "current value" helpers ----------

  #currentValue (category, traitId) {
    if (category === 'bloodpotency') return this.actor.system.blood?.potency ?? 0
    return this.actor.system[category]?.[traitId]?.value ?? 0
  }

  #cartEntry (category, traitId) {
    return this.cart.find(e => e.category === category && e.traitId === traitId)
  }

  #cartEntriesFor (category, traitId) {
    return this.cart.filter(e => e.category === category && e.traitId === traitId)
  }

  #effectiveLevel (category, traitId) {
    const entry = this.#cartEntry(category, traitId)
    return entry ? entry.targetLevel : this.#currentValue(category, traitId)
  }

  // Disciplines stack multiple cart entries (one dot + one power each) -
  // effective level is the highest targetLevel among them, or actor current.
  #effectiveDisciplineLevel (disciplineId) {
    const entries = this.#cartEntriesFor('disciplines', disciplineId)
    if (entries.length === 0) return this.actor.system.disciplines?.[disciplineId]?.value ?? 0
    return Math.max(...entries.map(e => e.targetLevel))
  }

  get #cartTotal () {
    return this.cart.reduce((sum, e) => sum + e.cost, 0)
  }

  get #remainingXP () {
    return this.actor.system.derivedXP?.remainingXP ?? this.actor.system.exp?.value ?? 0
  }

  // ---------- Discipline cost multiplier resolution ----------

  #disciplineMultiplier (disciplineId) {
    if (disciplineId === 'alchemy' && this.#isThinBlooded()) return DISCIPLINE_MULTIPLIER.other
    const clanItem = this.actor.items.find(i => i.type === 'clan')
    if (!clanItem) return DISCIPLINE_MULTIPLIER.other // Ghouls own no Clan item at all
    if (getClanKey(clanItem) === 'caitiff') return DISCIPLINE_MULTIPLIER.caitiff

    const grants = clanItem.flags?.['vampiro-a-mascara-v5-ptbr']?.grants ?? []
    const disciplineDotGrant = grants.find(g => g.type === 'disciplineDot')
    const inClanIds = (disciplineDotGrant?.choices ?? []).map(c => {
      const id = typeof c === 'string' ? c : c.discipline
      return DISCIPLINE_ID_ALIASES[id] ?? id
    })

    return inClanIds.includes(disciplineId) ? DISCIPLINE_MULTIPLIER.clan : DISCIPLINE_MULTIPLIER.other
  }

  #isThinBlooded () {
    return getClanKey(this.actor.items.find(i => i.type === 'clan')) === 'thin-blooded'
  }

  // ---------- Context ----------

  async _prepareContext (_options) {
    await this.#ensureCompendiumData()

    return {
      actor: this.actor,
      categories: CATEGORIES.map(c => ({ ...c, active: c.id === this.category })),
      category: this.category,
      remainingXP: this.#remainingXP,
      cartTotal: this.#cartTotal,
      remainingAfterCart: this.#remainingXP - this.#cartTotal,
      overBudget: this.#cartTotal > this.#remainingXP,
      cart: this.cart,
      cartEmpty: this.cart.length === 0,
      attributes: this.category === 'attributes' ? this.#buildRaiseGroups('attributes', ATTRIBUTE_GROUPS, ATTRIBUTE_MULTIPLIER) : null,
      skills: this.category === 'skills' ? this.#buildRaiseGroups('skills', SKILL_GROUPS, SKILL_MULTIPLIER) : null,
      specialties: this.category === 'specialties' ? this.#buildSpecialtiesView() : null,
      disciplines: this.category === 'disciplines' ? await this.#buildDisciplinesView() : null,
      bloodPotency: this.category === 'bloodpotency' ? this.#buildBloodPotencyView() : null,
      advantages: this.category === 'advantages' ? this.#buildAdvantagesView() : null
    }
  }

  #buildRaiseGroups (category, groups, multiplier) {
    const out = {}
    for (const [group, ids] of Object.entries(groups)) {
      out[TRAIT_LABELS[group] ?? group] = ids.map(id => {
        const current = this.#currentValue(category, id)
        const effective = this.#effectiveLevel(category, id)
        const cartEntry = this.#cartEntry(category, id)
        return {
          id,
          label: capitalize(id),
          current,
          effective,
          pendingCost: cartEntry?.cost ?? null,
          dots: [1, 2, 3, 4, 5].map(n => ({
            n,
            owned: n <= current,
            pending: n > current && n <= effective
          }))
        }
      })
    }
    return out
  }

  #buildSpecialtiesView () {
    const allSkillIds = Object.values(SKILL_GROUPS).flat()
    const skillOptions = allSkillIds.filter(id => this.#effectiveLevel('skills', id) >= 1).map(id => ({ id, label: capitalize(id) }))
    const draftEntries = this.cart.filter(e => e.category === 'specialties')
    return { skillOptions, draftEntries }
  }

  async #buildDisciplinesView () {
    const knownIds = Object.keys(this.actor.system.disciplines ?? {})
      .filter(id => id !== 'rituals' && id !== 'ceremonies')
    const thinBlooded = this.#isThinBlooded()

    const rows = knownIds.filter(id => thinBlooded ? id === 'alchemy' : id !== 'alchemy').sort().map(id => {
        const current = this.actor.system.disciplines?.[id]?.value ?? 0
        const effective = this.#effectiveDisciplineLevel(id)
        const multiplier = this.#disciplineMultiplier(id)
        const cartEntries = this.#cartEntriesFor('disciplines', id).sort((a, b) => a.targetLevel - b.targetLevel)
        const nextLevel = effective + 1
        const pips = [1, 2, 3, 4, 5].map(n => {
          if (n <= current) return { n, state: 'owned', powerName: null }
          const pendingEntry = cartEntries.find(e => e.targetLevel === n)
          if (pendingEntry) return { n, state: 'pending', powerName: pendingEntry.powerName }
          return { n, state: 'empty', powerName: null }
        })
        return {
          id,
          label: capitalize(id),
          current,
          effective,
          multiplier,
          multiplierLabel: multiplier === DISCIPLINE_MULTIPLIER.clan ? 'do clã' : multiplier === DISCIPLINE_MULTIPLIER.caitiff ? 'Caitiff' : 'de fora do clã',
          cartEntries,
          pips,
          nextLevel,
          nextLevelCost: nextLevel <= 5 ? nextLevel * multiplier : null,
          maxed: nextLevel > 5,
          isPicking: this.pendingDisciplinePick?.disciplineId === id
        }
      })

    let powerPicker = null
    if (this.pendingDisciplinePick) {
      const { disciplineId, level } = this.pendingDisciplinePick
      const powers = (this.disciplinePowerItems || [])
        .filter(doc => {
          const docDisciplineId = DISCIPLINE_ID_ALIASES[doc.system.discipline] ?? doc.system.discipline
          return docDisciplineId === disciplineId && Number(doc.system.level) === level
        })
        .filter(doc => !this.#hasPower(doc))
        .map(doc => {
          const plainDesc = (doc.system.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          const expanded = this.expandedPowerIds.has(doc.id)
          return {
            id: doc.id,
            name: doc.name,
            expanded,
            description: expanded || plainDesc.length <= 200 ? plainDesc : plainDesc.slice(0, 197) + '…'
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

      powerPicker = { disciplineId, disciplineLabel: capitalize(disciplineId), level, powers }
    }

    const extraPowers = (this.disciplinePowerItems || []).filter(doc => this.#extraPowerAvailable(doc))
      .map(doc => ({ id: doc.id, name: doc.name, level: Number(doc.system.level), cost: Number(doc.system.level) * RITUAL_FORMULA_MULTIPLIER, label: EXTRA_POWERS[doc.system.discipline].label }))
      .sort((a, b) => a.label.localeCompare(b.label) || a.level - b.level || a.name.localeCompare(b.name))
    return { rows, thinBlooded, powerPicker, extraPowers }
  }

  #hasPower (doc) {
    return this.actor.items.some(i => i.type === 'power' && (i.name === doc.name || enName(i) === enName(doc) || i.flags?.core?.sourceId === doc.uuid || i._stats?.compendiumSource === doc.uuid)) ||
      this.cart.some(e => (e.category === 'disciplines' || e.category === 'extraPowers') && (e.powerId === doc.id || e.powerName === doc.name))
  }

  #extraPowerAvailable (doc) {
    const rule = EXTRA_POWERS[doc.system.discipline]
    const level = Number(doc.system.level)
    return !!rule && (doc.system.discipline !== 'alchemy' || this.#isThinBlooded()) &&
      Number.isInteger(level) && level >= 1 && level <= this.#effectiveDisciplineLevel(rule.discipline) && !this.#hasPower(doc)
  }

  #buildBloodPotencyView () {
    const current = this.#currentValue('bloodpotency', null)
    const effective = this.#effectiveLevel('bloodpotency', null)
    const cartEntry = this.#cartEntry('bloodpotency', null)
    return {
      current,
      effective,
      pendingCost: cartEntry?.cost ?? null,
      dots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({
        n,
        owned: n <= current,
        pending: n > current && n <= effective
      }))
    }
  }

  #buildAdvantagesView () {
    const search = (this.advantageSearch || '').trim().toLowerCase()
    const TYPE_LABELS = { merit: 'Qualidades', background: 'Antecedentes' }
    const byType = { merit: new Map(), background: new Map() }

    for (const doc of this.meritsFlawsItems || []) {
      const featuretype = doc.system.featuretype
      // Flaws aren't purchasable with XP per the corebook's cost table -
      // they're a chargen-time (or Storyteller-granted) pick, not a shop item.
      if (!byType[featuretype]) continue
      if (search && !doc.name.toLowerCase().includes(search)) continue

      const existing = this.actor.items.find(i => i.type === 'feature' && i.name === doc.name)
      const currentDots = existing?.system.points ?? 0
      const cartEntry = this.cart.find(e => e.category === 'advantages' && e.compendiumId === doc.id)
      const effectiveDots = cartEntry?.targetLevel ?? currentDots
      const plainDesc = (doc.system.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const fixedCost = doc.system.points || null

      let unavailableReasons = []
      if (!existing) {
        unavailableReasons = checkRestrictions(this.actor, doc.flags?.['vampiro-a-mascara-v5-ptbr']?.restrictions ?? [])
        const conflicts = checkConflicts(this.actor, doc.name, doc.flags?.['vampiro-a-mascara-v5-ptbr']?.conflictsWith ?? [])
        if (conflicts.length > 0) unavailableReasons = [...unavailableReasons, `Conflita com ${conflicts.join(', ')}, que você já possui.`]
      }
      const appearanceBlock = clanAppearanceBlock(this.actor, doc)
      if (appearanceBlock) unavailableReasons.push(appearanceBlock)

      const ratingCap = fixedCost ? null : getRatingCap(this.actor, doc)
      const ratingCapReason = ratingCap != null ? checkRestrictions(this.actor, [doc.flags['vampiro-a-mascara-v5-ptbr'].ratingCap.unless]).join(' ') : null

      const folderName = doc.folder?.name ?? 'Other'
      if (!byType[featuretype].has(folderName)) byType[featuretype].set(folderName, [])
      byType[featuretype].get(folderName).push({
        id: doc.id,
        name: doc.name,
        description: plainDesc.length > 160 ? plainDesc.slice(0, 157) + '…' : plainDesc,
        currentDots,
        effectiveDots,
        pendingCost: cartEntry?.cost ?? null,
        owned: currentDots > 0,
        fixedCost,
        fixedCostDots: fixedCost ? '•'.repeat(fixedCost) : null,
        unavailable: unavailableReasons.length > 0,
        unavailableReason: unavailableReasons.join(' '),
        dots: fixedCost
          ? null
          : [1, 2, 3, 4, 5].map(n => ({
            n,
            owned: n <= currentDots,
            pending: n > currentDots && n <= effectiveDots,
            capped: ratingCap != null && n > ratingCap,
            capReason: ratingCapReason
          }))
      })
    }

    const groups = ['merit', 'background'].map(featuretype => ({
      featuretype,
      label: TYPE_LABELS[featuretype],
      folders: [...byType[featuretype].entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, items]) => ({
          name,
          open: this.openFolders.has(name) || !!search,
          items: items.sort((a, b) => a.name.localeCompare(b.name))
        }))
    }))

    return { search: this.advantageSearch || '', groups }
  }

  // ---------- Render ----------

  async _onRender (context, options) {
    super._onRender(context, options)

    const searchEl = this.element.querySelector('#vtm5e-xpshop-advantage-search')
    if (searchEl) {
      searchEl.addEventListener('input', (event) => {
        this.advantageSearch = event.currentTarget.value
        this.render()
      })
      searchEl.addEventListener('focus', () => { this.advantageSearchFocused = true })
      searchEl.addEventListener('blur', () => { this.advantageSearchFocused = false })
      if (this.advantageSearchFocused) {
        searchEl.focus()
        const pos = searchEl.value.length
        searchEl.setSelectionRange(pos, pos)
      }
    }
  }

  // ---------- Actions ----------

  static #onSwitchCategory (event, target) {
    this.category = target.dataset.category
    this.pendingDisciplinePick = null
    this.render()
  }

  static #onAdjustAttribute (event, target) {
    this.#adjustRaise('attributes', target.dataset.attribute, Number(target.dataset.n), ATTRIBUTE_MULTIPLIER, capitalize(target.dataset.attribute))
  }

  static #onAdjustSkill (event, target) {
    this.#adjustRaise('skills', target.dataset.skill, Number(target.dataset.n), SKILL_MULTIPLIER, capitalize(target.dataset.skill))
  }

  static #onAdjustBloodPotency (event, target) {
    this.#adjustRaise('bloodpotency', null, Number(target.dataset.n), BLOOD_POTENCY_MULTIPLIER, 'Potência do Sangue')
  }

  #adjustRaise (category, traitId, clickedN, multiplier, label) {
    const current = this.#currentValue(category, traitId)
    const effective = this.#effectiveLevel(category, traitId)
    const next = effective === clickedN ? clickedN - 1 : clickedN

    this.cart = this.cart.filter(e => !(e.category === category && e.traitId === traitId))
    if (next > current) {
      const cost = costForRaise(current, next, multiplier)
      this.cart.push({
        id: foundry.utils.randomID(8),
        category,
        traitId,
        targetLevel: next,
        cost,
        label: `${label} → ${next}`
      })
    }
    this.render()
  }

  static #onAddSpecialty (event, target) {
    // Scoped off this.element (the app's root) rather than target.closest() -
    // there's only ever one specialty form in the whole app, and reading
    // off a fixed, always-valid root sidesteps any ambiguity about exactly
    // which element Foundry's action dispatcher hands back as `target`.
    const skillSelect = this.element.querySelector('[name="specialtySkill"]')
    const textInput = this.element.querySelector('[name="specialtyText"]')
    const skillId = skillSelect?.value
    const text = textInput.value.trim()

    if (!Object.values(SKILL_GROUPS).flat().includes(skillId) || this.#effectiveLevel('skills', skillId) < 1) {
      ui.notifications.warn('Escolha uma Habilidade com pelo menos um ponto, inclusive no carrinho.')
      return
    }

    if (!text) {
      ui.notifications.warn('Digite primeiro o nome de uma Especialização.')
      return
    }

    this.cart.push({
      id: foundry.utils.randomID(8),
      category: 'specialties',
      traitId: null,
      skillId,
      text,
      cost: SPECIALTY_COST,
      label: `Especialização: ${capitalize(skillId)} (${text})`
    })
    this.render()
  }

  static #onAddDisciplineDot (event, target) {
    const disciplineId = target.dataset.discipline
    const level = Number(target.dataset.level)
    this.pendingDisciplinePick = { disciplineId, level }
    this.render()
  }

  static #onCancelDisciplinePick () {
    this.pendingDisciplinePick = null
    this.render()
  }

  static #onToggleExpandPower (event, target) {
    const powerId = target.dataset.powerId
    if (this.expandedPowerIds.has(powerId)) this.expandedPowerIds.delete(powerId)
    else this.expandedPowerIds.add(powerId)
    this.render()
  }

  static #onPickDisciplinePower (event, target) {
    const { disciplineId, level } = this.pendingDisciplinePick
    const powerId = target.dataset.powerId
    const powerDoc = this.disciplinePowerItems.find(d => d.id === powerId)
    if (!powerDoc) return

    const multiplier = this.#disciplineMultiplier(disciplineId)
    const cost = level * multiplier

    this.cart.push({
      id: foundry.utils.randomID(8),
      category: 'disciplines',
      traitId: disciplineId,
      targetLevel: level,
      powerId: powerDoc.id,
      powerName: powerDoc.name,
      cost,
      label: `${capitalize(disciplineId)} ${level} — ${powerDoc.name}`
    })
    this.pendingDisciplinePick = null
    this.render()
  }

  static #onAddExtraPower (event, target) {
    const doc = this.disciplinePowerItems.find(d => d.id === target.dataset.powerId)
    if (!doc || !this.#extraPowerAvailable(doc)) {
      ui.notifications.warn('Este item não está disponível ou seus pré-requisitos não foram atendidos.')
      return
    }
    const level = Number(doc.system.level)
    const rule = EXTRA_POWERS[doc.system.discipline]
    this.cart.push({
      id: foundry.utils.randomID(8), category: 'extraPowers', traitId: rule.discipline,
      targetLevel: level, powerId: doc.id, powerName: doc.name,
      cost: level * RITUAL_FORMULA_MULTIPLIER,
      label: `${rule.label}: ${doc.name} (nível ${level})`
    })
    this.render()
  }

  static #onAdjustAdvantage (event, target) {
    const compendiumId = target.dataset.mfId
    const clickedN = Number(target.dataset.n)
    const doc = this.meritsFlawsItems.find(d => d.id === compendiumId)
    if (!doc) return

    const existing = this.actor.items.find(i => i.type === 'feature' && i.name === doc.name)
    const currentDots = existing?.system.points ?? 0
    const existingEntry = this.cart.find(e => e.category === 'advantages' && e.compendiumId === compendiumId)
    const effectiveDots = existingEntry?.targetLevel ?? currentDots
    const fixedCost = doc.system.points || null

    let nextDots
    if (fixedCost) {
      nextDots = effectiveDots >= fixedCost ? 0 : fixedCost
    } else {
      nextDots = effectiveDots === clickedN ? clickedN - 1 : clickedN
    }
    nextDots = Math.max(nextDots, currentDots)

    if (nextDots > currentDots) {
      const restrictionFailures = checkRestrictions(this.actor, doc.flags?.['vampiro-a-mascara-v5-ptbr']?.restrictions ?? [])
      const appearanceBlock = clanAppearanceBlock(this.actor, doc)
      if (appearanceBlock) restrictionFailures.push(appearanceBlock)
      if (restrictionFailures.length > 0) {
        ui.notifications.error(`Não é possível adquirir ${doc.name}: ${restrictionFailures.join(' ')}`)
        return
      }
      const ratingCap = getRatingCap(this.actor, doc)
      if (ratingCap != null && nextDots > ratingCap) {
        ui.notifications.error(`${doc.name} está limitado a ${ratingCap} ponto(s) até que você cumpra o requisito.`)
        return
      }
      if (!existing) {
        const conflicts = checkConflicts(this.actor, doc.name, doc.flags?.['vampiro-a-mascara-v5-ptbr']?.conflictsWith ?? [])
        if (conflicts.length > 0) {
          ui.notifications.error(`Não é possível adquirir ${doc.name}: conflita com ${conflicts.join(', ')}, que você já possui.`)
          return
        }
      }
    }

    this.cart = this.cart.filter(e => !(e.category === 'advantages' && e.compendiumId === compendiumId))
    if (nextDots > currentDots) {
      const cost = (nextDots - currentDots) * ADVANTAGE_COST_PER_DOT
      this.cart.push({
        id: foundry.utils.randomID(8),
        category: 'advantages',
        traitId: null,
        compendiumId,
        name: doc.name,
        featuretype: doc.system.featuretype,
        isNewItem: !existing,
        targetLevel: nextDots,
        cost,
        label: `${doc.name} → ${'•'.repeat(nextDots)}`
      })
    }
    this.render()
  }

  static #onToggleAdvantageFolder (event, target) {
    const name = target.dataset.folder
    if (this.openFolders.has(name)) this.openFolders.delete(name)
    else this.openFolders.add(name)
    this.render()
  }

  static #onRemoveCartLine (event, target) {
    const id = target.dataset.cartId
    this.cart = this.cart.filter(e => e.id !== id)
    this.render()
  }

  static async #onCommitCart (_event, target) {
    if (this.cart.length === 0 || activeCheckouts.has(this.actor)) return

    if (this.#cartTotal > this.#remainingXP) {
      ui.notifications.error(`Experiência insuficiente: o carrinho custa ${this.#cartTotal}, e restam apenas ${this.#remainingXP}.`)
      return
    }

    for (const entry of this.cart) {
      if (entry.category === 'specialties' && this.#effectiveLevel('skills', entry.skillId) < 1) {
        ui.notifications.error(`A especialização ${entry.label} exige pelo menos um ponto na Habilidade.`)
        return
      }
      if (entry.category === 'extraPowers' && (this.#effectiveDisciplineLevel(entry.traitId) < entry.targetLevel || (entry.traitId === 'alchemy' && !this.#isThinBlooded()))) {
        ui.notifications.error(`${entry.label} não atende mais aos pré-requisitos.`)
        return
      }
      if (entry.category === 'disciplines') {
        const current = this.#currentValue('disciplines', entry.traitId)
        for (let n = current + 1; n < entry.targetLevel; n++) {
          if (!this.#cartEntriesFor('disciplines', entry.traitId).some(e => e.targetLevel === n)) {
            ui.notifications.error(`Adicione os níveis anteriores de ${capitalize(entry.traitId)} antes de confirmar.`)
            return
          }
        }
      }
    }

    activeCheckouts.add(this.actor)
    target.disabled = true
    try {
      await commitCart(this.actor, this.cart)
      ui.notifications.info(`${this.actor.name}: gastou ${this.#cartTotal} de Experiência em ${this.cart.length} compra${this.cart.length === 1 ? '' : 's'}.`)
      this.cart = []
      this.pendingDisciplinePick = null
      this.close()
    } catch (err) {
      console.error('vtm5e-xpshop | Failed to commit cart:', err)
      ui.notifications.error(`Não foi possível concluir as compras: ${err.message}. Confira o saldo e os itens antes de tentar novamente.`)
    } finally {
      activeCheckouts.delete(this.actor)
      target.disabled = false
    }
  }
}

export function openXPShop (actor) {
  if (!actor) {
    ui.notifications.error('vtm5e-xpshop: nenhum ator disponível para abrir a loja.')
    return
  }
  new XPShopApp(actor).render(true)
}

// [vtm5e-ptbr] nome original em ingles de um item traduzido pelo Babele (ou o nome atual, se nao houver)
function enName (doc) {
  return doc?.flags?.babele?.originalName ?? doc?.originalName ?? doc?.name
}
