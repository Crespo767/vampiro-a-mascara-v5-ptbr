import {
  _onResourceChange,
  _onRemoveSquareCounter,
  _onSquareCounterChange,
  _setupDotCounters,
  _setupSquareCounters
} from '/systems/wod5e/system/actor/scripts/counters.js'
import { ActorUX } from '/systems/wod5e/system/actor/scripts/actor-ux.js'
import { refreshConditionRows } from './condition-picker.js'

const REFRESH_OPTION = 'vtm5eSheetParts'
const ACTOR_TYPES = new Set(['vampire', 'ghoul', 'mortal', 'hunter', 'werewolf'])
const ITEM_PARTS = {
  condition: ['conditions'],
  customRoll: ['stats'],
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
  edges: ['edges'],
  gifts: ['gifts'],
  renown: ['gifts'],
  exp: ['experience'],
  experience: ['experience'],
  experiences: ['experience'],
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
  if (root === '_stats') return []
  return undefined
}

function partsForEffectKeys (keys) {
  return keys.flatMap(key => partsForPath(key) ?? [])
}

function partsForItem (item, changes) {
  const parts = Object.hasOwn(ITEM_PARTS, item.type) ? ITEM_PARTS[item.type] : ['stats', 'features', 'equipment']
  const effects = [...Object.values(item.system?.effects ?? {}), ...Object.values(changes?.system?.effects ?? {})]
  const keys = effects.flatMap(effect => effect?.keys ?? []).filter(key => typeof key === 'string')
  const embeddedEffectKeys = Array.from(item.effects?.values() ?? [])
    .flatMap(effect => (effect.changes ?? []).map(change => change.key))
  return [...parts, ...partsForEffectKeys([...keys, ...embeddedEffectKeys])]
}

function actorForEmbedded (document) {
  const parent = document.parent
  return parent instanceof Item ? parent.parent : parent
}

function sheetForActor (actor) {
  if (!(actor instanceof Actor) || !ACTOR_TYPES.has(actor.type)) return
  const sheet = actor.sheet
  if (typeof sheet?.queueLocalizedRefresh === 'function') return sheet
}

function markLocalized (actor, options, parts) {
  const queued = options[REFRESH_OPTION]
  if ((options.render === false && !queued) || !sheetForActor(actor)) return
  options[REFRESH_OPTION] = [...new Set([...(queued ?? []), ...parts])]
  options.render = false
}

function refreshAfterOperation (actor, options) {
  const parts = options[REFRESH_OPTION]
  if (parts?.length) sheetForActor(actor)?.queueLocalizedRefresh(parts)
}

export function registerLocalizedSheetRefresh () {
  for (const action of ['Create', 'Update', 'Delete']) {
    for (const kind of ['Item', 'ActiveEffect']) {
      Hooks.on(`pre${action}${kind}`, (document, data, operation) => {
        const isDelete = action === 'Delete'
        const options = isDelete ? data : operation
        const parts = kind === 'Item'
          ? partsForItem(document, action === 'Update' ? data : undefined)
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
          const parts = pending.filter(part => part !== 'conditions' && this.parts[part])
          if (parts.length) {
            const views = parts.map(part => {
              const element = this.parts[part]
              return {
                part,
                scrollTop: element.querySelector(SCROLL_REGIONS)?.scrollTop ?? 0,
                expandedRows: new Set(Array.from(element.querySelectorAll('.cs-expanded[data-item-id]'), row => row.dataset.itemId))
              }
            })
            await this.render({ parts, vtm5eLocalizedRefresh: true })
            for (const { part, scrollTop, expandedRows } of views) {
              const element = this.parts[part]
              const scrollRegion = element?.querySelector(SCROLL_REGIONS)
              if (scrollRegion) scrollRegion.scrollTop = scrollTop
              for (const row of element?.querySelectorAll('.cs-expand-row[data-item-id]') ?? []) {
                if (expandedRows.has(row.dataset.itemId)) row.classList.add('cs-expanded')
              }
            }
          }
          if (pending.includes('conditions') && !parts.includes('stats')) await refreshConditionRows(this)
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
        if (this._canDragStart()) {
          const dragStart = this._onDragStart.bind(this)
          for (const row of element.querySelectorAll('[data-drag]')) {
            row.draggable = true
            row.addEventListener('dragstart', dragStart)
          }
        }
        await _setupDotCounters(element)
        await _setupSquareCounters(element)
      }
      await ActorUX._restoreScrollPositions(this)
      await ActorUX._restoreCollapsibleStates(this)
    }
  }
}
