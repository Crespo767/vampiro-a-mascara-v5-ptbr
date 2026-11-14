// Applies flags.vampiro-a-mascara-v5-ptbr.grants entries (see vtm5e-predatortypes /
// vtm5e-clans / vtm5e-meritsflaws for where that data lives) onto an
// actor. Anything with a `choices` array pauses on a DialogV2 prompt;
// anything without one applies immediately. Every application - automatic
// or chosen - gets pushed onto `log` (an array the caller renders/persists)
// AND posted as a chat message, so the player always has a durable record
// of what happened, not just a toast that can be missed.

const MERITSFLAWS_PACK_ID = 'vampiro-a-mascara-v5-ptbr.meritsflaws'
const DISCIPLINES_PACK_ID = 'vampiro-a-mascara-v5-ptbr.disciplines'

// Short, hover-tooltip-only blurbs - not rules text, just enough for a
// player to recognize what they're picking between without leaving the
// dialog. Full text always lives on the compendium item itself.
const DISCIPLINE_BLURBS = {
  animalism: 'Comande animais e comunique-se com eles e com a Besta interior.',
  auspex: 'Sentidos aguçados, telepatia e percepção sobrenatural.',
  bloodsorcery: 'Magia ritual realizada com vitae (Tremere, Banu Haqim).',
  celerity: 'Velocidade e reflexos sobrenaturais.',
  dominate: "Subjugue a mente e a vontade de uma vítima.",
  fortitude: 'Resistência sobrenatural a danos.',
  obfuscate: 'Torne-se invisível, passe despercebido ou disfarce-se.',
  oblivion: 'Comande as sombras e o toque da morte.',
  potence: 'Força sobrenatural.',
  presence: 'Carisma sobrenatural e controle das emoções.',
  protean: 'Mudança de forma e comunhão com a terra e os animais.'
}

// The clan-grant data above spells Blood Sorcery "bloodsorcery" as one word,
// but wod5e's own canonical discipline id (system/api/def/disciplines.js)
// is "sorcery" - Power items' system.discipline field uses the real id.
// Same alias map as vtm5e-xpshop/scripts/xp-shop-app.js.
const DISCIPLINE_ID_ALIASES = { bloodsorcery: 'sorcery' }

let _disciplinePowersCache = null
async function getDisciplinePowers () {
  if (!_disciplinePowersCache) {
    const pack = game.packs.get(DISCIPLINES_PACK_ID)
    _disciplinePowersCache = pack ? await pack.getDocuments() : []
  }
  return _disciplinePowersCache
}

// Prompts for a specific Power at the newly-gained level, styled as a
// clickable card list (matching vtm5e-xpshop's power picker, which is where
// this pattern originated - reused here after Jake liked the look during
// XP-shop testing and asked for the same experience during chargen's own
// Discipline-dot grants, not just level-ups). Returns the chosen compendium
// Item document, or null if skipped/nothing available - callers must
// tolerate null and just grant the bare dot in that case, never block
// grant application on a pick existing.
async function promptDisciplinePowerPick (actor, disciplineId, level, sourceLabel) {
  const allPowers = await getDisciplinePowers()
  const ownedPowerNames = new Set(actor.items.filter(i => i.type === 'power').map(i => i.name))
  const candidates = allPowers
    .filter(doc => {
      const docDisciplineId = DISCIPLINE_ID_ALIASES[doc.system.discipline] ?? doc.system.discipline
      return docDisciplineId === disciplineId && Number(doc.system.level) === level
    })
    .filter(doc => !ownedPowerNames.has(doc.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (candidates.length === 0) return null

  const itemsHtml = candidates.map(doc => {
    const plainDesc = (doc.system.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const shortDesc = plainDesc.length > 200 ? plainDesc.slice(0, 197) + '…' : plainDesc
    // Both the short and full text ship in the DOM up front (not fetched
    // on expand) - this dialog is raw static HTML with no re-render loop
    // like the ApplicationV2 apps, so toggling visibility client-side is
    // simpler than trying to swap textContent in place.
    return `<div class="vtm5e-chargen-power-item" data-power-id="${doc.id}">
      <div class="vtm5e-chargen-power-item-header" data-expand-toggle>
        <span class="vtm5e-chargen-power-name">${doc.name}</span>
        <i class="fas fa-chevron-down vtm5e-chargen-power-expand-icon"></i>
      </div>
      <p class="vtm5e-chargen-power-desc vtm5e-chargen-power-desc-short">${shortDesc}</p>
      <p class="vtm5e-chargen-power-desc vtm5e-chargen-power-desc-full">${plainDesc}</p>
      <button type="button" class="vtm5e-chargen-power-choose" data-choose-power>Escolher este Poder</button>
    </div>`
  }).join('')

  const content = `<p>${sourceLabel} concede um ponto em <b>${displayLabel(disciplineId)}</b> - escolha o Poder aprendido no nível ${level}:</p>
    <div class="vtm5e-chargen-power-list">${itemsHtml}</div>`

  let picked = null
  await foundry.applications.api.DialogV2.wait({
    window: { title: `${displayLabel(disciplineId)} ${level} - Escolha um Poder` },
    content,
    buttons: [{ action: 'skip', label: 'Pular (escolher depois na aba Disciplinas)' }],
    rejectClose: false,
    render: (_event, dialog) => {
      dialog.element.querySelectorAll('.vtm5e-chargen-power-item').forEach(el => {
        el.querySelector('[data-expand-toggle]').addEventListener('click', () => {
          el.classList.toggle('expanded')
        })
        el.querySelector('[data-choose-power]').addEventListener('click', () => {
          picked = candidates.find(c => c.id === el.dataset.powerId)
          dialog.close()
        })
      })
    }
  })

  return picked
}

let _meritsFlawsIndexCache = null

// [vtm5e-ptbr] Especializações dos Tipos de Predador: redação do livro
// (textos/predadores.json, conferido na imagem). A chave é o rótulo em inglês
// gravado nos dados do compêndio.
const SPECIALTY_LABELS = {
  'Occult (specific tradition)': 'Ocultismo (tradição específica)',
  'Performance (specific field)': 'Performance (campo específico de entretenimento)',
  'Animal Ken (Specific Animal)': 'Empatia com Animais (Animal Específico)',
  'Survival (Hunting)': 'Sobrevivência (Caça)',
  'Etiquette (specific scene)': 'Etiqueta (cena específica)',
  'Leadership (specific scene)': 'Liderança (cena específica)',
  'Streetwise (specific scene)': 'Manha (cena específica)',
  'Medicine (Anesthetics)': 'Medicina (Anestésicos)',
  'Stealth (Break-in)': 'Furtividade (Invasão)',
  'Persuasion (Seduction)': 'Persuasão (Sedução)',
  'Subterfuge (Seduction)': 'Subterfúgio (Sedução)',
  'Medicine (Phlebotomy)': 'Medicina (Flebotomia)',
  'Persuasion (Victims)': 'Persuasão (Bolsas)',
  'Intimidation (Stickups)': 'Intimidação (Assalto à Mão Armada)',
  'Brawl (Grappling)': 'Briga (Agarramento)',
  'Persuasion (Gaslighting)': 'Persuasão (Gaslighting)',
  'Subterfuge (Coverups)': 'Subterfúgio (Encobrimento)',
  'Larceny (Lockpicking)': 'Ladroagem (Abrir Fechaduras)',
  'Streetwise (Black Market)': 'Manha (Mercado Negro)',
  'Brawl (Kindred)': 'Briga (Membros)',
  'Stealth (against Kindred)': 'Furtividade (contra Membros)'
}
function specialtyLabel (label) { return SPECIALTY_LABELS[label] ?? label }

// [vtm5e-ptbr] Notas que acompanham Vantagens/Defeitos concedidos (redação do livro).
const NOTE_LABELS = {
  'outside your subculture': 'fora de sua subcultura',
  'a different subculture': 'uma subcultura diferente da sua',
  'Masquerade Breacher': 'Quebrador da Máscara',
  'non-consenting prey': 'sem consentimento',
  'criminal': 'criminosos',
  'Cleaver': 'Trinchador',
  'Diablerist': 'Diablerista',
  'mortals (cold/procured blood)': 'mortais',
  'a spurned lover or jealous partner': 'um amante desprezado ou parceiro ciumento'
}
function noteLabel (note) { return NOTE_LABELS[note] ?? note }

// [vtm5e-ptbr] Nome exibido de uma Vantagem/Defeito a partir do nome original
// (inglês) usado nos dados: o do compêndio traduzido, se já carregado.
function meritDisplayName (name) {
  const doc = _meritsFlawsIndexCache?.find(d => enName(d) === name)
  return doc?.name ?? displayLabel(name.charAt(0).toLowerCase() + name.slice(1).replace(/\s+/g, ''))
}
async function loadMeritsFlawsCache () {
  if (!_meritsFlawsIndexCache) {
    const pack = game.packs.get(MERITSFLAWS_PACK_ID)
    _meritsFlawsIndexCache = pack ? await pack.getDocuments() : []
  }
}
async function getMeritsFlawsDescription (name) {
  if (!_meritsFlawsIndexCache) {
    const pack = game.packs.get(MERITSFLAWS_PACK_ID)
    _meritsFlawsIndexCache = pack ? await pack.getDocuments() : []
  }
  const doc = _meritsFlawsIndexCache.find(d => enName(d) === name)
  if (!doc) return ''
  const plain = doc.system.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return plain.length > 140 ? plain.slice(0, 137) + '…' : plain
}

function capitalize (id) {
  return id.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

// [vtm5e-ptbr] Rótulo EXIBIDO de uma chave interna (Disciplina, Habilidade,
// Antecedente, clã). Só para texto na tela; a lógica continua usando a chave.
const DISPLAY_LABELS = {
  animalism: 'Animalismo', auspex: 'Auspícios', celerity: 'Celeridade', dominate: 'Dominação',
  fortitude: 'Fortitude', obfuscate: 'Ofuscação', oblivion: 'Oblívio', potence: 'Potência',
  presence: 'Presença', protean: 'Proteanismo', sorcery: 'Feitiçaria de Sangue', alchemy: 'Alquimia Sangue-Ralo',
  contact: 'Contatos', contacts: 'Contatos', resources: 'Recursos', herd: 'Rebanho', fame: 'Fama', haven: 'Refúgio',
  influence: 'Influência', allies: 'Aliados', retainer: 'Lacaios', retainers: 'Lacaios', status: 'Status', mask: 'Máscara',
  bloodsorcery: 'Feitiçaria de Sangue', enemy: 'Inimigo', mythicFlaw: 'Defeito Mítico', mythicflaw: 'Defeito Mítico',
  'banu haqim': 'Banu Haqim', ministry: 'Ministério', 'thin-blood': 'Sangues-Ralos', malkavian: 'Malkavianos'
}
function displayLabel (id) {
  if (!id) return ''
  const key = String(id)
  if (DISPLAY_LABELS[key] ?? DISPLAY_LABELS[key.toLowerCase()]) return DISPLAY_LABELS[key] ?? DISPLAY_LABELS[key.toLowerCase()]
  const skillKey = key === 'animalken' ? 'AnimalKen' : key.charAt(0).toUpperCase() + key.slice(1)
  const i18nKey = `WOD5E.SkillsList.${skillKey}`
  if (game.i18n.has(i18nKey)) return game.i18n.localize(i18nKey)
  return capitalize(key)
}

function dots (n) {
  return '•'.repeat(Math.max(n, 0))
}

async function logAndAnnounce (actor, log, text) {
  log.push(text)
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p class="vtm5e-chargen-log-entry"><i class="fas fa-dice-d10"></i> ${text}</p>`
  })
}

function choiceLabel (grant, choice) {
  if (grant.type === 'specialty') return specialtyLabel(choice.label)
  if (grant.type === 'disciplineDot') {
    return typeof choice === 'string' ? displayLabel(choice) : displayLabel(choice.discipline)
  }
  if (grant.type === 'backgroundDot') return displayLabel(choice)
  if (grant.type === 'merit' || grant.type === 'flaw') return `${meritDisplayName(choice.name)} (${dots(choice.rating)})`
  return String(choice)
}

async function choiceTooltip (grant, choice) {
  if (grant.type === 'disciplineDot') {
    const id = typeof choice === 'string' ? choice : choice.discipline
    return DISCIPLINE_BLURBS[id] ?? ''
  }
  if (grant.type === 'backgroundDot') return getMeritsFlawsDescription(capitalize(choice))
  if (grant.type === 'merit' || grant.type === 'flaw') return getMeritsFlawsDescription(choice.name)
  if (grant.type === 'specialty') return `Adiciona uma especialização a ${displayLabel(choice.skill)}.`
  return ''
}

// requiresClan pode ser um nome ou uma lista (Guia do Jogador p. 107: Osíris e
// Sacoleiro permitem Feitiçaria de Sangue a Tremere e Banu Haqim).
function clanAllowed (requiresClan, clanName) {
  return [].concat(requiresClan).includes(clanName)
}

async function resolveChoice (grant, sourceLabel, actor) {
  if (!grant.choices || grant.choices.length === 0) return null

  // disciplineDot choices can carry a requiresClan (e.g. Blood Sorcery is
  // "Tremere only") - filter those out up front instead of showing every
  // player every option and only rejecting the pick afterward. Falls back
  // to the unfiltered list if filtering would leave nothing (no Clan
  // picked yet, or a grant this doesn't apply to), so this never produces
  // a dead-end dialog with zero buttons.
  let choices = grant.choices
  if (grant.type === 'disciplineDot' && actor) {
    const clanItem = actor.items.find(i => i.type === 'clan')
    const clanName = enName(clanItem)?.toLowerCase()
    const filtered = choices.filter(c => typeof c !== 'object' || !c.requiresClan || clanAllowed(c.requiresClan, clanName))
    if (filtered.length > 0) choices = filtered
  }

  if (choices.length === 1) return choices[0]

  await loadMeritsFlawsCache()
  const buttons = choices.map((c, i) => ({
    action: String(i),
    label: choiceLabel(grant, c)
  }))

  const tooltips = await Promise.all(choices.map(c => choiceTooltip(grant, c)))

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `${sourceLabel} - Escolha uma opção` },
    content: '<p>Este benefício permite escolher uma das opções abaixo (passe o cursor sobre uma opção para ver uma breve descrição):</p>',
    buttons,
    rejectClose: false,
    render: (_event, dialog) => {
      const buttonEls = dialog.element.querySelectorAll('button[data-action]')
      buttonEls.forEach(el => {
        const idx = Number(el.dataset.action)
        if (!Number.isNaN(idx) && tooltips[idx]) el.title = tooltips[idx]
      })
    }
  })

  if (result === null || result === undefined) return null
  return choices[Number(result)]
}

async function promptSplitDots (grant, sourceLabel) {
  const fields = grant.among.map(key =>
    `<div class="form-group"><label>${displayLabel(key)}</label><input type="number" name="${key}" value="0" min="0" max="${grant.amount}" /></div>`
  ).join('')

  const content = `<p>Distribua <b>${grant.amount}</b> pontos entre as opções abaixo (o total deve ser exatamente ${grant.amount}):</p>${fields}`

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${sourceLabel} - Distribuir ${grant.amount} pontos` },
    content,
    ok: {
      label: 'Confirmar',
      callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    },
    rejectClose: false
  })

  if (!result) return null

  const total = Object.values(result).reduce((sum, v) => sum + Number(v || 0), 0)
  if (total !== grant.amount) {
    ui.notifications.warn(`${sourceLabel}: o total de pontos distribuídos foi ${total}, mas deveria ser ${grant.amount} - nada foi aplicado. Tente novamente.`)
    return null
  }

  return result
}

async function findCompendiumMeritFlaw (name) {
  const pack = game.packs.get(MERITSFLAWS_PACK_ID)
  if (!pack) return null
  const docs = await pack.getDocuments()
  return docs.find(d => enName(d) === name) ?? null
}

// `flags['vampiro-a-mascara-v5-ptbr'].grantedPoints` tracks how many of an item's dots
// came free from a grant (Clan/Predator Type/etc) rather than being spent
// from the player's own Merits & Flaws pool - the chargen picker uses it to
// lock those dots and exclude them from the pool total, so free grants and
// player purchases can stack on the same item without double-counting.
// `entries` (optional) collects one record per effect actually applied, in
// a shape revokeLedgerEntries() below knows how to reverse - see
// applyTrackedGrants() for why that matters (switching a Clan/Predator Type
// pick, or just reopening the wizard, must never re-stack the same grant).
async function grantMeritOrFlaw (actor, name, rating, log, sourceLabel, entries) {
  const source = await findCompendiumMeritFlaw(name)

  const existing = actor.items.find(i => i.type === 'feature' && (i.name === name || enName(i) === name))
  if (existing) {
    const newRating = (existing.system.points || 0) + rating
    const newGranted = (existing.flags?.['vampiro-a-mascara-v5-ptbr']?.grantedPoints ?? 0) + rating
    await existing.update({ 'system.points': newRating, 'flags.vampiro-a-mascara-v5-ptbr.grantedPoints': newGranted })
    await logAndAnnounce(actor, log, `<b>${sourceLabel}</b>: aumentou <b>${existing.name}</b> para ${dots(newRating)}`)
    entries?.push({ type: 'meritFlaw', name, amount: rating })
    return
  }

  const itemData = source
    ? {
        name: source.name,
        type: source.type,
        img: source.img,
        system: { ...source.system, points: rating },
        // [vtm5e-ptbr] mantém as marcas do Babele (nome original) para as buscas por nome em inglês
        flags: { ...(source.toObject().flags ?? {}), 'vampiro-a-mascara-v5-ptbr': { grantedPoints: rating } }
      }
    : {
        name: meritDisplayName(name),
        type: 'feature',
        img: 'systems/wod5e/assets/icons/items/feature.svg',
        system: {
          description: '<p><i>Criado automaticamente pelo assistente de criação de personagem - o texto completo ainda não está no compêndio vtm5e-meritsflaws. Preencha manualmente.</i></p>',
          bonuses: [],
          uses: { max: 0, current: 0, enabled: false },
          featuretype: 'merit',
          points: rating,
          macroid: ''
        },
        flags: { babele: { originalName: name }, 'vampiro-a-mascara-v5-ptbr': { grantedPoints: rating } }
      }

  await actor.createEmbeddedDocuments('Item', [itemData])

  if (!source) {
    ui.notifications.warn(`"${meritDisplayName(name)}" não foi encontrado no compêndio de Vantagens e Defeitos - um item provisório foi adicionado. Adicione o item completo ao compêndio quando tiver o texto.`)
  }

  await logAndAnnounce(actor, log, `<b>${sourceLabel}</b>: recebeu <b>${source?.name ?? meritDisplayName(name)}</b> ${dots(rating)}`)
  entries?.push({ type: 'meritFlaw', name, amount: rating })
}

async function grantBackgroundDots (actor, backgroundKey, amount, note, log, sourceLabel, entries) {
  const BACKGROUND_NAME_MAP = {
    contact: 'Contact',
    resources: 'Resources',
    herd: 'Herd',
    fame: 'Fame',
    haven: 'Base Haven',
    influence: 'Influence',
    allies: 'Allies (Reliability)',
    retainer: 'Retainer',
    status: 'Status',
    mask: 'Mask'
  }
  const name = BACKGROUND_NAME_MAP[backgroundKey] ?? capitalize(backgroundKey)
  await grantMeritOrFlaw(actor, name, amount, log, sourceLabel + (note ? ` (${noteLabel(note)})` : ''), entries)
}

export async function applyGrant (actor, grant, sourceLabel, log, entries) {
  switch (grant.type) {
    case 'specialty': {
      const choice = await resolveChoice(grant, sourceLabel, actor)
      if (!choice) return
      const bonuses = foundry.utils.deepClone(actor.system.skills?.[choice.skill]?.bonuses || [])
      const specLabel = specialtyLabel(choice.label)
      bonuses.push({ source: specLabel, value: 1, paths: [`skills.${choice.skill}`], displayWhenInactive: true })
      await actor.update({ [`system.skills.${choice.skill}.bonuses`]: bonuses })
      await logAndAnnounce(actor, log, `<b>${sourceLabel}</b>: recebeu a especialização <b>${specLabel}</b>`)
      entries?.push({ type: 'specialty', skill: choice.skill, label: specLabel })
      break
    }

    case 'disciplineDot': {
      // "Thin-blood characters have no intrinsic Disciplines" (corebook
      // p.136) - every Predator Type grants a Discipline dot, but none of
      // them apply to a Thin-Blooded character. Skip before even prompting
      // for a choice, rather than granting then rejecting.
      const clanForDiscipline = actor.items.find(i => i.type === 'clan')
      if (enName(clanForDiscipline) === 'Thin-Blooded') {
        await logAndAnnounce(actor, log, `<b>${sourceLabel}</b>: nenhum ponto de Disciplina - personagens sangue-ralo não têm Disciplinas intrínsecas.`)
        break
      }
      const choice = await resolveChoice(grant, sourceLabel, actor)
      if (!choice) return
      // Os dados de concessão escrevem Feitiçaria de Sangue como "bloodsorcery"; a ficha usa "sorcery".
      const rawDisciplineId = typeof choice === 'string' ? choice : choice.discipline
      const disciplineId = DISCIPLINE_ID_ALIASES[rawDisciplineId] ?? rawDisciplineId
      if (typeof choice === 'object' && choice.requiresClan) {
        const clanItem = actor.items.find(i => i.type === 'clan')
        if (!clanItem || !clanAllowed(choice.requiresClan, enName(clanItem).toLowerCase())) {
          const clans = [].concat(choice.requiresClan).map(c => displayLabel(c)).join(' ou ')
          ui.notifications.warn(`${sourceLabel}: ${displayLabel(disciplineId)} requer o clã ${clans} - ignorado.`)
          return
        }
      }
      const current = actor.system.disciplines?.[disciplineId]?.value || 0
      const amount = grant.amount || 1

      // One power-pick prompt per new level gained (almost always just one
      // level - chargen grants are always amount:1 today, but this loop
      // handles a larger grant correctly if one is ever added). Each pick
      // creates its Power item immediately so the NEXT prompt's "already
      // owned" filter sees it and won't offer the same power twice.
      const pickedPowerNames = []
      for (let level = current + 1; level <= current + amount; level++) {
        const powerDoc = await promptDisciplinePowerPick(actor, disciplineId, level, sourceLabel)
        if (!powerDoc) continue
        const data = powerDoc.toObject()
        delete data._id
        delete data.ownership
        await actor.createEmbeddedDocuments('Item', [data])
        pickedPowerNames.push(powerDoc.name)
      }

      await actor.update({
        [`system.disciplines.${disciplineId}.value`]: current + amount,
        [`system.disciplines.${disciplineId}.visible`]: true
      })

      const powerNote = pickedPowerNames.length > 0 ? ` - aprendeu <b>${pickedPowerNames.join(', ')}</b>` : ''
      await logAndAnnounce(actor, log, `<b>${sourceLabel}</b>: +${amount} ponto em <b>${displayLabel(disciplineId)}</b> (agora ${dots(current + amount)})${powerNote}`)
      entries?.push({ type: 'disciplineDot', discipline: disciplineId, amount, powerNames: pickedPowerNames })
      break
    }

    case 'backgroundDot': {
      let backgroundKey = grant.background
      if (grant.choices) {
        const choice = await resolveChoice(grant, sourceLabel, actor)
        if (!choice) return
        backgroundKey = choice
      }
      await grantBackgroundDots(actor, backgroundKey, grant.amount, grant.note, log, sourceLabel, entries)
      break
    }

    case 'splitDots': {
      const allocation = await promptSplitDots(grant, sourceLabel)
      if (!allocation) return
      for (const [key, amt] of Object.entries(allocation)) {
        const amount = Number(amt)
        if (amount <= 0) continue
        if (grant.pool === 'background') await grantBackgroundDots(actor, key, amount, null, log, sourceLabel, entries)
        else if (grant.pool === 'flaw' && key === 'mythicFlaw') {
          // [vtm5e-ptbr] "Defeito Mítico" é uma categoria, não um item: o jogador escolhe
          // Defeitos Míticos específicos (pasta Qualidades e Defeitos Míticos) somando esses pontos.
          await logAndAnnounce(actor, log, `<b>${sourceLabel}</b>: escolha ${dots(amount)} em Defeitos Míticos na etapa Qualidades, Defeitos e Antecedentes (pasta Qualidades e Defeitos Míticos).`)
        } else if (grant.pool === 'flaw') await grantMeritOrFlaw(actor, capitalize(key), amount, log, sourceLabel, entries)
      }
      break
    }

    case 'humanity': {
      const current = actor.system.humanity.value
      const next = Math.clamp(current + grant.amount, 0, 10)
      await actor.update({ 'system.humanity.value': next })
      await logAndAnnounce(actor, log, `<b>${sourceLabel}</b>: Humanidade ${grant.amount > 0 ? '+' : ''}${grant.amount} (agora ${next})`)
      entries?.push({ type: 'humanity', amount: grant.amount })
      break
    }

    case 'bloodPotency': {
      const current = actor.system.blood.potency
      const next = current + grant.amount
      await actor.update({ 'system.blood.potency': next })
      await logAndAnnounce(actor, log, `<b>${sourceLabel}</b>: Potência do Sangue +${grant.amount} (agora ${next})`)
      entries?.push({ type: 'bloodPotency', amount: grant.amount })
      break
    }

    case 'merit':
    case 'flaw': {
      let target = grant
      if (grant.choices) {
        const choice = await resolveChoice(grant, sourceLabel, actor)
        if (!choice) return
        target = choice
      }
      // `note` lets a grant point at a generic compendium item (e.g. the
      // single "Prey Exclusion" Flaw) while still telling the player which
      // specific flavor of it they got (e.g. "non-consenting prey") - the
      // note only decorates the log/chat line, the actual Item stays
      // named after the real compendium entry so lookups keep working.
      const label = target.note ? `${sourceLabel} (${noteLabel(target.note)})` : sourceLabel
      await grantMeritOrFlaw(actor, target.name, target.rating, log, label, entries)
      break
    }

    default:
      console.warn('vtm5e-chargen | Unknown grant type:', grant.type, grant)
  }
}

export async function applyGrants (actor, grants, sourceLabel, log, entries) {
  for (const grant of grants || []) {
    await applyGrant(actor, grant, sourceLabel, log, entries)
  }
}

function getLedgerSlot (actor, slot) {
  return actor.flags?.['vampiro-a-mascara-v5-ptbr']?.grantLedger?.[slot] ?? null
}

async function revokeLedgerEntries (actor, entries, log, oldSourceLabel) {
  for (const entry of entries || []) {
    switch (entry.type) {
      case 'disciplineDot': {
        const current = actor.system.disciplines?.[entry.discipline]?.value || 0
        const next = Math.max(current - entry.amount, 0)
        await actor.update({ [`system.disciplines.${entry.discipline}.value`]: next })

        // Remove any Power items this same grant picked, or a re-pick
        // (switching Clan/Predator Type) leaves an orphaned power behind
        // whose level no longer matches the (now-lower or zero) dot rating.
        if (entry.powerNames?.length) {
          const toDelete = actor.items.filter(i => i.type === 'power' && entry.powerNames.includes(i.name))
          if (toDelete.length > 0) {
            await actor.deleteEmbeddedDocuments('Item', toDelete.map(i => i.id))
          }
        }
        break
      }
      case 'meritFlaw': {
        const item = actor.items.find(i => i.type === 'feature' && (i.name === entry.name || enName(i) === entry.name))
        if (!item) break
        const grantedPoints = item.flags?.['vampiro-a-mascara-v5-ptbr']?.grantedPoints ?? 0
        const newGranted = Math.max(grantedPoints - entry.amount, 0)
        const newPoints = Math.max((item.system.points ?? 0) - entry.amount, 0)
        if (newPoints <= 0) {
          await actor.deleteEmbeddedDocuments('Item', [item.id])
        } else {
          await item.update({ 'system.points': newPoints, 'flags.vampiro-a-mascara-v5-ptbr.grantedPoints': newGranted })
        }
        break
      }
      case 'specialty': {
        const bonuses = foundry.utils.deepClone(actor.system.skills?.[entry.skill]?.bonuses || [])
        const filtered = bonuses.filter(b => b.source !== entry.label)
        await actor.update({ [`system.skills.${entry.skill}.bonuses`]: filtered })
        break
      }
      case 'humanity': {
        const next = Math.clamp(actor.system.humanity.value - entry.amount, 0, 10)
        await actor.update({ 'system.humanity.value': next })
        break
      }
      case 'bloodPotency': {
        const next = actor.system.blood.potency - entry.amount
        await actor.update({ 'system.blood.potency': next })
        break
      }
      default:
        console.warn('vtm5e-chargen | revokeLedgerEntries: unknown entry type', entry)
    }
  }
  if (log) log.push(`<b>${oldSourceLabel}</b>: benefícios anteriores removidos (escolha alterada)`)
}

// The single-pick chargen steps (Clan, Predator Type) each get one
// persisted ledger slot on the actor (flags['vampiro-a-mascara-v5-ptbr'].grantLedger.
// <slot>), recording exactly which grants the current pick applied. This
// makes grant application idempotent AND reversible:
//  - same pick again (re-clicking Next, or just reopening the wizard on an
//    actor that already has this pick) is a no-op instead of re-stacking
//    dots/items a second time.
//  - a different pick first reverses everything the old ledger entry
//    recorded, so switching Clan/Predator mid-wizard (or after closing and
//    reopening) can never leave orphaned free dots/items behind.
export async function applyTrackedGrants (actor, { slot, pickLabel, name, sourceLabel, grants }, log) {
  const existingSlot = getLedgerSlot(actor, slot)
  if (existingSlot && existingSlot.sourceLabel === sourceLabel) return false

  if (existingSlot) {
    await revokeLedgerEntries(actor, existingSlot.entries, log, existingSlot.sourceLabel)
  }

  log.push(`<b>${pickLabel}</b>: escolheu <b>${name}</b>`)
  const entries = []
  for (const grant of grants || []) {
    await applyGrant(actor, grant, sourceLabel, log, entries)
  }
  await actor.setFlag('vampiro-a-mascara-v5-ptbr', `grantLedger.${slot}`, { sourceLabel, entries })
  return true
}

// Reverses whatever's currently recorded in a ledger slot without
// applying a replacement - used when a pick becomes invalid after the
// fact (e.g. the player already had a Predator Type selected and its
// grants applied, then went back and changed Clan to one that Predator
// Type excludes). Leaves the slot empty so the player has to pick again.
export async function clearTrackedGrants (actor, slot, log) {
  const existingSlot = getLedgerSlot(actor, slot)
  if (!existingSlot) return
  await revokeLedgerEntries(actor, existingSlot.entries, log, existingSlot.sourceLabel)
  await actor.unsetFlag('vampiro-a-mascara-v5-ptbr', `grantLedger.${slot}`)
}

export function checkRestrictions (actor, restrictions) {
  const failures = []
  for (const r of restrictions || []) {
    if (r.type === 'excludeClan') {
      const clanItem = actor.items.find(i => i.type === 'clan')
      if (clanItem && r.clans.includes(enName(clanItem).toLowerCase())) {
        failures.push(`Indisponível para o clã ${clanItem.name}.`)
      }
    } else if (r.type === 'requireClan') {
      const clanItem = actor.items.find(i => i.type === 'clan')
      if (!clanItem || !r.clans.includes(enName(clanItem).toLowerCase())) {
        failures.push(`Disponível apenas para o clã ${r.clans.map(displayLabel).join(' ou ')}.`)
      }
    } else if (r.type === 'ghoulOnly') {
      // This wizard only ever builds vampire characters, so a Ghoul-only
      // item can never actually apply here - unconditional, no actor
      // state to check.
      failures.push('Disponível apenas para personagens carniçais, não para vampiros.')
    } else if (r.type === 'maxBloodPotency') {
      if ((actor.system.blood?.potency ?? 0) > r.value) {
        failures.push(`Requer Potência do Sangue ${r.value} ou menor (atualmente ${actor.system.blood.potency}).`)
      }
    } else if (r.type === 'minHaven') {
      const rating = getHavenRating(actor)
      if (rating < r.value) {
        failures.push(`Requer Refúgio Base ${r.value}+ (atualmente ${rating}).`)
      }
    } else if (r.type === 'minBackground') {
      // Generic version of minHaven - covers any Background-gated Merit
      // (e.g. "Requires Mask ••") without needing a one-off case per
      // Background name.
      // [vtm5e-ptbr] nome original (Babele): o item na ficha pode estar em português ("Máscara")
      const rating = actor.items.find(i => i.type === 'feature' && (enName(i) === r.background || i.name === r.background))?.system.points ?? 0
      if (rating < r.value) {
        failures.push(`Requer ${meritDisplayName(r.background)} ${dots(r.value)}+ (atualmente ${rating > 0 ? dots(rating) : 'nenhum'}).`)
      }
    }
  }
  return failures
}

function getHavenRating (actor) {
  return actor.items.find(i => i.type === 'feature' && enName(i) === 'Base Haven')?.system.points ?? 0
}

// Some Backgrounds don't fail outright below a threshold - they're just
// capped lower (e.g. Library tops out at 1 dot without a Base Haven of 2+,
// per the corebook, rather than being unavailable entirely). doc.flags
// ['vtm5e-chargen'].ratingCap = { unless: <a single restriction object>, cap: n }.
// Returns the cap to enforce, or null if the "unless" condition is met and no
// cap applies.
export function getRatingCap (actor, doc) {
  const rule = doc.flags?.['vampiro-a-mascara-v5-ptbr']?.ratingCap
  if (!rule) return null
  const failures = checkRestrictions(actor, [rule.unless])
  return failures.length > 0 ? rule.cap : null
}

export function checkConflicts (actor, itemName, conflictsWith) {
  if (!conflictsWith || conflictsWith.length === 0) return []
  const heldNames = new Set(actor.items.filter(i => i.type === 'feature').flatMap(i => [i.name, enName(i)]))
  return conflictsWith.filter(name => heldNames.has(name))
}

// [vtm5e-ptbr] nome original em ingles de um item traduzido pelo Babele (ou o nome atual, se nao houver)
function enName (doc) {
  return doc?.flags?.babele?.originalName ?? doc?.originalName ?? doc?.name
}
