import { openChargenWizard } from './chargen-app.js'
import { registerAutoProvisioning } from './auto-provision.js'
import { autoCreateCharacter, autoCreate, openAutoCreateDialog } from './auto-chargen.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

Hooks.once('init', () => {
  game.settings.register(MODULE_ID, 'extraAdvantagePoints', {
    name: 'Pontos extras de Vantagens na criação',
    hint: 'Decisão do Narrador para Antecedentes da coterie (Manual Básico, p. 150).',
    scope: 'world', config: true, type: Number, default: 0, range: { min: 0, max: 2, step: 1 }
  })
  // Crônica: usada pela criação automática (datas, cidade, nomes) e pelo assistente (Princípios da Crônica).
  game.settings.register(MODULE_ID, 'chronicleName', {
    name: 'Crônica: nome',
    hint: 'Preenche o campo Crônica das fichas criadas automaticamente. Ex.: "A Luz da Lua".',
    scope: 'world', config: true, type: String, default: ''
  })
  game.settings.register(MODULE_ID, 'chronicleCity', {
    name: 'Crônica: cidade',
    hint: 'Cidade onde a crônica se passa, usada nas histórias geradas. Ex.: "Santa Verena".',
    scope: 'world', config: true, type: String, default: ''
  })
  game.settings.register(MODULE_ID, 'chronicleYear', {
    name: 'Crônica: ano',
    hint: 'Ano em que a crônica se passa. Define as datas de Abraço e as idades (Mar do Tempo, Manual Básico p. 137). Deixe 0 para usar o ano atual.',
    scope: 'world', config: true, type: Number, default: 0
  })
  game.settings.register(MODULE_ID, 'chronicleTenets', {
    name: 'Crônica: Princípios da Crônica',
    hint: 'Separe os princípios com ponto e vírgula (Manual Básico p. 172). Vazio usa o conjunto Humanista do livro.',
    scope: 'world', config: true, type: String, default: ''
  })
  game.settings.register(MODULE_ID, 'reservedNames', {
    name: 'Crônica: nomes reservados',
    hint: 'Nomes e sobrenomes que a criação automática não deve usar, separados por vírgula (ex.: NPCs do cenário). Os nomes dos Atores do mundo já são evitados.',
    scope: 'world', config: true, type: String, default: ''
  })
  const mod = game.modules.get(MODULE_ID)
  mod.api = Object.assign(mod.api ?? {}, {
    openChargenWizard,
    autoCreateCharacter,
    autoCreate,
    openAutoCreateDialog,
    // Convenience: open for the first controlled token's actor, or the
    // user's assigned character, if no actor is passed explicitly.
    openForSelectedOrAssigned () {
      const actor = canvas.tokens?.controlled?.[0]?.actor ?? game.user.character
      openChargenWizard(actor)
    }
  })
})

registerAutoProvisioning()
