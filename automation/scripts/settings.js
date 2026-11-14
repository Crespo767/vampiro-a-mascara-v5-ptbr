import { isPlayerControlled } from './socket-routing.js'
import { AutomationSettingsApp } from './automation-settings-app.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'
const SETTING_KEY = 'automationConfig'

// Each step here maps to an actual enforcement point in the code - kept in
// sync manually. attackRollAutomation existed in the old flat-setting design
// but was never wired to anything, so it was dropped rather than carried
// into a nicer UI implying it does something it doesn't.
export const STEPS = {
  opposingRoll: {
    label: 'Disputa',
    hint: 'Defesa contra armas (Esquiva ou parada personalizada). Automático resolve sem diálogo (Destreza + Atletismo). Perguntar mostra o seletor interativo. Desligado pula a disputa (os ataques com armas acertam diretamente). Conflitos sociais não são automatizados: o Narrador conduz as disputas sociais manualmente pelo recurso de solicitação de rolagem do wod5e.',
    choices: { auto: 'Automático', prompt: 'Perguntar', off: 'Desligado' }
  },
  damageApplication: {
    label: 'Aplicação de Dano',
    hint: 'Automático aplica o dano à Vitalidade ou à Força de Vontade assim que uma rolagem é resolvida. Perguntar mostra os botões Superficial e Agravado e espera um clique.',
    choices: { auto: 'Automático', prompt: 'Perguntar' }
  },
  followUpRoll: {
    label: 'Teste Adicional',
    hint: 'O segundo teste exigido por alguns efeitos de Disciplinas e Proteções após o primeiro resultado, como um teste de frenesi forçado, a segunda disputa para Torpor de Carícia de Baal ou o botão "Rolar para Defender" de uma Proteção. Automático rola diretamente quando um poder ou item fornece uma parada conhecida, como Carícia de Baal ou uma Proteção. Em testes genéricos, como o de frenesi, que não têm diálogo acionável externamente, passa automaticamente para Perguntar. Perguntar mostra um botão. Desligado não oferece o teste adicional; o texto narrativo ainda aparece, mas nada mais acontece automaticamente.',
    choices: { auto: 'Automático', prompt: 'Perguntar', off: 'Desligado' }
  }
}

export const DEFAULT_CONFIG = {
  npc: { opposingRoll: 'prompt', damageApplication: 'prompt', followUpRoll: 'prompt' },
  player: { opposingRoll: 'prompt', damageApplication: 'prompt', followUpRoll: 'prompt' }
}

export const PRESETS = {
  promptEverything: {
    label: 'Perguntar em Tudo',
    hint: 'Cada etapa espera um clique, tanto para PdNs quanto para jogadores: o comportamento totalmente manual atual.',
    config: {
      npc: { opposingRoll: 'prompt', damageApplication: 'prompt', followUpRoll: 'prompt' },
      player: { opposingRoll: 'prompt', damageApplication: 'prompt', followUpRoll: 'prompt' }
    }
  },
  fullAutomation: {
    label: 'Automação Completa',
    hint: 'Cada etapa é resolvida automaticamente para PdNs e jogadores, sem cliques. O teste adicional ainda exige confirmação quando não há uma parada de dados definida.',
    config: {
      npc: { opposingRoll: 'auto', damageApplication: 'auto', followUpRoll: 'auto' },
      player: { opposingRoll: 'auto', damageApplication: 'auto', followUpRoll: 'auto' }
    }
  },
  automatedDamageOnly: {
    label: 'Automatizar Apenas Dano',
    hint: 'As rolagens continuam manuais ou exigem confirmação, mas o dano é aplicado automaticamente quando uma rolagem é resolvida.',
    config: {
      npc: { opposingRoll: 'prompt', damageApplication: 'auto', followUpRoll: 'prompt' },
      player: { opposingRoll: 'prompt', damageApplication: 'auto', followUpRoll: 'prompt' }
    }
  }
}

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_CONFIG
  })

  game.settings.registerMenu(MODULE_ID, 'automationConfigMenu', {
    name: 'Configurações de Automação',
    label: 'Configurar Automação',
    hint: 'Níveis de automação por etapa, separados para PdNs e jogadores, além de configurações predefinidas.',
    icon: 'fas fa-sliders-h',
    type: AutomationSettingsApp,
    restricted: true
  })
}

/**
 * Full config object, defensively merged with defaults so a partial/stale
 * stored value (e.g. from before a step was added) doesn't produce
 * undefined lookups.
 */
export function getAutomationConfig() {
  const stored = game.settings.get(MODULE_ID, SETTING_KEY) ?? {}
  return {
    npc: { ...DEFAULT_CONFIG.npc, ...stored.npc },
    player: { ...DEFAULT_CONFIG.player, ...stored.player }
  }
}

export async function setAutomationConfig(config) {
  await game.settings.set(MODULE_ID, SETTING_KEY, config)
}

/**
 * The actual lookup used throughout the module: given a step name and the
 * actor whose side of the roll this step governs (the defender for
 * opposingRoll, the actor taking damage for damageApplication), returns
 * that step's configured level for whichever bucket (npc/player) actually
 * applies to that actor right now.
 */
export function getStepSetting(step, actor) {
  const config = getAutomationConfig()
  const bucket = actor && isPlayerControlled(actor) ? config.player : config.npc
  return bucket[step]
}
