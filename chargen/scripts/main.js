import { openChargenWizard } from './chargen-app.js'
import { registerAutoProvisioning } from './auto-provision.js'
import { autoCreateCharacter } from './auto-chargen.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'extraAdvantagePoints', {
    name: 'Pontos extras de Vantagens na criação',
    hint: 'Decisão do Narrador para Antecedentes da coterie (Manual Básico, p. 150).',
    scope: 'world', config: true, type: Number, default: 0, range: { min: 0, max: 2, step: 1 }
  })
  const mod = game.modules.get(MODULE_ID)
  mod.api = Object.assign(mod.api ?? {}, {
    openChargenWizard,
    autoCreateCharacter,
    // Convenience: open for the first controlled token's actor, or the
    // user's assigned character, if no actor is passed explicitly.
    openForSelectedOrAssigned () {
      const actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character
      openChargenWizard(actor)
    }
  })
})

registerAutoProvisioning()
