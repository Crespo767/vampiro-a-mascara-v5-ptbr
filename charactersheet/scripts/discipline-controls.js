import { openVisibleCompendium } from './compendium-picker.js'

export async function onOpenDisciplineCompendium () {
  if (!await openVisibleCompendium('vampiro-a-mascara-v5-ptbr.disciplines')) {
    ui.notifications.warn('O compêndio de Disciplinas não está acessível.')
  }
}

export async function onShowDiscipline (event, target) {
  event.preventDefault()
  if (!this.isEditable || target.disabled) return

  const actor = this.actor
  const choices = Object.entries(actor.system.disciplines ?? {})
    .filter(([, discipline]) => !discipline.visible && !discipline.powers?.length)
    .map(([key, discipline]) => ({ key, name: discipline.displayName || key }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  if (!choices.length) {
    ui.notifications.info('Todas as Disciplinas disponíveis já aparecem na ficha.')
    return
  }

  target.disabled = true
  try {
    const options = choices.map(({ key, name }) => new Option(name, key).outerHTML).join('')
    const key = await foundry.applications.api.DialogV2.prompt({
      window: { title: 'Adicionar Disciplina' },
      content: `<select name="discipline" aria-label="Disciplina">
        <option value="" selected disabled>Selecione uma Disciplina</option>${options}
      </select>`,
      modal: true,
      rejectClose: false,
      ok: {
        label: 'Adicionar',
        callback: (_event, button) => button.form.elements.discipline.value
      }
    })
    if (!this.isEditable || !choices.some(choice => choice.key === key)) return
    await actor.update({ [`system.disciplines.${key}.visible`]: true })
  } finally {
    target.disabled = false
  }
}
