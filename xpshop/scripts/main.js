import { openXPShop } from './xp-shop-app.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing`)

  game.modules.get(MODULE_ID).api = Object.assign(game.modules.get(MODULE_ID).api ?? {}, {
    open: openXPShop
  })
})
