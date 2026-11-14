import { getRoutingTargets } from './socket-routing.js'
import { applyDamageToTarget } from './damage-application.js'
import { applyStatusCondition } from './condition-application.js'
import { isCriticalWin } from './roll-utils.js'
import { getStepSetting } from './settings.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

// Ward Against Ghouls/Spirits/Lupines/Cainites (corebook p. 276-281) aren't
// opposed contests - see discipline-resistance.js's header comment for why
// they're structurally excluded from that system entirely (it's the
// caster's own deferred Ritual roll against a trespasser, not a resistor
// rolling against them). What they still need is something to remind
// whoever cast one that it exists at all - a Ward is set once, often on an
// object nowhere near the caster, and can sit forgotten for sessions before
// it ever matters. This is pure bookkeeping: prompt for a one-line note on
// what's warded and where when the power is rolled, then drop a real,
// GM/player-editable condition item on the CASTER listing it. Deliberately
// NOT deduped by name like applyStatusCondition (condition-application.js)
// - a caster can have several Wards active on different objects at once,
// and each needs to stay a separate, independently-describable entry rather
// than the newest overwriting the last.
//
// The GM-facing "Trigger Ward" control lives on the condition ITEM's own
// sheet (see the renderConditionItemSheet hook below), not on a chat
// message - a Ward can sit unwarned for a very long time before it's ever
// touched, and chat logs get cleared or scroll out of easy reach over a
// long campaign. The item is exactly as durable as the reminder itself, so
// that's where the trigger lives too.
//
// Triggering prompts the WARD'S OWNER for their roll (Intelligence + Blood
// Sorcery vs Difficulty = Ritual level + 1, corebook p. 274) - not a
// "victim." Wards genuinely have no resistor roll at all; the GM instead
// targets whichever token represents the trespasser before triggering, so
// there's someone to apply the outcome to. On a win, that target takes 1
// Aggravated Health damage (3 on a critical win) and gets a status
// condition marking them as blocked by this specific Ward - a durable
// reminder that they owe a Willpower spend + Stamina+Resolve retry
// (Difficulty 4, or 7 if the trigger was a critical win) before they can
// touch the object again. The retry roll itself is NOT automated - Jake
// wants that handled live at the table rather than adding more tooling for
// a one-off Difficulty test; the condition is just the reminder that it's
// owed, and removing it once they succeed is a manual GM step.
const WARD_POWER_NAMES = new Set([
  'ward against ghouls',
  'ward against spirits',
  'ward against lupines',
  'ward against cainites'
])

// Populated only on the GM's own client, the moment "Trigger Ward" is
// clicked - keyed by casterActorId, consumed the instant that caster's next
// roll of the SAME power comes in. Not synced across clients on purpose,
// same reasoning as pendingResistanceRolls in discipline-resistance.js: the
// .has() check alone is what scopes handling to the one client (the GM's)
// that actually knows about this trigger, without needing a separate author
// check.
const pendingWardResolutions = new Map()

export function registerWardTracking() {
  Hooks.on('createChatMessage', async (message) => {
    const roll = message.rolls?.[0]
    if (!roll || !roll.systemRoll) return

    const actor = message.speakerActor
    if (!actor) return

    // A pending trigger takes priority over (and skips) the "log a new
    // Ward" dialog below - this is the SAME power being rolled again for a
    // completely different reason (resolving an earlier trigger, not
    // casting a fresh Ward).
    if (pendingWardResolutions.has(actor.id)) {
      const pending = pendingWardResolutions.get(actor.id)
      pendingWardResolutions.delete(actor.id)
      await resolveWardTrigger(pending, roll)
      return
    }

    if (message.author?.id !== game.user.id) return

    const title = roll.options?.title?.trim()
    if (!title) return

    // [vtm5e-ptbr] Com o Babele o poder tem nome em português ("Proteção
    // contra Carniçais"), que é o título da rolagem; a lista acima está em
    // inglês. Localiza o poder pelo título e confere o nome original dele.
    const powerItem = actor.items.find((i) => i.type === 'power' && i.name === title)
    const originalName = (powerItem ? enName(powerItem) : title).toLowerCase()
    if (!WARD_POWER_NAMES.has(originalName) && !WARD_POWER_NAMES.has(title.toLowerCase())) return

    const result = await foundry.applications.api.DialogV2.input({
      window: { title: `${title}: Registrar a Proteção` },
      content: `
        <form class="vtm5e-automation-ward-dialog">
          <div class="form-group">
            <label>O que está protegido e onde está?</label>
            <textarea name="note" rows="2" placeholder="Ex.: a porta da frente do refúgio na Rua das Flores, 44"></textarea>
          </div>
        </form>
      `,
      ok: { icon: 'fas fa-check', label: 'Registrar' },
      buttons: [{ action: 'cancel', icon: 'fas fa-times', label: 'Pular' }],
      classes: ['wod5e']
    })

    if (!result || result === 'cancel') return

    const note = result.note?.trim()
    const shortLabel = note ? ` - ${truncate(note, 40)}` : ''

    await actor.createEmbeddedDocuments('Item', [{
      name: `${title}${shortLabel}`,
      type: 'condition',
      img: 'icons/svg/shield.svg',
      system: {
        description: note ? `<p>${note}</p>` : '<p><em>Narrador: descreva o que está protegido e onde.</em></p>'
      },
      // Marks this item as a tracked Ward for the renderConditionItemSheet
      // hook below - ritualLevel is cached here (rather than re-reading the
      // power item later) since the power could be renamed, deleted, or
      // never re-findable by name by the time this actually gets triggered,
      // possibly sessions later.
      flags: {
        [MODULE_ID]: {
          wardTracking: { powerName: title, ritualLevel: powerItem?.system?.level ?? 0 }
        }
      }
    }])

    // Purely a log entry now, not actionable - whispered to the owner + GM
    // since the note can easily contain something the GM doesn't want
    // broadcast to the whole table (where an item is actually hidden, etc).
    const routingTargets = getRoutingTargets(actor)

    await ChatMessage.create({
      content: `
        <div class="vtm5e-automation-recap">
          <p class="vtm5e-automation-recap-title">${title}</p>
          <p class="vtm5e-automation-recap-name">${actor.name}${note ? `: ${note}` : ''}</p>
          <p class="vtm5e-automation-recap-narrative">Registrada como Condição na ficha de ${actor.name}. Abra-a para ativar a Proteção depois.</p>
        </div>
      `,
      whisper: routingTargets.length > 0 ? routingTargets.map((u) => u.id) : undefined
    })
  })

  // GM-only "Trigger Ward" control on the reminder condition's own sheet -
  // durable for as long as the item exists, unlike a chat message.
  Hooks.on('renderConditionItemSheet', (app, html) => {
    const item = app.item
    const wardData = item?.getFlag(MODULE_ID, 'wardTracking')
    if (!wardData) return
    if (!game.user.isGM) return
    if (html.querySelector('.vtm5e-automation-ward-trigger')) return

    const section = document.createElement('fieldset')
    section.classList.add('vtm5e-automation-ward-trigger')

    const legend = document.createElement('legend')
    legend.textContent = 'Ativação da Proteção (automação)'
    section.appendChild(legend)

    const hint = document.createElement('p')
    hint.classList.add('hint')
    hint.textContent = 'Selecione primeiro o token do invasor e clique para solicitar o teste do responsável.'
    section.appendChild(hint)

    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Ativar Proteção'
    button.addEventListener('click', async () => {
      const actor = item.actor
      if (!actor) {
        ui.notifications.warn(`${MODULE_ID} | Esta Proteção não está vinculada a um personagem; não é possível saber a quem solicitar o teste.`)
        return
      }

      const targets = Array.from(game.user.targets)
      if (targets.length === 0) {
        ui.notifications.warn(`${MODULE_ID} | Selecione o token do invasor antes de ativar esta Proteção.`)
        return
      }
      const trespasserActor = targets[0].actor
      if (!trespasserActor) {
        ui.notifications.warn(`${MODULE_ID} | O token selecionado não tem personagem.`)
        return
      }

      // A Ward's own power item is always a definitive, known dice pool (the
      // caster already owns it - it's the same item they cast the Ward
      // with), so Follow-Up Roll: Auto is fully supported here, unlike the
      // generic frenzy-test 'action' consequences in discipline-resistance.js.
      const followUpMode = getStepSetting('followUpRoll', actor)
      if (followUpMode === 'off') {
        ui.notifications.info(`${MODULE_ID} | O teste adicional está Desligado. Resolva "${wardData.powerName}" contra ${trespasserActor.name} manualmente.`)
        return
      }

      // RAW Difficulty for the deferred Ritual roll (corebook p. 274):
      // Ritual level + 1. _rollItem has no difficulty parameter (see
      // item-roll.js - it's hardcoded to 0 and left to wod5e's own
      // roll-confirmation dialog to adjust), so this is passed along as a
      // reminder in the prompt's text rather than set automatically.
      const difficulty = (wardData.ritualLevel ?? 0) + 1
      const routingTargets = getRoutingTargets(actor)
      if (routingTargets.length === 0) {
        ui.notifications.warn(`${MODULE_ID} | Ninguém está online para controlar ${actor.name}. Resolva esta Proteção manualmente.`)
        return
      }

      pendingWardResolutions.set(actor.id, {
        powerName: wardData.powerName,
        difficulty,
        trespasserActorId: trespasserActor.id
      })

      const autoResolve = followUpMode === 'auto'

      await ChatMessage.create({
        content: autoResolve
          ? `<p><b>${wardData.powerName}</b> foi ativada. Teste automático para ${actor.name} (Dificuldade ${difficulty}).</p>`
          : `<p><b>${wardData.powerName}</b> foi ativada. ${actor.name} deve fazer um teste para defendê-la. Defina <b>Dificuldade ${difficulty}</b> na janela do teste.</p>`,
        whisper: routingTargets.map((u) => u.id),
        flags: {
          [MODULE_ID]: {
            pendingWardRoll: { casterActorId: actor.id, powerName: wardData.powerName, difficulty, autoResolve }
          }
        }
      })

      ui.notifications.info(`${MODULE_ID} | ${autoResolve ? 'Teste automático solicitado para' : 'Teste solicitado a'} ${actor.name} para defender "${wardData.powerName}" contra ${trespasserActor.name}.`)
    })
    section.appendChild(button)

    html.appendChild(section)
  })

  // Follow-Up Roll: Auto - the RECEIVING client (whoever the message was
  // actually whispered to - the ward's owner, or the GM as a fallback when
  // no player owner is online) detects "this is meant for me and says
  // auto-resolve" and rolls immediately, no button/click needed. Relies on
  // Foundry's normal document sync delivering the whispered message to that
  // client, same proven pattern discipline-resistance.js's own
  // resistanceAutoResolve flag already uses for cross-client auto-rolling.
  // Only ever true for exactly one cohort (getRoutingTargets returns either
  // player owners or a GM fallback, never both), so this shouldn't double
  // fire in the normal case - though, same as that existing pattern, an
  // actor jointly owned by more than one active player could still see it
  // fire once per owner's client; not solved here since the established
  // resistance flow doesn't solve it either.
  Hooks.on('createChatMessage', async (message) => {
    const pending = message.getFlag(MODULE_ID, 'pendingWardRoll')
    if (!pending?.autoResolve) return
    if (!message.whisper?.includes(game.user.id)) return

    const actor = game.actors.get(pending.casterActorId)
    if (!actor) return

    const powerItem = actor.items.find((i) => i.type === 'power' && i.name === pending.powerName)
    if (!powerItem) {
      ui.notifications.warn(`${MODULE_ID} | Não foi possível encontrar "${pending.powerName}" em ${actor.name}. Faça o teste manualmente (Dificuldade ${pending.difficulty}).`)
      return
    }

    const { _rollItem } = await import('/systems/wod5e/system/actor/scripts/item-roll.js')
    await _rollItem(actor, powerItem)
  })

  // The actual roll button for Follow-Up Roll: Prompt - whispered to the
  // ward's owner (or GM, if no player is online to receive it) by the click
  // handler above. This part stays a chat message on purpose - it's a
  // one-time prompt for a roll that's about to happen right now, not
  // something that needs to survive indefinitely the way the trigger itself
  // does. Skipped entirely in Auto mode (see the hook above) - no button
  // needed when the roll already happened on its own.
  Hooks.on('renderChatMessageHTML', (message, html) => {
    const pending = message.getFlag(MODULE_ID, 'pendingWardRoll')
    if (!pending || pending.autoResolve) return
    if (html.querySelector('.vtm5e-automation-ward-roll-button')) return

    const actor = game.actors.get(pending.casterActorId)
    if (!actor) return

    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('vtm5e-automation-ward-roll-button')
    button.style.marginTop = '4px'
    button.textContent = `Testar para defender a Proteção (Dificuldade ${pending.difficulty})`
    button.addEventListener('click', async () => {
      const powerItem = actor.items.find((i) => i.type === 'power' && i.name === pending.powerName)
      if (!powerItem) {
        ui.notifications.warn(`${MODULE_ID} | Não foi possível encontrar "${pending.powerName}" em ${actor.name}. Faça o teste manualmente (Dificuldade ${pending.difficulty}).`)
        return
      }

      const { _rollItem } = await import('/systems/wod5e/system/actor/scripts/item-roll.js')
      await _rollItem(actor, powerItem)
    })
    html.appendChild(button)
  })
}

async function resolveWardTrigger(pending, roll) {
  const won = roll.total >= pending.difficulty
  const trespasserActor = game.actors.get(pending.trespasserActorId)

  if (!won) {
    await ChatMessage.create({
      content: `
        <div class="vtm5e-automation-recap">
          <p class="vtm5e-automation-recap-title">${pending.powerName}</p>
          <p class="vtm5e-automation-recap-outcome resisted">Falha ao ativar</p>
          <p class="vtm5e-automation-recap-narrative">${trespasserActor?.name ?? 'O invasor'} passa ileso.</p>
        </div>
      `
    })
    return
  }

  const critWin = isCriticalWin(roll)
  const damageAmount = critWin ? 3 : 1
  const retryDifficulty = critWin ? 7 : 4

  let bottomSection = ''

  if (trespasserActor) {
    const token = trespasserActor.getActiveTokens()[0]
    const mode = getStepSetting('damageApplication', trespasserActor)

    if (token && mode === 'auto') {
      await applyDamageToTarget(token, damageAmount, 'aggravated')
      bottomSection = `
        <div class="vtm5e-automation-recap-damage">
          <div class="vtm5e-automation-recap-damage-amount">${damageAmount}</div>
          <div class="vtm5e-automation-recap-damage-label">Dano Agravado - Vitalidade</div>
        </div>
      `
    }

    await applyStatusCondition(trespasserActor, {
      name: `Repelled by ${pending.powerName}`,
      note: `<p>Bloqueado por esta Proteção. Para tentar novamente, gaste um ponto de Força de Vontade e obtenha uma vitória em um teste de Vigor + Determinação (Dificuldade ${retryDifficulty}). Remova esta Condição após o sucesso.</p>`
    })
  }

  await ChatMessage.create({
    content: `
      <div class="vtm5e-automation-recap">
        <p class="vtm5e-automation-recap-title">${pending.powerName}</p>
        <p class="vtm5e-automation-recap-outcome failed">Ativada${critWin ? ' - Vitória Crítica' : ''}</p>
        <p class="vtm5e-automation-recap-narrative">${trespasserActor?.name ?? 'O invasor'} sofre ${damageAmount} de dano Agravado à Vitalidade e fica bloqueado (nova tentativa: Força de Vontade + Vigor + Determinação, Dificuldade ${retryDifficulty}).</p>
        ${bottomSection}
      </div>
    `,
    flags: trespasserActor && !bottomSection
      ? {
          [MODULE_ID]: {
            pendingDamage: { actorId: trespasserActor.id, amount: damageAmount, track: 'health' }
          }
        }
      : {}
  })
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// [vtm5e-ptbr] nome original em ingles de um item traduzido pelo Babele (ou o nome atual, se nao houver)
function enName (doc) {
  return doc?.flags?.babele?.originalName ?? doc?.originalName ?? doc?.name
}
