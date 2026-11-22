import { getImpairmentKey } from '../../automation/scripts/impairment-conditions.js'

export async function onSearchConditions (_event, target) {
  if (!this.isEditable || target.disabled) return

  target.disabled = true
  try {
    const packs = Array.from(game.packs.values()).filter(pack => pack.visible && pack.documentName === 'Item')
    const results = await Promise.allSettled(packs.map(async pack => {
      const index = await pack.getIndex({ fields: ['type'] })
      return Array.from(index.values())
        .filter(entry => entry.type === 'condition')
        .map(entry => ({ name: entry.name, id: entry._id, pack }))
    }))
    const conditions = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    if (!conditions.length) {
      const message = results.some(result => result.status === 'rejected')
        ? 'Não foi possível encontrar Condições. Alguns compêndios não puderam ser consultados.'
        : 'Nenhuma Condição encontrada nos compêndios acessíveis.'
      ui.notifications.warn(message)
      return
    }

    conditions.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.pack.title.localeCompare(b.pack.title, 'pt-BR'))
    const options = conditions.map(({ name, pack }, index) =>
      new Option(`${name} (${pack.title})`, String(index)).outerHTML
    ).join('')
    const selected = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Adicionar condição do compêndio' },
      content: `<select name="condition" aria-label="Condição">
        <option value="" selected disabled>Selecione uma Condição</option>${options}
      </select>`,
      modal: true,
      rejectClose: false,
      buttons: [
        { action: 'add', label: 'Adicionar', default: true, callback: (_event, button) => button.form.elements.condition.value },
        { action: 'cancel', label: 'Cancelar', callback: () => null }
      ]
    })
    if (!this.isEditable || selected == null || selected === '') return

    const choice = conditions[Number(selected)]
    if (!choice || !choice.pack.visible) return
    const condition = await choice.pack.getDocument(choice.id)
    if (!condition || condition.type !== 'condition') {
      ui.notifications.warn('A Condição selecionada não está mais disponível no compêndio.')
      return
    }
    if (!this.isEditable) return

    const actor = this.actor
    const impairment = getImpairmentKey(condition)
    if (impairment && actor.items.some(item => getImpairmentKey(item) === impairment)) {
      ui.notifications.warn('O personagem já tem esta condição de debilitação.')
      return
    }

    const data = condition.toObject()
    delete data._id
    delete data.ownership
    await actor.createEmbeddedDocuments('Item', [data])
  } catch (error) {
    console.error('vampiro-a-mascara-v5-ptbr | Falha ao importar Condição', error)
    ui.notifications.error('Não foi possível adicionar a Condição do compêndio.')
  } finally {
    target.disabled = false
  }
}
