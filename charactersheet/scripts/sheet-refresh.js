import {
  _onResourceChange,
  _onRemoveSquareCounter,
  _onSquareCounterChange,
  _setupDotCounters,
  _setupSquareCounters
} from '/systems/wod5e/system/actor/scripts/counters.js'
import { ActorUX } from '/systems/wod5e/system/actor/scripts/actor-ux.js'
import { EXPERIENCE_LEDGER_PATH } from './experience-ledger.js'

const REFRESH_OPTION = 'vtm5eSheetParts'
const ACTOR_TYPES = new Set(['vampire', 'ghoul', 'mortal', 'hunter', 'werewolf'])
const TEMPLATE_PATH = 'modules/vampiro-a-mascara-v5-ptbr/charactersheet/templates'
const ITEM_LISTS = {
  conditions: { type: 'condition', selector: '[data-condition-rows]', template: `${TEMPLATE_PATH}/condition-rows.hbs` },
  customRolls: { type: 'customRoll', selector: '[data-custom-roll-rows]', template: `${TEMPLATE_PATH}/custom-roll-rows.hbs` }
}
export const SHEET_ITEM_LIST_TEMPLATES = Object.values(ITEM_LISTS).map(list => list.template)

const ITEM_PARTS = {
  condition: ['conditions'],
  customRoll: ['customRolls'],
  trait: ['stats'],
  feature: ['features'],
  boon: ['features'],
  power: ['disciplines'],
  gift: ['gifts'],
  perk: ['edges'],
  edgepool: ['edges'],
  weapon: ['equipment'],
  armor: ['equipment'],
  gear: ['equipment'],
  talisman: ['equipment'],
  clan: ['header', 'blood'],
  predatorType: ['header', 'blood'],
  resonance: ['header', 'blood'],
  creed: ['header', 'biography'],
  drive: ['header', 'biography'],
  auspice: ['header', 'biography', 'wolf'],
  tribe: ['header', 'biography', 'wolf']
}
const SCROLL_REGIONS = '.cs-stats-scroll, .cs-disc-scroll, .cs-cl-scroll, .cs-exp-scroll'
const SYSTEM_PARTS = {
  health: ['header'],
  willpower: ['header'],
  humanity: ['header'],
  hunger: ['header', 'blood'],
  blood: ['header', 'blood'],
  frenzyActive: ['header', 'gifts'],
  attributes: ['stats', 'header'],
  skills: ['stats'],
  disciplines: ['disciplines'],
  selectedDiscipline: ['disciplines'],
  selectedDisciplinePower: ['disciplines'],
  edges: ['edges'],
  selectedEdge: ['edges'],
  selectedEdgePerk: ['edges'],
  gifts: ['gifts'],
  selectedGift: ['gifts'],
  selectedGiftPower: ['gifts'],
  renown: ['gifts'],
  exp: ['experience'],
  experience: ['experience'],
  experiences: ['experience'],
  equipment: ['equipment'],
  biography: ['biography'],
  appearance: ['biography'],
  bio: ['biography'],
  headers: ['header', 'biography', 'blood'],
  notes: ['notepad'],
  notepad: ['notepad'],
  rage: ['header', 'wolf'],
  crinosHealth: ['header', 'wolf'],
  activeForm: ['header', 'wolf'],
  despair: ['header'],
  desperation: ['header']
}

function partsForPath (path) {
  const [root, key] = path.split('.')
  if (root === 'system' && Object.hasOwn(SYSTEM_PARTS, key)) return SYSTEM_PARTS[key]
  if (path === 'flags.vampiro-a-mascara-v5-ptbr.compulsion') return ['header']
  if (path === 'flags.vampiro-a-mascara-v5-ptbr.currency') return ['equipment']
  if (path === EXPERIENCE_LEDGER_PATH || path.startsWith(`${EXPERIENCE_LEDGER_PATH}.`)) return ['experience']
  if (root === '_stats') return []
  return undefined
}

function partsForEffectKeys (keys) {
  return keys.flatMap(key => {
    if (typeof key !== 'string') return []
    if (['physical', 'social', 'mental'].includes(key)) return SYSTEM_PARTS.attributes
    return partsForPath(key) ?? partsForPath(`system.${key}`) ?? []
  })
}

function partsForItem (item, changes) {
  const parts = Object.hasOwn(ITEM_PARTS, item.type) ? ITEM_PARTS[item.type] : ['stats', 'features', 'equipment']
  const updatedEffects = changes && foundry.utils.expandObject(changes).system?.effects
  const effects = [...Object.values(item.system?.effects ?? {}), ...Object.values(updatedEffects ?? {})]
  const keys = effects.flatMap(effect => effect?.keys ?? []).filter(key => typeof key === 'string')
  const embeddedEffectKeys = Array.from(item.effects?.values() ?? [])
    .flatMap(effect => (effect.changes ?? []).map(change => change.key))
  return [...parts, ...partsForEffectKeys([...keys, ...embeddedEffectKeys])]
}

function actorForEmbedded (document) {
  const parent = document.parent
  return parent instanceof Item ? parent.parent : parent
}

function isSupportedActor (actor) {
  return actor instanceof Actor && ACTOR_TYPES.has(actor.type)
}

function markLocalized (actor, options, parts) {
  const queued = options[REFRESH_OPTION]
  if (!parts.length || !isSupportedActor(actor) || (options.render === false && !queued)) return
  options[REFRESH_OPTION] = [...new Set([...(queued ?? []), ...parts])]
  options.render = false
}

function refreshAfterOperation (actor, options) {
  const parts = options[REFRESH_OPTION]
  if (!parts?.length || !isSupportedActor(actor)) return

  // The pre-hook runs on the originating client. Choose how to redraw
  // only here, using the receiving client's sheet.
  const sheet = actor.sheet
  if (!sheet?.rendered) return
  if (typeof sheet.queueLocalizedRefresh === 'function') sheet.queueLocalizedRefresh(parts)
  else sheet.render()
}

function bindDraggableItems (sheet, element) {
  if (!sheet._canDragStart()) return
  const dragStart = sheet._onDragStart.bind(sheet)
  for (const row of element.querySelectorAll('[data-drag]')) {
    row.draggable = true
    row.addEventListener('dragstart', dragStart)
  }
}

async function refreshItemList (sheet, key) {
  const { selector, template, type } = ITEM_LISTS[key]
  const list = sheet.element?.querySelector(selector)
  if (!list) return

  const items = sheet.actor.items
    .filter(item => item.type === type)
    .sort((a, b) => a.sort - b.sort)
    .map(item => ({ id: item.id, uuid: item.uuid, name: item.name, img: item.img, system: { suppressed: item.system?.suppressed } }))
  const html = await foundry.applications.handlebars.renderTemplate(template, { [key]: items })
  if (!list.isConnected) return

  list.innerHTML = html
  bindDraggableItems(sheet, list)
}

export function registerLocalizedSheetRefresh () {
  for (const action of ['Create', 'Update', 'Delete']) {
    for (const kind of ['Item', 'ActiveEffect']) {
      Hooks.on(`pre${action}${kind}`, (document, data, operation) => {
        const isDelete = action === 'Delete'
        const options = isDelete ? data : operation
        const parts = kind === 'Item'
          ? partsForItem(document, isDelete ? undefined : data)
          : partsForEffectKeys([...(document.changes ?? []), ...(isDelete ? [] : (data?.changes ?? []))].map(change => change.key))
        markLocalized(actorForEmbedded(document), options, parts)
      })

      const postHook = `${action.toLowerCase()}${kind}`
      Hooks.on(postHook, (document, data, operation) => {
        refreshAfterOperation(actorForEmbedded(document), action === 'Update' ? operation : data)
      })
    }
  }

  Hooks.on('preUpdateActor', (actor, changes, options) => {
    const parts = Object.keys(foundry.utils.flattenObject(changes)).map(partsForPath)
    if (parts.includes(undefined)) return
    markLocalized(actor, options, parts.flat())
  })
  Hooks.on('updateActor', (actor, _changes, options) => refreshAfterOperation(actor, options))
}

export function withLocalizedSheetRefresh (BaseSheet) {
  return class LocalizedActorSheet extends BaseSheet {
    #pendingParts = new Set()
    #refreshQueued = false

    queueLocalizedRefresh (parts) {
      if (!this.rendered) return
      for (const part of parts) this.#pendingParts.add(part)
      if (this.#refreshQueued) return
      this.#refreshQueued = true
      setTimeout(() => this.#flushLocalizedRefresh(), 0)
    }

    async #flushLocalizedRefresh () {
      try {
        while (this.rendered && this.#pendingParts.size) {
          const pending = [...this.#pendingParts]
          this.#pendingParts.clear()
          const parts = pending.filter(part => !Object.hasOwn(ITEM_LISTS, part) && this.parts[part])
          if (parts.length) {
            const views = parts.map(part => {
              const element = this.parts[part]
              return {
                part,
                scrollTop: element.scrollTop,
                innerScrollTop: element.querySelector(SCROLL_REGIONS)?.scrollTop ?? 0,
                expandedRows: new Set(Array.from(element.querySelectorAll('.cs-expanded[data-item-id]'), row => row.dataset.itemId))
              }
            })
            await this.render({ parts, vtm5eLocalizedRefresh: true })
            for (const { part, scrollTop, innerScrollTop, expandedRows } of views) {
              const element = this.parts[part]
              if (!element) continue
              element.scrollTop = scrollTop
              const scrollRegion = element.querySelector(SCROLL_REGIONS)
              if (scrollRegion) scrollRegion.scrollTop = innerScrollTop
              for (const row of element?.querySelectorAll('.cs-expand-row[data-item-id]') ?? []) {
                if (expandedRows.has(row.dataset.itemId)) row.classList.add('cs-expanded')
              }
            }
          }
          if (!parts.includes('stats')) {
            for (const key of pending.filter(key => Object.hasOwn(ITEM_LISTS, key))) await refreshItemList(this, key)
          }
        }
      } catch (error) {
        console.error('vampiro-a-mascara-v5-ptbr | Falha ao atualizar parte da ficha', error)
      } finally {
        this.#refreshQueued = false
        if (this.rendered && this.#pendingParts.size) this.queueLocalizedRefresh([])
        else this.#pendingParts.clear()
      }
    }

    async _onRender (context, options) {
      if (!options?.vtm5eLocalizedRefresh) return super._onRender(context, options)

      // wod5e binds square counters and drag events across the entire sheet.
      // For a part refresh, bind only the new nodes so old controls fire once.
      for (const part of options.parts) {
        const element = this.parts[part]
        if (!element) continue
        for (const square of element.querySelectorAll('.resource-counter.editable .resource-counter-step')) {
          square.addEventListener('click', _onSquareCounterChange.bind(this))
          square.addEventListener('contextmenu', _onRemoveSquareCounter.bind(this))
        }
        for (const control of element.querySelectorAll('.resource-plus, .resource-minus')) {
          control.addEventListener('click', _onResourceChange.bind(this))
        }
        bindDraggableItems(this, element)
        await _setupDotCounters(element)
        await _setupSquareCounters(element)
      }
      await ActorUX._restoreScrollPositions(this)
      await ActorUX._restoreCollapsibleStates(this)
    }
  }
}
