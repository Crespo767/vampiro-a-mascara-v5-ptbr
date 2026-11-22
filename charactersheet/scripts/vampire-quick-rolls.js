import { _onRoll } from '/systems/wod5e/system/actor/scripts/roll.js'
import { getBloodPotencyValues } from '/systems/wod5e/system/actor/vtm/scripts/blood-potency.js'
import { getActiveModifiers } from '/systems/wod5e/system/scripts/rolls/situational-modifiers.js'
import { canActorRouse } from '../../automation/scripts/rouse-guard.js'
import { getClanKey } from '../../clans/scripts/clan-key.js'

export function onRouseCheck (event, target) {
  if (!this.isEditable) return
  if (!canActorRouse(this.actor)) {
    ui.notifications.warn('A Vitalidade está totalmente preenchida com dano Agravado.')
    return
  }
  return _onRoll.call(this, event, target)
}

export async function onTestFrenzy (event, target) {
  event.preventDefault()
  const actor = this.actor
  if (!this.isEditable || actor.system.frenzyActive || target.disabled) return

  target.disabled = true
  try {
    const title = game.i18n.localize('WOD5E.VTM.ResistingFrenzy')
    const clan = actor.items.find(item => item.type === 'clan')
    const brujah = getClanKey(clan) === 'brujah'
    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title },
      content: `<p>${game.i18n.localize('WOD5E.VTM.FrenzyChoiceResistOrGiveIn')}</p>`,
      modal: true,
      rejectClose: false,
      buttons: [
        ...(brujah ? [{ action: 'fury', label: 'Resistir à fúria com a Perdição de Brujah' }] : []),
        { action: 'resist', label: game.i18n.localize('WOD5E.ItemsList.Resist'), default: true },
        { action: 'give-in', label: game.i18n.localize('WOD5E.VTM.GiveIn') },
        { action: 'cancel', label: game.i18n.localize('WOD5E.Cancel') }
      ]
    })
    if (!this.isEditable || actor.system.frenzyActive) return
    if (choice === 'give-in') {
      await actor.update({ 'system.frenzyActive': true })
      await postFrenzyResult(actor, 'RidingTheWave')
      return
    }
    if (choice !== 'resist' && choice !== 'fury') return

    const { willpower, humanity, blood } = actor.system
    const remainingWillpower = Math.max(willpower.max - willpower.superficial - willpower.aggravated, 0)
    const severity = choice === 'fury' && brujah ? (await getBloodPotencyValues(blood.potency))?.bane ?? 0 : 0
    const pool = Math.max(remainingWillpower + Math.floor(humanity.value / 3) - severity, 1)
    const selectors = ['frenzy']
    const modifiers = await getActiveModifiers({ actor, selectors })
    const basicDice = await WOD5E.api.getBasicDice({ flatMod: pool + modifiers.totalValue, actor })
    await WOD5E.api.Roll({
      basicDice,
      title,
      actor,
      selectors,
      data: actor.system,
      disableAdvancedDice: true,
      callback: async (error, result) => {
        if (error || !result) return
        if (!result.rollSuccessful) await actor.update({ 'system.frenzyActive': true })
        await postFrenzyResult(actor, result.rollSuccessful ? 'ResistingFrenzySuccess' : 'ResistingFrenzyFailed')
      }
    })
  } finally {
    target.disabled = false
  }
}

async function postFrenzyResult (actor, result) {
  await foundry.documents.ChatMessage.implementation.create({
    flags: {
      wod5e: {
        name: game.i18n.localize(`WOD5E.VTM.${result}`),
        description: game.i18n.format(`WOD5E.VTM.${result}Description`, { actor: actor.name }),
        img: 'systems/wod5e/assets/icons/dice/vampire/bestial-failure.png'
      }
    }
  })
}
