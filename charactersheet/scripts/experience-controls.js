const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'
const SHOP_ACTOR_TYPES = new Set(['vampire', 'ghoul'])

export function prepareExperienceSheetContext (context, canEdit) {
  context.canEditExperience = canEdit
  context.derivedXP ??= { remainingXP: context.exp?.value ?? 0, totalXP: context.exp?.max ?? 0 }
  return context
}

export async function onRecordExperience (event, target) {
  event.preventDefault()
  if (!this.isEditable || target.disabled) return

  const actor = this.actor
  const spend = target.dataset.operation === 'spend'
  const shop = game.modules.get(MODULE_ID)?.api
  if (spend && SHOP_ACTOR_TYPES.has(actor.type) && typeof shop?.open === 'function') return shop.open(actor)

  const title = spend ? 'Gastar Experiência' : 'Adicionar Experiência'
  target.disabled = true
  try {
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content: `<div class="form-group"><label for="xpEntryName">Descrição</label>
        <input id="xpEntryName" name="entryName" type="text" placeholder="${spend ? 'XP gasto' : 'XP recebido'}"></div>
        <div class="form-group"><label for="xpEntryPoints">Pontos de XP</label>
        <input id="xpEntryPoints" name="points" type="number" min="1" step="1" required></div>`,
      modal: true,
      rejectClose: false,
      ok: {
        label: 'Registrar',
        callback: (_event, button) => ({
          name: button.form.elements.entryName.value.trim(),
          points: button.form.elements.points.valueAsNumber
        })
      }
    })
    if (!result || !this.isEditable) return
    if (!Number.isSafeInteger(result.points) || result.points < 1) {
      ui.notifications.warn('Informe um número inteiro positivo de pontos de XP.')
      return
    }

    const entry = {
      id: foundry.utils.randomID(8),
      name: result.name || (spend ? 'XP gasto' : 'XP recebido'),
      value: spend ? -result.points : result.points,
      timestamp: Date.now()
    }
    await actor.update({ 'system.experiences': [...(actor.system.experiences ?? []), entry] })
  } finally {
    target.disabled = false
  }
}

export async function onRemoveExperienceEntry (event, target) {
  event.preventDefault()
  if (!this.isEditable || target.dataset.confirming) return

  const actor = this.actor
  const id = target.dataset.experienceId
  const entry = actor.system.experiences?.find(experience => experience.id === id)
  if (!entry) return

  target.dataset.confirming = 'true'
  try {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Excluir lançamento de XP' },
      content: Number(entry.value) < 0
        ? '<p>Excluir este gasto devolve o XP ao saldo. Características e itens adquiridos continuam na ficha. Excluir o lançamento?</p>'
        : '<p>Excluir este lançamento altera o saldo de XP. Excluir o lançamento?</p>',
      modal: true,
      rejectClose: false,
      yes: { label: 'Excluir' },
      no: { label: 'Cancelar', default: true }
    })
    if (!confirmed || !this.isEditable) return

    const entries = actor.system.experiences ?? []
    const remaining = entries.filter(experience => experience.id !== id)
    if (remaining.length !== entries.length) await actor.update({ 'system.experiences': remaining })
  } finally {
    delete target.dataset.confirming
  }
}
