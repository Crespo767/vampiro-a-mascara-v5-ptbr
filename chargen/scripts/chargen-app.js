import { applyTrackedGrants, clearTrackedGrants, checkRestrictions, checkConflicts, getRatingCap, clanCreationGrants, chargenPurchaseBlock, featureCategory, REQUIRED_SPECIALTY_SKILLS, applyFreeSpecialties, applyDerivedTrackers, extraAdvantagePoints, baseSkillValue, grantedSkillDots, exclusionConflicts, powerRequirementFailures, chronicleTenetsText } from './grant-engine.js'
import { getClanKey } from '../../clans/scripts/clan-key.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

const STEPS = [
  { id: 'concept', label: 'Conceito' },
  { id: 'attributes', label: 'Atributos' },
  { id: 'skills', label: 'Habilidades' },
  { id: 'clan', label: 'Clã' },
  { id: 'predator', label: 'Tipo de Predador' },
  { id: 'meritsflaws', label: 'Qualidades e Defeitos' },
  { id: 'touchstones', label: 'Pilares' },
  { id: 'final', label: 'Toques Finais' }
]

// [vtm5e-ptbr] rótulos exibidos dos grupos (as chaves continuam internas)
const GROUP_LABELS = { physical: 'Físicos', social: 'Sociais', mental: 'Mentais' }

export const ATTRIBUTE_GROUPS = {
  physical: ['strength', 'dexterity', 'stamina'],
  social: ['charisma', 'manipulation', 'composure'],
  mental: ['intelligence', 'wits', 'resolve']
}

export const SKILL_GROUPS = {
  physical: ['athletics', 'brawl', 'craft', 'drive', 'firearms', 'larceny', 'melee', 'stealth', 'survival'],
  social: ['animalken', 'etiquette', 'insight', 'intimidation', 'leadership', 'performance', 'persuasion', 'streetwise', 'subterfuge'],
  mental: ['academics', 'awareness', 'finance', 'investigation', 'medicine', 'occult', 'politics', 'science', 'technology']
}

// Same short hover-tooltip blurbs as the character sheet
// (vtm5e-charactersheet/scripts/shared-context.js) - duplicated here rather
// than imported, same "small standalone lookup per module" convention used
// elsewhere in this project (e.g. Compulsion text, Thin-Blood folder
// detection), so chargen doesn't pick up a real dependency on the character
// sheet module just for tooltip strings.
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

// Corebook Character Summary (p.135-137): "Take one Attribute at 4; three
// Attributes at 3; four Attributes at 2; one Attribute at 1." All 9
// Attributes get assigned - the counts sum to exactly 9, so nothing is
// left at 0 and nothing goes above 4 during chargen.
export const ATTRIBUTE_RATING_QUOTA = { 4: 1, 3: 3, 2: 4, 1: 1 }

// Same source: "Pick one Skill distribution." Each option is an exact
// count of Skills at each rating - not a freeform point pool. Whatever
// Skills aren't covered by the chosen distribution's counts stay at 0.
export const SKILL_DISTRIBUTIONS = {
  jackOfAllTrades: {
    label: 'Pau pra Toda Obra',
    description: '1 habilidade com 3 pontos, 8 habilidades com 2 pontos e 10 habilidades com 1 ponto.',
    quota: { 3: 1, 2: 8, 1: 10 }
  },
  balanced: {
    label: 'Equilibrado',
    description: '3 habilidades com 3 pontos, 5 habilidades com 2 pontos e 7 habilidades com 1 ponto.',
    quota: { 3: 3, 2: 5, 1: 7 }
  },
  specialist: {
    label: 'Especialista',
    description: '1 habilidade com 4 pontos, 3 habilidades com 3 pontos, 3 habilidades com 2 pontos e 3 habilidades com 1 ponto.',
    quota: { 4: 1, 3: 3, 2: 3, 1: 3 }
  }
}

// Corebook Advantages section (p.148-150): Merits/Backgrounds are "up to
// seven dots" (a cap, not a requirement to spend it all), but "you must
// take at least two points of Flaws by the end of character creation" -
// that second half is the one hard requirement the Merits & Flaws step
// gates on.
const MIN_REQUIRED_FLAW_DOTS = 2

// Corebook p.213 "generation" table - minimum Blood Potency per
// generation (the value a freshly-made character starts at; it can only
// go up from there through play, per the same table's max column and the
// "Blood Potency increases with age" rule on the same page).
export const GENERATION_INFO = {
  '4th': { bp: 5, era: 'Matusalém: Abraçado há mais de 1.000 anos' },
  '5th': { bp: 4, era: 'Matusalém: Abraçado há mais de 1.000 anos' },
  '6th': { bp: 3, era: 'Ancião: Abraçado há cerca de 200 a 1.000 anos' },
  '7th': { bp: 3, era: 'Ancião: Abraçado há cerca de 200 a 1.000 anos' },
  '8th': { bp: 2, era: 'Ancião: Abraçado há cerca de 200 a 1.000 anos' },
  '9th': { bp: 2, era: 'Ancião: Abraçado há cerca de 200 a 1.000 anos' },
  '10th': { bp: 1, era: 'Ancilla: Abraçado entre 1780 e 1940, aproximadamente' },
  '11th': { bp: 1, era: 'Ancilla: Abraçado entre 1780 e 1940, aproximadamente' },
  '12th': { bp: 1, era: 'Neófito ou Cria: Abraçado entre 1940 e os últimos 15 anos' },
  '13th': { bp: 1, era: 'Neófito ou Cria: Abraçado entre 1940 e os últimos 15 anos' },
  '14th': { bp: 0, era: 'Cria (sangue-ralo): Abraçado nos últimos 15 anos' },
  '15th': { bp: 0, era: 'Cria (sangue-ralo): Abraçado nos últimos 15 anos' },
  '16th': { bp: 0, era: 'Cria (sangue-ralo): Abraçado nos últimos 15 anos' }
}

export class ChargenApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    tag: 'div',
    window: {
      title: 'Criação de Personagem',
      icon: 'fas fa-dice-d10',
      resizable: true
    },
    position: {
      width: 820,
      height: 620
    },
    actions: {
      goToStep: ChargenApp.#onGoToStep,
      prevStep: ChargenApp.#onPrevStep,
      nextStep: ChargenApp.#onNextStep,
      finishWizard: ChargenApp.#onFinishWizard,
      adjustAttribute: ChargenApp.#onAdjustAttribute,
      adjustSkill: ChargenApp.#onAdjustSkill,
      pickSkillDistribution: ChargenApp.#onPickSkillDistribution,
      adjustMeritFlaw: ChargenApp.#onAdjustMeritFlaw,
      toggleMfFolder: ChargenApp.#onToggleMfFolder,
      toggleMfItem: ChargenApp.#onToggleMfItem,
      removeOwnedFeature: ChargenApp.#onRemoveOwnedFeature,
      toggleThinBloodItem: ChargenApp.#onToggleThinBloodItem
    }
  }

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/chargen/templates/chargen.hbs` }
  }

  // Set by #preserveScroll() right before any render() that should stay on
  // the same spot in the page (a dot click, a folder toggle, a card
  // preview) - _onRender restores it once and clears it. Left null for
  // step-navigation renders (goToStep/nextStep/prevStep), where jumping to
  // the top of the new step's content is the correct behavior.
  #pendingScrollTop = null
  #advancing = false

  // Set instead of (on top of) #pendingScrollTop when the render is
  // triggered by toggling a specific element open/closed. A plain
  // scrollTop restore assumes the pixel distance from the top of the
  // container to everything above the toggle point never changes, which
  // breaks down for a large folder (10+ rows) - a full innerHTML replace
  // invalidates the browser's own scroll-anchoring heuristic, and it can
  // end up "helpfully" adjusting scroll on top of our restore, moving the
  // clicked row instead of leaving it put. Anchoring on the toggled
  // element's own on-screen position (found again by selector after
  // render) sidesteps that entirely - it doesn't matter how much content
  // above or below it changed height, only where the anchor itself ends
  // up relative to where it was.
  #pendingScrollAnchor = null

  // `id` was a hardcoded static string before this - Foundry's ApplicationV2
  // registry keys open windows by id, so a chargen window left open for one
  // actor (e.g. from testing) got silently reused/refocused instead of a
  // fresh one being made when the wizard was opened for a different actor,
  // making it look like data had "leaked" between actors when it was
  // actually just still the same window, still showing the first actor's
  // real data. Same class of bug already fixed this way in vtm5e-xpshop.
  constructor (actor, options = {}) {
    super({ ...options, id: `vtm5e-chargen-wizard-${actor.id}` })
    this.actor = actor
    this.stepIndex = 0
    // Furthest step reached via a *validated* Next click - the top nav
    // lets the player click freely backward, but forward only up to this
    // frontier, so it can't be used to skip a step's completion gate the
    // way the buttons were (nextDisabled only blocked the Next button
    // itself, not the nav). Not persisted across a close/reopen, same as
    // stepIndex itself.
    this.maxStepIndex = 0
    this.clanItems = null
    this.predatorItems = null
    this.meritsFlawsItems = null
    // Merits & Flaws picker UI state - lives on the instance (not the
    // template context) so it survives the this.render() that follows
    // every dot click/search keystroke instead of resetting.
    this.mfSearch = ''
    this.mfSearchFocused = false
    this.openFolders = new Set()
    this.expandedMfIds = new Set()
  }

  // `findAnchor` (optional): a function re-run both now and after render to
  // locate the SAME logical element in each DOM - e.g. "the 3rd
  // toggleMfFolder button" by index, since a raw CSS selector can't
  // express "this specific one" when several elements could share the
  // same identifying attribute (Merits and Flaws can each have their own
  // "Other" folder).
  #preserveScroll (findAnchor = null) {
    const body = this.element?.querySelector('.vtm5e-chargen-body')
    if (body) this.#pendingScrollTop = body.scrollTop

    if (findAnchor) {
      const anchorEl = findAnchor()
      if (anchorEl) this.#pendingScrollAnchor = { findAnchor, top: anchorEl.getBoundingClientRect().top }
    }

    // The DOM gets rebuilt on render, and ApplicationV2 tries to restore
    // focus to the new element matching whatever had it before - which
    // makes the browser auto-scroll that element into view, fighting our
    // manual scrollTop restore below and dragging the clicked row down to
    // the bottom edge of the viewport instead of leaving it in place.
    // Blurring first means there's nothing for it to restore focus to.
    if (document.activeElement instanceof HTMLElement && this.element?.contains(document.activeElement)) {
      document.activeElement.blur()
    }
  }

  async #ensureCompendiumData () {
    if (!this.clanItems) {
      const pack = game.packs.get('vampiro-a-mascara-v5-ptbr.clans')
      this.clanItems = pack ? await pack.getDocuments() : []
    }
    if (!this.predatorItems) {
      const pack = game.packs.get('vampiro-a-mascara-v5-ptbr.predatortypes')
      this.predatorItems = pack ? await pack.getDocuments() : []
    }
    if (!this.meritsFlawsItems) {
      const pack = game.packs.get('vampiro-a-mascara-v5-ptbr.meritsflaws')
      this.meritsFlawsItems = pack ? await pack.getDocuments() : []
    }
  }

  async #ensureTraitBaselines () {
    const flags = this.actor.flags?.[MODULE_ID]
    if (flags?.traitBaselinesInitialized || flags?.wizardCompleted) return

    const updates = {
      [`flags.${MODULE_ID}.attributesInitialized`]: true,
      [`flags.${MODULE_ID}.traitBaselinesInitialized`]: true
    }
    const attributeIds = Object.values(ATTRIBUTE_GROUPS).flat()
    const attributeCounts = this.#ratingCounts('attributes', attributeIds)
    // Older drafts can already have the flag and still show a full row of
    // default ratings. Preserve partial allocations when the flag is set.
    if (Object.keys(attributeCounts).every(rating => rating === '1') &&
        (!flags?.attributesInitialized || attributeCounts[1] === attributeIds.length)) {
      for (const id of attributeIds) {
        if (this.actor.system.attributes?.[id]?.value === 1) updates[`system.attributes.${id}.value`] = 0
      }
    }

    const skillIds = Object.values(SKILL_GROUPS).flat()
    const skillCounts = this.#ratingCounts('skills', skillIds)
    const maxSingleDotSkills = Math.max(...Object.values(SKILL_DISTRIBUTIONS).map(def => def.quota[1]))

    // No points can be assigned here before choosing a distribution. Also
    // repair older drafts with only single dots that exceed every preset.
    if (Object.keys(skillCounts).every(rating => rating === '1') &&
        (!flags?.skillDistribution || skillCounts[1] > maxSingleDotSkills)) {
      for (const id of skillIds) {
        if (baseSkillValue(this.actor, id) > 0) {
          updates[`system.skills.${id}.value`] = grantedSkillDots(this.actor, id)
        }
      }
    }

    await this.actor.update(updates)
  }

  async _prepareContext (_options) {
    await this.#ensureCompendiumData()
    await this.#ensureTraitBaselines()

    const actor = this.actor
    // Os Princípios da Crônica vêm da configuração do mundo; grava-os ao chegar à etapa, se estiverem vazios.
    if (STEPS[this.stepIndex]?.id === 'touchstones' && !(actor.system.headers?.tenets ?? '').trim()) {
      await actor.update({ 'system.headers.tenets': chronicleTenetsText() })
    }
    const currentClan = actor.items.find(i => i.type === 'clan')
    const currentPredator = actor.items.find(i => i.type === 'predatorType')

    const steps = STEPS.map((s, i) => ({
      ...s,
      active: i === this.stepIndex,
      done: i < this.stepIndex && (s.id !== 'clan' || actor.items.some(item => item.type === 'clan')) && (s.id !== 'predator' || actor.items.some(item => item.type === 'predatorType')),
      locked: i > Math.max(this.stepIndex, this.maxStepIndex)
    }))

    const attributes = {}
    for (const [group, ids] of Object.entries(ATTRIBUTE_GROUPS)) {
      attributes[GROUP_LABELS[group] ?? group] = ids.map(id => this.#dotRow('attributes', id))
    }

    const skills = {}
    for (const [group, ids] of Object.entries(SKILL_GROUPS)) {
      skills[GROUP_LABELS[group] ?? group] = ids.map(id => this.#dotRow('skills', id))
    }

    const attributeBudget = this.#buildBudgetRow(ATTRIBUTE_RATING_QUOTA, this.#ratingCounts('attributes', Object.values(ATTRIBUTE_GROUPS).flat()))
    const skillBudget = this.#buildSkillBudget()
    const stepCompletion = this.#currentStepCompletion()

    const currentGeneration = actor.system.headers?.generation ?? ''
    const generationOptions = Object.entries(GENERATION_INFO).map(([gen, info]) => ({
      value: gen,
      label: `${parseInt(gen)}ª Geração (começa com Potência do Sangue ${info.bp})`,
      selected: currentGeneration === gen
    }))
    const embraceDate = actor.system.bio?.dateof?.death ?? ''

    const health = (actor.system.attributes?.stamina?.value ?? 0) + 3
    const willpower = (actor.system.attributes?.resolve?.value ?? 0) + (actor.system.attributes?.composure?.value ?? 0)

    return {
      actor,
      steps,
      currentStepId: STEPS[this.stepIndex].id,
      stepFlags: Object.fromEntries(STEPS.map(s => [`is${s.id.charAt(0).toUpperCase()}${s.id.slice(1)}`, s.id === STEPS[this.stepIndex].id])),
      isFirstStep: this.stepIndex === 0,
      isLastStep: this.stepIndex === STEPS.length - 1,
      nextDisabled: !stepCompletion.complete,
      incompleteMessage: stepCompletion.message ?? '',
      concept: actor.system.headers?.concept ?? '',
      ambition: actor.system.headers?.ambition ?? '',
      desire: actor.system.headers?.desire ?? '',
      attributes,
      attributeBudget,
      skills,
      skillBudget,
      specialties: {
        required: REQUIRED_SPECIALTY_SKILLS.filter(id => baseSkillValue(actor, id) > 0).map(id => ({ ...this.#dotRow('skills', id), value: actor.flags?.[MODULE_ID]?.freeSpecialties?.[id] ?? '' })),
        options: Object.values(SKILL_GROUPS).flat().filter(id => baseSkillValue(actor, id) > 0).map(id => ({ ...this.#dotRow('skills', id), selected: actor.flags?.[MODULE_ID]?.freeSpecialties?.free?.skill === id })),
        freeLabel: actor.flags?.[MODULE_ID]?.freeSpecialties?.free?.label ?? ''
      },
      clans: this.clanItems
        .map(c => ({ id: c.id, name: c.name, img: c.img, description: c.system.description, bane: c.system.bane, selected: currentClan?.name === c.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      currentClan,
      predators: this.predatorItems
        .map(p => {
          const restrictions = p.flags?.['vampiro-a-mascara-v5-ptbr']?.restrictions ?? []
          const reasons = checkRestrictions(actor, restrictions)
          return {
            id: p.id,
            name: p.name,
            img: p.img,
            description: p.system.description,
            selected: currentPredator?.name === p.name,
            unavailable: reasons.length > 0,
            unavailableReason: reasons.join(' ')
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
      currentPredator,
      meritsFlaws: this.#buildMeritsFlawsView(),
      thinBlood: this.#buildThinBloodView(currentClan),
      touchstones: actor.system.headers?.touchstones ?? '',
      tenets: actor.system.headers?.tenets ?? '',
      sire: actor.system.headers?.sire ?? '',
      generation: currentGeneration,
      generationOptions,
      embraceDate,
      health,
      willpower,
      humanity: actor.system.humanity?.value ?? 7,
      bloodPotency: actor.system.blood?.potency ?? 0,
      hunger: actor.system.hunger?.value ?? 1
    }
  }

  #dotRow (category, id) {
    const value = this.actor.system[category]?.[id]?.value ?? 0
    const tooltips = category === 'attributes' ? ATTRIBUTE_TOOLTIPS : SKILL_TOOLTIPS
    return {
      id,
      label: game.i18n.localize(`WOD5E.${category === 'attributes' ? 'AttributesList' : 'SkillsList'}.${id === 'animalken' ? 'AnimalKen' : id.charAt(0).toUpperCase() + id.slice(1)}`),
      tooltip: tooltips[id] || '',
      value,
      dots: [1, 2, 3, 4, 5].map(n => ({ n, filled: n <= value }))
    }
  }

  // Counts how many of the given trait ids currently sit at each nonzero
  // rating. `excludeId` (used by the click handlers) leaves one trait out
  // of its own count so "does raising THIS trait to N still fit the
  // quota" can be checked without the trait's own current value skewing
  // the answer.
  #ratingCounts (category, ids, excludeId = null) {
    const counts = {}
    for (const id of ids) {
      if (id === excludeId) continue
      const value = category === 'skills' ? baseSkillValue(this.actor, id) : (this.actor.system[category]?.[id]?.value ?? 0)
      if (value > 0) counts[value] = (counts[value] || 0) + 1
    }
    return counts
  }

  #buildBudgetRow (quota, counts) {
    return Object.entries(quota)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([rating, allowed]) => {
        const used = counts[rating] || 0
        return { rating: Number(rating), dots: '•'.repeat(Number(rating)), used, allowed, over: used > allowed }
      })
  }

  #buildSkillBudget () {
    const selectedKey = this.actor.flags?.['vampiro-a-mascara-v5-ptbr']?.skillDistribution ?? null
    const selected = selectedKey ? SKILL_DISTRIBUTIONS[selectedKey] : null
    const counts = this.#ratingCounts('skills', Object.values(SKILL_GROUPS).flat())
    return {
      selectedKey,
      distributions: Object.entries(SKILL_DISTRIBUTIONS).map(([key, def]) => ({
        key,
        label: def.label,
        description: def.description,
        selected: key === selectedKey
      })),
      rows: selected ? this.#buildBudgetRow(selected.quota, counts) : []
    }
  }

  // Manual Básico p. 136 e 150: 7 pontos, mais até 2 por decisão do Narrador.
  // Pontos concedidos não contam como compras ou Defeitos voluntários.
  #meritPoolStatus () {
    let meritsSpent = 0
    let flawsSpent = 0
    for (const item of this.actor.items) {
      if (item.type !== 'feature') continue
      const compendiumDoc = this.meritsFlawsItems?.find(d => d.name === item.name)
      const featuretype = compendiumDoc?.system.featuretype ?? item.system.featuretype
      const grantedPoints = item.flags?.['vampiro-a-mascara-v5-ptbr']?.grantedPoints ?? 0
      const purchased = Math.max((item.system.points ?? 0) - grantedPoints, 0)
      if (featuretype === 'flaw') flawsSpent += purchased
      else meritsSpent += purchased
    }
    // Anciões (Mar do Tempo, Manual Básico p. 151) somam 2 pontos de Vantagens; só a criação automática grava essa idade.
    const ancilla = this.actor.flags?.[MODULE_ID]?.seaOfTime === 'ancilla' ? 2 : 0
    const extra = extraAdvantagePoints() + ancilla
    const poolMax = 7 + extra
    return { meritsSpent, flawsSpent, extra, poolMax, remaining: poolMax - meritsSpent }
  }

  // Gates the Next/Finish button on the step actually being finished per
  // the corebook, rather than letting a player skip ahead having only
  // picked, say, one Attribute. Only checks the step currently being LEFT
  // - it's not a full end-to-end audit of the whole wizard.
  #currentStepCompletion () {
    const stepId = STEPS[this.stepIndex].id

    switch (stepId) {
      case 'concept': {
        const headers = this.actor.system.headers ?? {}
        const missing = ['concept', 'ambition', 'desire'].filter(key => !(headers[key] ?? '').trim())
        if (missing.length > 0) {
          return { complete: false, message: `Preencha ${missing.map(m => game.i18n.localize(`WOD5E.BiographyList.${m.charAt(0).toUpperCase() + m.slice(1)}`)).join(', ')} antes de prosseguir.` }
        }
        if (!headers.generation) {
          return { complete: false, message: 'Escolha uma Geração antes de prosseguir: ela determina sua Potência do Sangue inicial.' }
        }
        return { complete: true }
      }

      case 'attributes': {
        const counts = this.#ratingCounts('attributes', Object.values(ATTRIBUTE_GROUPS).flat())
        const missing = Object.entries(ATTRIBUTE_RATING_QUOTA)
          .filter(([rating, allowed]) => (counts[rating] || 0) !== Number(allowed))
          .map(([rating, allowed]) => { const diff = allowed - (counts[rating] || 0); return diff > 0 ? `${diff} a mais em ${'•'.repeat(Number(rating))}` : `${-diff} acima do permitido em ${'•'.repeat(Number(rating))}` })
        return missing.length === 0
          ? { complete: true }
          : { complete: false, message: `A distribuição de Atributos ainda não terminou; faltam: ${missing.join(', ')}.` }
      }

      case 'skills': {
        const distKey = this.actor.flags?.['vampiro-a-mascara-v5-ptbr']?.skillDistribution
        const dist = distKey ? SKILL_DISTRIBUTIONS[distKey] : null
        if (!dist) return { complete: false, message: 'Escolha uma distribuição de Habilidades antes de prosseguir.' }
        const counts = this.#ratingCounts('skills', Object.values(SKILL_GROUPS).flat())
        const missing = Object.entries(dist.quota)
          .filter(([rating, allowed]) => (counts[rating] || 0) !== Number(allowed))
          .map(([rating, allowed]) => {
            const diff = Number(allowed) - (counts[rating] || 0)
            return diff > 0 ? `${diff} a mais em ${'•'.repeat(Number(rating))}` : `${-diff} acima do permitido em ${'•'.repeat(Number(rating))}`
          })
        if (missing.length) return { complete: false, message: `A distribuição ${dist.label} ainda não terminou; faltam: ${missing.join(', ')}.` }
        const specialties = this.actor.flags?.[MODULE_ID]?.freeSpecialties ?? {}
        if (REQUIRED_SPECIALTY_SKILLS.some(id => baseSkillValue(this.actor, id) > 0 && !String(specialties[id] ?? '').trim()) || !baseSkillValue(this.actor, specialties.free?.skill) || !String(specialties.free?.label ?? '').trim()) return { complete: false, message: 'Preencha as Especializações gratuitas e escolha uma Habilidade com pontos para a Especialização livre.' }
        return { complete: true }
      }

      case 'clan':
        return this.actor.items.some(i => i.type === 'clan')
          ? { complete: true }
          : { complete: false, message: 'Escolha um Clã antes de prosseguir.' }

      case 'predator':
        return this.actor.items.some(i => i.type === 'predatorType')
          ? { complete: true }
          : { complete: false, message: 'Escolha um Tipo de Predador antes de prosseguir.' }

      case 'meritsflaws': {
        // "take 2 points of Flaws in addition to the ones gained from your
        // Predator type" (p.136) - the corebook is explicit that this is
        // separate from, not inclusive of, whatever a grant already forced
        // on the character. #meritPoolStatus().flawsSpent already excludes
        // granted dots for exactly this reason, so reuse it here instead of
        // counting all Flaw dots on the sheet.
        const flawsSpent = this.#meritPoolStatus().flawsSpent
        if (flawsSpent < MIN_REQUIRED_FLAW_DOTS) {
          return { complete: false, message: `A criação do livro básico exige pelo menos ${MIN_REQUIRED_FLAW_DOTS} pontos de Defeitos voluntários, além dos concedidos pelo Tipo de Predador (atualmente ${flawsSpent} voluntários).` }
        }

        // Thin-blood characters have a second, separate requirement on top
        // of the normal Flaw minimum above.
        const currentClan = this.actor.items.find(i => i.type === 'clan')
        const thinBlood = this.#buildThinBloodView(currentClan)
        if (thinBlood && !thinBlood.valid) {
          return { complete: false, message: `Personagens sangue-ralo precisam de 1 a 3 Qualidades de Sangue-Ralo e da mesma quantidade de Defeitos de Sangue-Ralo (atualmente ${thinBlood.meritsTaken} Qualidade${thinBlood.meritsTaken === 1 ? '' : 's'}, ${thinBlood.flawsTaken} Defeito${thinBlood.flawsTaken === 1 ? '' : 's'}).` }
        }

        return { complete: true }
      }

      case 'touchstones': {
        const headers = this.actor.system.headers ?? {}
        const missing = ['tenets', 'touchstones'].filter(key => !(headers[key] ?? '').trim())
        return missing.length === 0
          ? { complete: true }
          : { complete: false, message: `Preencha ${missing.includes('touchstones') ? 'Convicções e Pilares' : ''}${missing.length === 2 ? ' e ' : ''}${missing.includes('tenets') ? 'Princípios da Crônica' : ''} antes de prosseguir.` }
      }

      case 'final':
        return (this.actor.system.headers?.sire ?? '').trim()
          ? { complete: true }
          : { complete: false, message: 'Preencha o campo Senhor antes de terminar. Você pode escrever "desconhecido" ou "nenhum".' }

      default:
        return { complete: true }
    }
  }

  auditAllSteps (meritsFlawsItems) {
    this.meritsFlawsItems = meritsFlawsItems
    const previous = this.stepIndex
    try {
      const failures = STEPS.flatMap((step, index) => {
        this.stepIndex = index
        const result = this.#currentStepCompletion()
        return result.complete ? [] : [`${step.label}: ${result.message}`]
      })
      const pool = this.#meritPoolStatus()
      if (pool.meritsSpent !== pool.poolMax) failures.push(`Vantagens: gastos ${pool.meritsSpent} de ${pool.poolMax} pontos.`)
      for (const item of this.actor.items.filter(i => i.type === 'feature')) {
        const reason = chargenPurchaseBlock(this.actor, item)
        if (reason && (item.system.points ?? 0) > (item.flags?.[MODULE_ID]?.grantedPoints ?? 0)) failures.push(reason)
      }
      const applied = this.actor.flags?.[MODULE_ID]?.appliedFreeSpecialties ?? []
      const data = this.actor.flags?.[MODULE_ID]?.freeSpecialties ?? {}
      const expected = REQUIRED_SPECIALTY_SKILLS.filter(id => baseSkillValue(this.actor, id) > 0).map(skill => ({ skill, label: String(data[skill] ?? '').trim() }))
      expected.push({ skill: data.free?.skill, label: String(data.free?.label ?? '').trim() })
      if (applied.length !== expected.length || expected.some((e, i) => e.skill !== applied[i]?.skill || e.label !== applied[i]?.label) || applied.some(e => !(this.actor.system.skills?.[e.skill]?.bonuses ?? []).some(b => b.source === e.label && b.value === 1 && b.paths?.includes(`skills.${e.skill}`)))) failures.push('Especializações gratuitas não foram aplicadas corretamente.')
      const clan = this.actor.items.find(i => i.type === 'clan')
      const grants = clanCreationGrants(clan)
      const clanEntries = this.actor.flags?.[MODULE_ID]?.grantLedger?.clan?.entries ?? []
      const disciplineGrant = grants.find(g => g.type === 'clanDisciplines')
      const dots = clanEntries.filter(e => e.type === 'disciplineDot')
      if (disciplineGrant) {
        const allowed = disciplineGrant.choices.map(c => { const id = typeof c === 'string' ? c : c.discipline; return id === 'bloodsorcery' ? 'sorcery' : id })
        if (dots.length !== 2 || dots[0].amount !== 2 || dots[1].amount !== 1 || dots[0].discipline === dots[1].discipline || dots.some(e => !allowed.includes(e.discipline) || (this.actor.system.disciplines?.[e.discipline]?.value ?? 0) < e.amount)) failures.push('Clã: Disciplinas iniciais inválidas.')
      }
      for (const entry of this.actor.flags?.[MODULE_ID]?.grantLedger?.predator?.entries ?? []) {
        const value = this.actor.system.skills?.[entry.skill]?.value ?? 0
        if (entry.type === 'skillDot' && (value - baseSkillValue(this.actor, entry.skill) !== 1 || baseSkillValue(this.actor, entry.skill) !== 0)) failures.push(`Tipo de Predador: o ponto em ${entry.skill} só vale para Habilidade sem pontos (Manual Básico p. 149).`)
        if (entry.type === 'specialty' && baseSkillValue(this.actor, entry.skill) <= 0) failures.push(`Tipo de Predador: especialização em ${entry.skill}, Habilidade sem pontos (Manual Básico p. 149).`)
      }
      const predatorEntries = this.actor.flags?.[MODULE_ID]?.grantLedger?.predator?.entries ?? []
      if (predatorEntries.some(e => e.type === 'skillDot' && predatorEntries.some(o => o.type === 'specialty' && o.skill === e.skill))) failures.push('Tipo de Predador: concedeu ponto e especialização na mesma Habilidade.')
      if (getClanKey(clan) === 'thin-blooded' && Object.values(this.actor.system.disciplines ?? {}).some(d => d.value > 0)) failures.push('Clã: Sangue-Ralo recebeu Disciplina intrínseca.')
      if (getClanKey(clan) === 'caitiff' && !clanEntries.some(e => e.type === 'meritFlaw' && e.name === 'Suspect' && e.amount === 1)) failures.push('Clã: falta o Defeito Suspeito concedido.')
      for (const power of this.actor.items.filter(i => i.type === 'power')) {
        for (const reason of powerRequirementFailures(this.actor, power)) failures.push(`Disciplinas: ${power.name}: ${reason}`)
      }
      const features = this.actor.items.filter(i => i.type === 'feature')
      for (const [index, item] of features.entries()) {
        const clash = exclusionConflicts(this.actor, item).filter(name => features.findIndex(f => f.name === name) > index)
        if (clash.length) failures.push(`Vantagens e Defeitos: ${item.name} não pode ser combinado com ${clash.join(', ')}.`)
      }
      return failures
    } finally {
      this.stepIndex = previous
    }
  }

  #buildMeritsFlawsView () {
    const pool = this.#meritPoolStatus()
    const search = (this.mfSearch || '').trim().toLowerCase()
    const TYPE_LABELS = { merit: 'Qualidades', background: 'Antecedentes', flaw: 'Defeitos' }

    const byType = { merit: new Map(), background: new Map(), flaw: new Map() }

    for (const doc of this.meritsFlawsItems || []) {
      const featuretype = doc.system.featuretype
      if (!byType[featuretype]) continue
      if (search && !doc.name.toLowerCase().includes(search)) continue

      // Thin-Blood Merits/Flaws only ever show through the dedicated
      // Thin-Blood section above (gated to Thin-Blooded clan by
      // #buildThinBloodView) - excluded here unconditionally rather than
      // relying on each compendium item carrying its own requireClan
      // restriction flag, which depends on a manually-run macro
      // (configure-meritsflaws-clan-only-restrictions.js) staying in sync
      // with whatever's currently in the pack. Folder-name detection can't
      // drift out of date the way a hardcoded name list can.
      if (['thinBloodMerit', 'thinBloodFlaw'].includes(featureCategory(doc))) continue

      const existing = this.actor.items.find(i => i.type === 'feature' && i.name === doc.name)
      const grantedPoints = existing?.flags?.['vampiro-a-mascara-v5-ptbr']?.grantedPoints ?? 0
      const value = existing?.system.points ?? 0
      const plainDesc = doc.system.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

      // Most compendium entries have a fixed canonical rating baked into
      // system.points (e.g. Iron Will is always 2 dots, never 1 or 3) -
      // their dots act as a single toggle at that rating.
      // A handful (mostly Backgrounds, whose description spells out what
      // each dot level means) are stored with points:0 to mean "player
      // picks the level" - those keep the slider.
      const fixedCost = doc.system.points || null

      // Only items the player doesn't already hold can be "unavailable" -
      // an already-owned item (even partially, from a grant) is never
      // greyed out, just possibly capped from going higher (handled by
      // the same check in #setMeritFlawRating when they try to increase).
      let unavailableReasons = []
      const purchaseBlock = chargenPurchaseBlock(this.actor, doc)
      if (purchaseBlock) unavailableReasons.push(purchaseBlock)
      if (!existing) {
        unavailableReasons.push(...checkRestrictions(this.actor, doc.flags?.['vampiro-a-mascara-v5-ptbr']?.restrictions ?? []))
        const conflicts = [...new Set([...checkConflicts(this.actor, doc.name, doc.flags?.['vampiro-a-mascara-v5-ptbr']?.conflictsWith ?? []), ...exclusionConflicts(this.actor, doc)])]
        if (conflicts.length > 0) unavailableReasons = [...unavailableReasons, `Entra em conflito com ${conflicts.join(', ')}, que você já possui.`]
      }

      // Distinct from unavailable (all-or-nothing): a rating cap still lets
      // the item be taken, it just can't go past a certain dot until some
      // other condition is met (e.g. Library capped at 1 without Base Haven
      // 2+) - the capped dots render locked with their own explanation
      // rather than as a normal open pick.
      const ratingCap = fixedCost ? null : getRatingCap(this.actor, doc)
      const ratingCapReason = ratingCap != null ? checkRestrictions(this.actor, [doc.flags['vampiro-a-mascara-v5-ptbr'].ratingCap.unless]).join(' ') : null

      const folderName = doc.folder?.name ?? 'Other'
      if (!byType[featuretype].has(folderName)) byType[featuretype].set(folderName, [])
      byType[featuretype].get(folderName).push({
        id: doc.id,
        name: doc.name,
        // Full text, not truncated - the row is collapsed by default (see
        // .vtm5e-chargen-mf-item-desc's display:none, toggled by
        // toggleMfItem) so there's no clutter cost to showing the whole
        // thing once a player actually expands one.
        description: plainDesc,
        expanded: this.expandedMfIds.has(doc.id),
        value,
        grantedPoints,
        fixedCost,
        fixedSelected: !!fixedCost && value >= fixedCost,
        lockedFixed: !!fixedCost && grantedPoints >= fixedCost,
        unavailable: unavailableReasons.length > 0,
        unavailableReason: unavailableReasons.join(' '),
        dots: Array.from({ length: fixedCost ?? 5 }, (_, index) => {
          const n = index + 1
          return {
            n,
            filled: n <= value,
            locked: n <= grantedPoints,
            capped: ratingCap != null && n > ratingCap && n > grantedPoints,
            capReason: ratingCapReason
          }
        })
      })
    }

    const owned = this.actor.items
      .filter(i => i.type === 'feature')
      .map(i => {
        const compendiumDoc = this.meritsFlawsItems?.find(d => d.name === i.name)
        const featuretype = compendiumDoc?.system.featuretype ?? i.system.featuretype
        const grantedPoints = i.flags?.['vampiro-a-mascara-v5-ptbr']?.grantedPoints ?? 0
        const value = i.system.points ?? 0
        const rawDesc = compendiumDoc?.system.description ?? i.system.description ?? ''
        const plainDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        return {
          name: i.name,
          value,
          dots: Array.from({ length: value }, (_, index) => ({ locked: index < grantedPoints })),
          isGranted: grantedPoints > 0,
          isFlaw: featuretype === 'flaw',
          description: plainDesc.length > 220 ? plainDesc.slice(0, 217) + '…' : plainDesc,
          // Only a purely player-chosen item can be one-click removed here -
          // one that's (even partially) free from a grant needs the player
          // to go find it in the list below, where the locked/purchased
          // split is visible, rather than silently deleting a free dot.
          removable: grantedPoints === 0,
          compendiumId: compendiumDoc?.id ?? null,
          actorItemId: i.id
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const groups = ['merit', 'background', 'flaw'].map(featuretype => ({
      featuretype,
      label: TYPE_LABELS[featuretype],
      folders: [...byType[featuretype].entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, items]) => ({
          name,
          // Folders auto-expand while searching so matches aren't hidden
          // behind a collapsed header the player never asked to open.
          open: this.openFolders.has(name) || !!search,
          items: items.sort((a, b) => a.name.localeCompare(b.name))
        }))
    }))

    return { ...pool, overBudget: pool.remaining < 0, search: this.mfSearch || '', owned, groups }
  }

  // Thin-blood characters get a second, separate pool on top of the
  // normal Merits & Flaws budget above: "between one and three Thin-Blood
  // Merits and the same number of Thin-Blood Flaws" (p.148-150), free of
  // dot cost and not counted against the 7-point pool. Returns null for
  // any non-Thin-Blooded clan so the template can skip the section
  // entirely.
  #buildThinBloodView (currentClan) {
    if (getClanKey(currentClan) !== 'thin-blooded') return null

    const merits = []
    const flaws = []
    for (const doc of this.meritsFlawsItems || []) {
      const isFlaw = featureCategory(doc) === 'thinBloodFlaw'
      const isMerit = featureCategory(doc) === 'thinBloodMerit'
      if (!isFlaw && !isMerit) continue

      const existing = this.actor.items.find(i => i.type === 'feature' && i.name === doc.name)
      const plainDesc = doc.system.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const entry = {
        id: doc.id,
        name: doc.name,
        description: plainDesc.length > 160 ? plainDesc.slice(0, 157) + '…' : plainDesc,
        taken: !!existing
      }
      if (isFlaw) flaws.push(entry)
      else merits.push(entry)
    }
    merits.sort((a, b) => a.name.localeCompare(b.name))
    flaws.sort((a, b) => a.name.localeCompare(b.name))

    const meritsTaken = merits.filter(m => m.taken).length
    const flawsTaken = flaws.filter(f => f.taken).length

    return {
      merits,
      flaws,
      meritsTaken,
      flawsTaken,
      valid: meritsTaken >= 1 && meritsTaken <= 3 && meritsTaken === flawsTaken
    }
  }

  async _onRender (context, options) {
    super._onRender(context, options)
    if (this.#advancing) this.element.querySelectorAll('[data-action="nextStep"], [data-action="prevStep"], [data-action="goToStep"]').forEach(button => { button.disabled = true })

    if (this.#pendingScrollTop !== null || this.#pendingScrollAnchor !== null) {
      const targetScrollTop = this.#pendingScrollTop
      const anchor = this.#pendingScrollAnchor
      this.#pendingScrollTop = null
      this.#pendingScrollAnchor = null

      const restore = () => {
        const body = this.element?.querySelector('.vtm5e-chargen-body')
        if (!body) return
        if (anchor) {
          const anchorEl = anchor.findAnchor()
          if (anchorEl) {
            body.scrollTop += anchorEl.getBoundingClientRect().top - anchor.top
            return
          }
        }
        if (targetScrollTop !== null) body.scrollTop = targetScrollTop
      }
      // Set it now, then again after paint - belt and suspenders against
      // any late focus/layout adjustment (Foundry's own or the browser's)
      // still trying to scroll something into view after this point.
      restore()
      requestAnimationFrame(restore)
    }

    this.element.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('change', async (event) => {
        const field = event.currentTarget.dataset.field
        const value = event.currentTarget.value
        // Mantém a posição: os campos de Especialização ficam no fim da etapa de Habilidades.
        this.#preserveScroll()
        await this.actor.update({ [field]: value })
        // Re-render so the Next button's gate (e.g. Concept/Ambition/Desire
        // on the concept step) picks up the new value immediately - 'change'
        // only fires on blur/enter, so focus is already gone and there's
        // nothing to preserve.
        this.render()
      })
    })

    // Bound directly per-element (each listener closes over ITS OWN id)
    // rather than going through Foundry's shared data-action delegation -
    // ruling out any possibility of a click resolving against the wrong
    // element after a re-render reshuffles the grid.
    this.element.querySelectorAll('[data-clan-id]').forEach(el => {
      const clanId = el.dataset.clanId
      el.addEventListener('click', () => this.#pickClan(clanId))
    })

    this.element.querySelectorAll('[data-predator-id]').forEach(el => {
      const predatorId = el.dataset.predatorId
      el.addEventListener('click', () => this.#pickPredator(predatorId))
    })

    // Every keystroke triggers a render() (so results/pool totals update
    // live), which rebuilds the DOM out from under the input - so focus
    // and caret position have to be explicitly restored afterward or
    // typing loses focus after the first character.
    const mfSearchEl = this.element.querySelector('#vtm5e-chargen-mf-search')
    if (mfSearchEl) {
      mfSearchEl.addEventListener('input', (event) => {
        this.mfSearch = event.currentTarget.value
        this.#preserveScroll()
        this.render()
      })
      mfSearchEl.addEventListener('focus', () => { this.mfSearchFocused = true })
      mfSearchEl.addEventListener('blur', () => { this.mfSearchFocused = false })
      if (this.mfSearchFocused) {
        mfSearchEl.focus()
        const pos = mfSearchEl.value.length
        mfSearchEl.setSelectionRange(pos, pos)
      }
    }

    const genSelect = this.element.querySelector('#vtm5e-chargen-generation-select')
    if (genSelect) {
      genSelect.addEventListener('change', async (event) => {
        const gen = event.currentTarget.value
        const info = GENERATION_INFO[gen]
        this.#preserveScroll()
        await this.actor.update({
          'system.headers.generation': gen,
          'system.blood.generation': gen,
          'system.blood.potency': info?.bp ?? 0,
          // Abstracts an Embrace date from generation per the corebook's
          // Sea of Time / generation tables (p.136-137, p.213) - a
          // suggestion, not a fixed value, so it's a plain editable text
          // field afterward (Final Touches), not re-derived on every
          // render.
          'system.bio.dateof.death': info?.era ?? ''
        })
        this.render()
      })
    }
  }

  async #applyPendingClanGrants () {
    const clanItem = this.actor.items.find(i => i.type === 'clan')
    if (!clanItem) return
    // Fichas de antes da 1.3.0 guardam 1 ponto de Disciplina de clã: refaz pela regra 2+1 (p. 136) e pelo Suspeito dos Caitiff (p. 107).
    const grants = clanCreationGrants(clanItem)
    const entries = this.actor.flags?.[MODULE_ID]?.grantLedger?.clan?.entries
    const dots = (entries ?? []).filter(e => e.type === 'disciplineDot')
    const outdated = entries && ((grants.some(g => g.type === 'clanDisciplines') && !(dots.length === 2 && dots[0].amount === 2 && dots[1].amount === 1)) ||
      (grants.some(g => g.type === 'flaw' && g.name === 'Suspect') && !entries.some(e => e.type === 'meritFlaw' && e.name === 'Suspect')))
    if (outdated) {
      await clearTrackedGrants(this.actor, 'clan')
      ui.notifications.info('Os benefícios do Clã foram refeitos pela regra atual do Manual Básico (Disciplinas 2+1).')
    }
    await applyTrackedGrants(this.actor, {
      slot: 'clan',
      pickLabel: 'Clã',
      name: clanItem.name,
      sourceLabel: `Clã: ${clanItem.name}`,
      grants: clanCreationGrants(clanItem)
    })
  }

  async #applyPendingPredatorGrants () {
    const predItem = this.actor.items.find(i => i.type === 'predatorType')
    if (!predItem) return
    await applyTrackedGrants(this.actor, {
      slot: 'predator',
      pickLabel: 'Tipo de Predador',
      name: predItem.name,
      sourceLabel: `Tipo de Predador: ${predItem.name}`,
      grants: predItem.flags?.['vampiro-a-mascara-v5-ptbr']?.grants ?? []
    })
  }

  static async #onGoToStep (event, target) {
    if (this.#advancing) return
    const id = target.dataset.step
    const idx = STEPS.findIndex(s => s.id === id)
    if (idx < 0) return

    // Free to jump backward (or to the current step) - only forward jumps
    // past the frontier reached via a validated Next click are gated, same
    // rule the Next button already enforces.
    if (idx > Math.max(this.stepIndex, this.maxStepIndex)) {
      ui.notifications.warn('Conclua a etapa atual antes de avançar.')
      return
    }

    if (idx > this.stepIndex) {
      const previous = this.stepIndex
      try {
        for (let i = previous; i < idx; i++) {
          this.stepIndex = i
          const completion = this.#currentStepCompletion()
          if (!completion.complete) { ui.notifications.warn(completion.message); return }
          const stepId = STEPS[i].id
          if (stepId === 'clan' || stepId === 'predator') {
            const item = this.actor.items.find(entry => entry.type === (stepId === 'clan' ? 'clan' : 'predatorType'))
            const label = stepId === 'clan' ? 'Clã' : 'Tipo de Predador'
            if (this.actor.flags?.['vampiro-a-mascara-v5-ptbr']?.grantLedger?.[stepId]?.sourceLabel !== `${label}: ${item.name}`) {
              ui.notifications.warn(`Use Avançar para concluir ${label}.`)
              return
            }
          }
        }
      } finally { this.stepIndex = previous }
    }

    if (STEPS[this.stepIndex].id === 'skills' && idx !== this.stepIndex) {
      const completion = this.#currentStepCompletion()
      if (idx > this.stepIndex && !completion.complete) { ui.notifications.warn(completion.message); return }
      await applyFreeSpecialties(this.actor)
    }
    this.stepIndex = idx
    this.render()
  }

  static async #onPrevStep () {
    if (this.#advancing) return
    if (STEPS[this.stepIndex].id === 'skills') await applyFreeSpecialties(this.actor)
    this.stepIndex = Math.max(0, this.stepIndex - 1)
    this.render()
  }

  static async #onNextStep () {
    if (this.#advancing) return
    // Defense in depth - the button is already disabled when incomplete,
    // but don't rely on that alone.
    const completion = this.#currentStepCompletion()
    if (!completion.complete) {
      ui.notifications.warn(completion.message)
      return
    }

    this.#advancing = true
    this.element.querySelectorAll('[data-action="nextStep"], [data-action="prevStep"], [data-action="goToStep"]').forEach(button => { button.disabled = true })
    try {
      const leavingStepId = STEPS[this.stepIndex].id

      // As concessões são aplicadas ao sair da etapa, após a escolha.
      if (leavingStepId === 'attributes') await applyDerivedTrackers(this.actor)
      if (leavingStepId === 'skills') await applyFreeSpecialties(this.actor)
      if (leavingStepId === 'clan') {
        try { await this.#applyPendingClanGrants() } catch (error) { ui.notifications.warn(error.message); return }
      }
      if (leavingStepId === 'predator') {
        try { await this.#applyPendingPredatorGrants() } catch (error) { ui.notifications.warn(error.message); return }
      }

      const afterGrants = this.#currentStepCompletion()
      if (!afterGrants.complete) { ui.notifications.warn(afterGrants.message); return }

      this.stepIndex = Math.min(STEPS.length - 1, this.stepIndex + 1)
      this.maxStepIndex = Math.max(this.maxStepIndex, this.stepIndex)
    } finally {
      this.#advancing = false
      this.render()
    }
  }

  static async #onFinishWizard () {
    const completion = this.#currentStepCompletion()
    if (!completion.complete) {
      ui.notifications.warn(completion.message)
      return
    }

    // Captured before the flag is set below - only a genuinely first-ever
    // Finish should grant starting wealth. A GM reopening an already-
    // completed wizard and clicking Finish again must never re-run this and
    // clobber cash the player has since spent in the Gear Shop.
    const alreadyCompleted = !!this.actor.getFlag('vampiro-a-mascara-v5-ptbr', 'wizardCompleted')

    // Só na primeira conclusão: reabrir o assistente depois não zera o dano sofrido em jogo.
    if (!alreadyCompleted) await applyDerivedTrackers(this.actor)
    await this.actor.setFlag('vampiro-a-mascara-v5-ptbr', 'wizardCompleted', true)
    ui.notifications.info(`A criação de personagem de ${this.actor.name} foi concluída.`)

    if (!alreadyCompleted) await ChargenApp.#ensurePhoneForActor(this.actor)

    // Soft integration, same spirit as vtm5e-charactersheet's soft xpshop
    // check - chargen works standalone if vtm5e-gearshop isn't installed.
    const gearshop = game.modules.get('vtm5e-gearshop')
    if (!alreadyCompleted && gearshop?.active) {
      const cents = await gearshop.api.grantStartingWealth(this.actor)
      const dollars = (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
      ui.notifications.info(`${this.actor.name} começa com ${dollars}. Use o aplicativo Loja no celular para adquirir equipamentos.`)
    }

    this.close()
  }

  // Best-effort phone provisioning so the Gear Shop (and the rest of
  // smartphone-widget) is actually reachable right after chargen without a
  // manual GM step. A phone in that module lives in a GM-only world Setting
  // - even the "create one" call has to run on the GM's own client, so this
  // goes through the same socket-relay pattern smartphone-widget's own
  // BankingApp/FirstTimeSetupWizard use (SmartphoneWidget.SOCKET.
  // executeAsGM('createNewPhone', {ownerId})) rather than writing the
  // setting directly, which a player-context client can't do. Requires the
  // GM to be online to actually resolve - fails soft with a clear warning
  // if not, same as this project's other best-effort integrations.
  static async #ensurePhoneForActor (actor) {
    const smartphone = game.modules.get('smartphone-widget')
    if (!smartphone?.active) return

    try {
      const { SmartphoneWidget } = await import('/modules/smartphone-widget/scripts/core/SmartphoneWidget.js')
      const existing = await SmartphoneWidget.getPhoneForActor(actor.id)
      if (existing) return

      const result = await SmartphoneWidget.SOCKET.executeAsGM('createNewPhone', { ownerId: actor.id })
      if (result?.success) {
        ui.notifications.info(`${actor.name} recebeu um celular com o aplicativo Loja pronto para usar.`)
      } else {
        console.warn('vtm5e-chargen | createNewPhone did not succeed:', result)
        ui.notifications.warn(`Não foi possível criar um celular para ${actor.name} automaticamente. O Narrador precisa adicioná-lo nas configurações do Smartphone Widget.`)
      }
    } catch (err) {
      console.warn('vtm5e-chargen | Phone auto-provisioning failed (GM likely offline):', err)
      ui.notifications.warn(`Não foi possível criar um celular para ${actor.name} automaticamente. O Narrador precisa adicioná-lo nas configurações do Smartphone Widget.`)
    }
  }

  static async #onAdjustAttribute (event, target) {
    const id = target.dataset.attribute
    const n = Number(target.dataset.n)
    const current = this.actor.system.attributes?.[id]?.value ?? 0
    const next = current === n ? n - 1 : n

    if (next > current) {
      const allowed = ATTRIBUTE_RATING_QUOTA[next]
      const counts = this.#ratingCounts('attributes', Object.values(ATTRIBUTE_GROUPS).flat(), id)
      if (!allowed || (counts[next] || 0) >= allowed) {
        ui.notifications.warn(`A criação do livro básico permite apenas ${allowed ?? 0} Atributo${allowed === 1 ? '' : 's'} em ${'•'.repeat(next)}, e o limite já foi atingido. Reduza outro Atributo para transferir um ponto para cá.`)
        return
      }
    }

    await this.actor.update({ [`system.attributes.${id}.value`]: next })
    this.#preserveScroll()
    this.render()
  }

  static async #onAdjustSkill (event, target) {
    const id = target.dataset.skill
    const n = Number(target.dataset.n)
    const current = this.actor.system.skills?.[id]?.value ?? 0
    const next = current === n ? n - 1 : n

    if (next > current) {
      const distKey = this.actor.flags?.['vampiro-a-mascara-v5-ptbr']?.skillDistribution
      const dist = distKey ? SKILL_DISTRIBUTIONS[distKey] : null
      if (!dist) {
        ui.notifications.warn('Escolha uma distribuição de Habilidades acima antes de atribuir pontos.')
        return
      }
      const allowed = dist.quota[next]
      const counts = this.#ratingCounts('skills', Object.values(SKILL_GROUPS).flat(), id)
      if (!allowed || (counts[next] || 0) >= allowed) {
        ui.notifications.warn(`A distribuição ${dist.label} permite apenas ${allowed ?? 0} Habilidade${allowed === 1 ? '' : 's'} em ${'•'.repeat(next)}, e o limite já foi atingido.`)
        return
      }
    }

    await this.actor.update({ [`system.skills.${id}.value`]: next })
    this.#preserveScroll()
    this.render()
  }

  static async #onPickSkillDistribution (event, target) {
    const key = target.dataset.distribution
    await this.actor.setFlag('vampiro-a-mascara-v5-ptbr', 'skillDistribution', key)
    this.#preserveScroll()
    this.render()
  }

  static #onToggleMfFolder (event, target) {
    const name = target.dataset.folder
    if (this.openFolders.has(name)) this.openFolders.delete(name)
    else this.openFolders.add(name)

    // Anchor on this exact button, not just "a button named X" - Merits
    // and Flaws can each have their own "Other" folder, so the name alone
    // isn't guaranteed unique. Position among all folder-toggle buttons
    // is stable across the re-render since the list itself doesn't
    // reorder from a single toggle.
    const index = Array.from(this.element.querySelectorAll('[data-action="toggleMfFolder"]')).indexOf(target)
    const findAnchor = index >= 0
      ? () => this.element.querySelectorAll('[data-action="toggleMfFolder"]')[index] ?? null
      : null
    this.#preserveScroll(findAnchor)
    this.render()
  }

  static #onToggleMfItem (event, target) {
    const id = target.dataset.mfItemId
    if (this.expandedMfIds.has(id)) this.expandedMfIds.delete(id)
    else this.expandedMfIds.add(id)

    const index = Array.from(this.element.querySelectorAll('[data-action="toggleMfItem"]')).indexOf(target)
    const findAnchor = index >= 0
      ? () => this.element.querySelectorAll('[data-action="toggleMfItem"]')[index] ?? null
      : null
    this.#preserveScroll(findAnchor)
    this.render()
  }

  // Fallback for the Currently Acquired list's remove button when an item
  // has no matching compendium doc to look up (a placeholder auto-created
  // for a grant that named something not yet in vtm5e-meritsflaws) -
  // #onAdjustMeritFlaw can't handle that case since it keys off a
  // compendium id, so this just deletes the actor's own item directly.
  static async #onRemoveOwnedFeature (event, target) {
    const itemId = target.dataset.itemId
    const item = this.actor.items.get(itemId)
    if (!item) return
    this.#preserveScroll()
    await this.actor.deleteEmbeddedDocuments('Item', [itemId])
    this.render()
  }

  static async #onToggleThinBloodItem (event, target) {
    await this.#toggleThinBloodItem(target.dataset.tbId)
  }

  async #toggleThinBloodItem (compendiumId) {
    const doc = this.meritsFlawsItems.find(d => d.id === compendiumId)
    if (!doc) {
      console.warn('vtm5e-chargen | #toggleThinBloodItem: no item found for id', compendiumId)
      return
    }

    const isFlaw = featureCategory(doc) === 'thinBloodFlaw'
    const kindLabel = isFlaw ? 'Defeito' : 'Qualidade'
    const existing = this.actor.items.find(i => i.type === 'feature' && i.name === doc.name)

    if (!existing) {
      const sameCategoryNames = new Set(
        (this.meritsFlawsItems || [])
          .filter(d => featureCategory(d) === (isFlaw ? 'thinBloodFlaw' : 'thinBloodMerit'))
          .map(d => d.name)
      )
      const currentCount = this.actor.items.filter(i => i.type === 'feature' && sameCategoryNames.has(i.name)).length
      if (currentCount >= 3) {
        ui.notifications.warn(`Personagens sangue-ralo podem escolher no máximo 3 ${kindLabel}s de Sangue-Ralo.`)
        return
      }
    }

    try {
      if (existing) {
        await this.actor.deleteEmbeddedDocuments('Item', [existing.id])
      } else {
        const data = doc.toObject()
        delete data._id
        delete data.ownership
        // Thin-Blood Merits/Flaws "have no dot value" (p.182-183) - taking
        // one is a presence/absence toggle, not a rated purchase.
        data.system.points = 0
        await this.actor.createEmbeddedDocuments('Item', [data])
      }
      this.#preserveScroll()
      this.render()
    } catch (err) {
      console.error('vtm5e-chargen | Failed to toggle Thin-Blood item:', err)
      ui.notifications.error(`vtm5e-chargen: não foi possível alterar ${doc.name} (${err.message}). Consulte o console.`)
    }
  }

  static async #onAdjustMeritFlaw (event, target) {
    const mfId = target.dataset.mfId
    const n = Number(target.dataset.n)
    await this.#setMeritFlawRating(mfId, n)
  }

  async #setMeritFlawRating (compendiumId, clickedN) {
    const doc = this.meritsFlawsItems.find(d => d.id === compendiumId)
    if (!doc) {
      console.warn('vtm5e-chargen | #setMeritFlawRating: no item found for id', compendiumId)
      return
    }

    const existing = this.actor.items.find(i => i.type === 'feature' && i.name === doc.name)
    const grantedPoints = existing?.flags?.['vampiro-a-mascara-v5-ptbr']?.grantedPoints ?? 0
    // Strictly less-than, not <=: a click AT the granted floor (including
    // the remove button, which always sends 0) must be allowed through when
    // grantedPoints is 0 - there's nothing free to protect. The old <=
    // silently no-op'd every "remove" click on a purely player-purchased
    // item, since 0 <= 0 is true. Only a click that would dip BELOW the
    // free portion (e.g. grantedPoints:2, clickedN:1) should be blocked.
    if (clickedN < grantedPoints) return

    const currentValue = existing?.system.points ?? 0
    const fixedCost = doc.system.points || null
    let nextValue
    if (fixedCost) {
      // Clicking the dots toggles the fixed rating. The remove button sends 0.
      nextValue = clickedN === 0 || currentValue >= fixedCost ? 0 : fixedCost
    } else {
      // Same click convention as adjustAttribute/adjustSkill: clicking the
      // current top dot reduces by one, clicking any other dot sets to it.
      nextValue = currentValue === clickedN ? clickedN - 1 : clickedN
    }
    nextValue = Math.max(nextValue, grantedPoints)

    const currentPurchased = Math.max(currentValue - grantedPoints, 0)
    const nextPurchased = Math.max(nextValue - grantedPoints, 0)
    const delta = nextPurchased - currentPurchased

    // Only check restrictions/conflicts when actually taking/increasing -
    // never trap a player who already has something into being unable to
    // lower or remove it.
    if (delta > 0) {
      const purchaseBlock = chargenPurchaseBlock(this.actor, doc)
      if (purchaseBlock) { ui.notifications.error(purchaseBlock); return }
      const restrictions = doc.flags?.['vampiro-a-mascara-v5-ptbr']?.restrictions ?? []
      const restrictionFailures = checkRestrictions(this.actor, restrictions)
      if (restrictionFailures.length > 0) {
        ui.notifications.error(`Não é possível escolher ${doc.name}: ${restrictionFailures.join(' ')}`)
        return
      }
      const ratingCap = getRatingCap(this.actor, doc)
      if (ratingCap != null && nextValue > ratingCap) {
        ui.notifications.error(`${doc.name} está limitado a ${ratingCap} ponto(s) até que você cumpra o requisito.`)
        return
      }
      if (!existing) {
        const conflictsWith = doc.flags?.['vampiro-a-mascara-v5-ptbr']?.conflictsWith ?? []
        const conflicts = checkConflicts(this.actor, doc.name, conflictsWith)
        if (conflicts.length > 0) {
          ui.notifications.error(`Não é possível escolher ${doc.name}: entra em conflito com ${conflicts.join(', ')}, que você já possui.`)
          return
        }
      }
    }

    if (delta > 0 && doc.system.featuretype !== 'flaw') {
      const pool = this.#meritPoolStatus()
      if (delta > pool.remaining) {
        ui.notifications.warn(`Pontos de Qualidades/Antecedentes insuficientes: restam ${pool.remaining}; ${doc.name} precisa de mais ${delta}.`)
        return
      }
    }

    try {
      if (!existing) {
        const data = doc.toObject()
        delete data._id
        delete data.ownership
        data.system.points = nextValue
        foundry.utils.setProperty(data, 'flags.vampiro-a-mascara-v5-ptbr.grantedPoints', 0)
        await this.actor.createEmbeddedDocuments('Item', [data])
      } else if (nextValue <= 0 && grantedPoints <= 0) {
        await this.actor.deleteEmbeddedDocuments('Item', [existing.id])
      } else {
        await existing.update({ 'system.points': nextValue })
      }
      this.#preserveScroll()
      this.render()
    } catch (err) {
      console.error('vtm5e-chargen | Failed to adjust Merit/Flaw:', err)
      ui.notifications.error(`vtm5e-chargen: não foi possível ajustar ${doc.name} (${err.message}). Consulte o console.`)
    }
  }

  // #pickPredator already blocks picking a Predator Type that the CURRENT
  // Clan excludes - but the wizard lets a player revisit an earlier step,
  // so the reverse order (Predator Type picked first, Clan changed to one
  // that excludes it afterward) was never re-checked, silently leaving an
  // invalid combination on the sheet. Called after every Clan change.
  async #revalidatePredatorAgainstClan () {
    const predItem = this.actor.items.find(i => i.type === 'predatorType')
    if (!predItem) return
    const restrictions = predItem.flags?.['vampiro-a-mascara-v5-ptbr']?.restrictions ?? []
    const failures = checkRestrictions(this.actor, restrictions)
    if (failures.length === 0) return

    ui.notifications.warn(`Seu Tipo de Predador (${predItem.name}) não é mais compatível com seu Clã: ${failures.join(' ')} Ele foi removido; escolha outro.`)
    await clearTrackedGrants(this.actor, 'predator')
    await this.actor.deleteEmbeddedDocuments('Item', [predItem.id])
  }

  async #pickClan (clanId) {
    if (this.#advancing) return
    const clanDoc = this.clanItems.find(c => c.id === clanId)
    if (!clanDoc) {
      console.warn('vtm5e-chargen | #pickClan: no clan found in this.clanItems for id', clanId, this.clanItems)
      return
    }

    const existingClanItems = this.actor.items.filter(i => i.type === 'clan')
    if (existingClanItems.length === 1 && existingClanItems[0].name === clanDoc.name) return

    try {
      // Delete EVERY existing clan item, not just the first one found.
      // wod5e's "limitOnePerActor" is only enforced by the sheet's own
      // drag-drop handler, not by Actor#createEmbeddedDocuments, so
      // calling that API directly (as this wizard does) never replaces an
      // existing clan on its own - and if more than one ever accumulated
      // (e.g. from an earlier version of this handler that only deleted
      // one), .find() picking "the current clan" becomes effectively
      // unpredictable depending on collection ordering after each
      // delete+create. Always clearing the full set keeps exactly one.
      if (existingClanItems.length > 0) {
        await this.actor.deleteEmbeddedDocuments('Item', existingClanItems.map(i => i.id))
      }

      // Only sets the pick and shows its description - grants are applied
      // when the player clicks Next, not immediately on click.
      const data = clanDoc.toObject()
      delete data._id
      delete data.ownership
      await this.actor.createEmbeddedDocuments('Item', [data])
      await this.#revalidatePredatorAgainstClan()
      this.#preserveScroll()
      this.render()
    } catch (err) {
      console.error('vtm5e-chargen | Failed to set Clan:', err)
      ui.notifications.error(`vtm5e-chargen: não foi possível definir o Clã (${err.message}). Consulte o console.`)
    }
  }

  async #pickPredator (predatorId) {
    if (this.#advancing) return
    const predDoc = this.predatorItems.find(p => p.id === predatorId)
    if (!predDoc) {
      console.warn('vtm5e-chargen | #pickPredator: no predator type found in this.predatorItems for id', predatorId, this.predatorItems)
      return
    }

    const existingPredatorItems = this.actor.items.filter(i => i.type === 'predatorType')
    if (existingPredatorItems.length === 1 && existingPredatorItems[0].name === predDoc.name) return

    const restrictions = predDoc.flags?.['vampiro-a-mascara-v5-ptbr']?.restrictions ?? []
    const failures = checkRestrictions(this.actor, restrictions)
    if (failures.length > 0) {
      ui.notifications.error(`Não é possível escolher ${predDoc.name}: ${failures.join(' ')}`)
      return
    }

    try {
      // Delete EVERY existing predatorType item, not just the first one
      // found - see the matching comment in #pickClan for why.
      if (existingPredatorItems.length > 0) {
        await this.actor.deleteEmbeddedDocuments('Item', existingPredatorItems.map(i => i.id))
      }

      const data = predDoc.toObject()
      delete data._id
      delete data.ownership
      await this.actor.createEmbeddedDocuments('Item', [data])
      this.#preserveScroll()
      this.render()
    } catch (err) {
      console.error('vtm5e-chargen | Failed to set Predator Type:', err)
      ui.notifications.error(`vtm5e-chargen: não foi possível definir o Tipo de Predador (${err.message}). Consulte o console.`)
    }
  }
}

export function openChargenWizard (actor) {
  if (!actor) {
    ui.notifications.error('vtm5e-chargen: primeiro escolha ou informe um ator (por exemplo, selecione um token ou informe game.actors.get(id)).')
    return
  }
  new ChargenApp(actor).render(true)
}
