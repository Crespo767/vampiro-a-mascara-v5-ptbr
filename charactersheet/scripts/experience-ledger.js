const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'
const LEDGER_FLAG = 'experienceLedger'
export const EXPERIENCE_LEDGER_PATH = `flags.${MODULE_ID}.${LEDGER_FLAG}`

const entryKey = id => `entry-${encodeURIComponent(id).replaceAll('.', '%2E')}`
const savedEntries = actor => actor.flags?.[MODULE_ID]?.[LEDGER_FLAG]
const originalEntries = actor => actor._source?.system?.experiences ?? actor.system.experiences ?? []

export function experienceEntryUpdates (entries) {
  return Object.fromEntries(entries.map(entry => [`${EXPERIENCE_LEDGER_PATH}.${entryKey(entry.id)}`, entry]))
}

function experienceHistory (actor) {
  const ledger = savedEntries(actor) ?? {}
  const legacy = originalEntries(actor)
  const legacyIds = new Set(legacy.map(entry => entry.id))

  return [
    ...legacy.map(entry => entry.id ? ledger[entryKey(entry.id)] ?? entry : entry),
    ...Object.values(ledger).filter(entry => !legacyIds.has(entry.id))
  ].filter(entry => !entry.removed)
}

export function registerExperienceLedger () {
  // Keep the standard wod5e history and derived totals available to native
  // sheets and other readers. The per-ID writes live in document flags.
  libWrapper.register(MODULE_ID, 'CONFIG.Actor.documentClass.prototype.prepareDerivedData', function (wrapped, ...args) {
    if (savedEntries(this)) this.system.experiences = experienceHistory(this)
    return wrapped(...args)
  }, 'WRAPPER')

  Hooks.on('preUpdateActor', (actor, changes) => {
    const next = changes.system?.experiences
    if (!savedEntries(actor) || !Array.isArray(next)) return

    // Stock wod5e sheets submit a whole array. Translate edits to the
    // combined history into per-ID changes and keep the original XP data.
    const previous = new Map(experienceHistory(actor).filter(entry => entry.id).map(entry => [entry.id, entry]))
    const submitted = new Map(next.filter(entry => entry.id).map(entry => [entry.id, entry]))
    const edits = [...submitted.values()].filter(entry => JSON.stringify(entry) !== JSON.stringify(previous.get(entry.id)))
    for (const id of previous.keys()) {
      if (!submitted.has(id)) edits.push({ id, removed: true })
    }

    delete changes.system.experiences
    if (!Object.keys(changes.system).length) delete changes.system
    for (const [path, entry] of Object.entries(experienceEntryUpdates(edits))) {
      foundry.utils.setProperty(changes, path, entry)
    }
  })
}
