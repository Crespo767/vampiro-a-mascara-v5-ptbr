import { CharacterSheetVampireActorSheet } from './vampire-actor-sheet.js'
import { CharacterSheetGhoulActorSheet } from './ghoul-actor-sheet.js'
import { CharacterSheetMortalActorSheet } from './mortal-actor-sheet.js'
import { CharacterSheetHunterActorSheet } from './hunter-actor-sheet.js'
import { CharacterSheetWerewolfActorSheet } from './werewolf-actor-sheet.js'
import { onFeed, registerResonanceExpiry } from './feed.js'
import { bindTraitDecrement } from './shared-context.js'
import { registerLocalizedSheetRefresh, SHEET_ITEM_LIST_TEMPLATES } from './sheet-refresh.js'
import { registerExperienceLedger } from './experience-ledger.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing`)
  registerResonanceExpiry()
  registerExperienceLedger()
  registerLocalizedSheetRefresh()

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, 'wod5e', CharacterSheetVampireActorSheet, {
    types: ['vampire'],
    makeDefault: true,
    label: 'Ficha de Personagem VtM5e (PT-BR)'
  })

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, 'wod5e', CharacterSheetGhoulActorSheet, {
    types: ['ghoul'],
    makeDefault: true,
    label: 'Ficha de Personagem VtM5e (PT-BR)'
  })

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, 'wod5e', CharacterSheetMortalActorSheet, {
    types: ['mortal'],
    makeDefault: true,
    label: 'Ficha de Personagem VtM5e (PT-BR)'
  })

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, 'wod5e', CharacterSheetHunterActorSheet, {
    types: ['hunter'],
    makeDefault: true,
    label: 'Ficha de Personagem VtM5e (PT-BR)'
  })

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, 'wod5e', CharacterSheetWerewolfActorSheet, {
    types: ['werewolf'],
    makeDefault: true,
    label: 'Ficha de Personagem VtM5e (PT-BR)'
  })

  // Preload the partials included within a sheet part.
  foundry.applications.handlebars.loadTemplates([
    `modules/${MODULE_ID}/charactersheet/templates/renown.hbs`,
    ...SHEET_ITEM_LIST_TEMPLATES
  ])

  // Public API, same pattern vtm5e-automation uses to expose its own
  // functions (e.g. rollWeaponAttack, rollPower) to the Argon HUD companion
  // (enhancedcombathud-wod5e) - set at init time so it's guaranteed ready
  // before that module's argonInit-time panel registration needs it. Feed
  // lives here (not on the sheet) since Jake wants it reachable from the
  // Argon HUD instead of a sheet button.
  game.modules.get(MODULE_ID).api = Object.assign(game.modules.get(MODULE_ID).api ?? {}, { onFeed })
})

// [vtm5e-ptbr] Nomes longos (Folhas de História, Potência de Sangue 0 etc.)
// não cabiam no campo de nome da ficha de item do wod5e (input com fonte
// grande e largura fixa). Diminui a fonte só quando o nome não cabe.
const ITEM_NAME_MIN_FONT_PX = 13
function fitItemName (input) {
  if (!input?.isConnected) return
  input.style.fontSize = ''
  let size = parseFloat(getComputedStyle(input).fontSize)
  while (input.scrollWidth > input.clientWidth && size > ITEM_NAME_MIN_FONT_PX) {
    size -= 1
    input.style.fontSize = `${size}px`
  }
}
Hooks.on('renderDocumentSheetV2', (app) => {
  if (app.document instanceof Actor) bindTraitDecrement(app)

  // Item: campo de nome do wod5e. Ator: nome no cabeçalho das fichas do
  // módulo (.cs-header, até 230 px) e das fichas do wod5e (PdN, grupo: 250 px).
  const selector = app.document instanceof Item
    ? 'input.itemname'
    : (app.document instanceof Actor ? '.cs-header .charname, .header-profile .charname' : null)
  if (!selector) return
  // A ficha pode trocar o campo depois deste hook; busca de novo no ajuste.
  setTimeout(() => {
    const input = app.element?.querySelector(selector)
    if (!input) return
    fitItemName(input)
    if (!input.dataset.vtm5eFit) {
      input.dataset.vtm5eFit = '1'
      input.addEventListener('input', () => fitItemName(input))
    }
  }, 50)
})

// [vtm5e-ptbr] No wod5e 5.3.15, fechar a janela "Selecione a Rolagem" pelo X
// devolve null (só o botão Cancelar devolve 'cancel'), e RollFromDataset
// tenta ler null.skillSelect, deixando um erro no console. Trata esse caso
// como cancelamento; qualquer outro erro continua aparecendo normalmente.
Hooks.once('init', () => {
  const api = globalThis.WOD5E?.api
  const original = api?.RollFromDataset
  if (typeof original !== 'function' || original.vtm5eCancelGuard) return
  const guarded = async function (...args) {
    try {
      return await original.apply(this, args)
    } catch (error) {
      if (error instanceof TypeError && /reading 'skillSelect'/.test(error.message)) return
      throw error
    }
  }
  guarded.vtm5eCancelGuard = true
  api.RollFromDataset = guarded
})
