export async function pickCompendiumItem (type, label) {
  const packs = Array.from(game.packs.values()).filter(pack => pack.visible && pack.documentName === 'Item')
  const results = await Promise.allSettled(packs.map(async pack => {
    const index = await pack.getIndex({ fields: ['type'] })
    return Array.from(index.values())
      .filter(entry => entry.type === type)
      .map(entry => ({ name: entry.name, id: entry._id, pack }))
  }))
  const choices = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
  if (!choices.length) {
    const message = results.some(result => result.status === 'rejected')
      ? `Não foi possível buscar todos os itens do tipo ${label} nos compêndios.`
      : `Nenhum item do tipo ${label} encontrado nos compêndios acessíveis.`
    ui.notifications.warn(message)
    return null
  }

  choices.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.pack.title.localeCompare(b.pack.title, 'pt-BR'))
  const options = choices.map(({ name, pack }, index) =>
    new Option(`${name} (${pack.title})`, String(index)).outerHTML
  ).join('')
  const selected = await foundry.applications.api.DialogV2.wait({
    window: { title: `Adicionar ${label} do compêndio` },
    content: `<select name="selectedItem" aria-label="${label}">
      <option value="" selected disabled>Selecione um item</option>${options}
    </select>`,
    modal: true,
    rejectClose: false,
    buttons: [
      { action: 'add', label: 'Adicionar', default: true, callback: (_event, button) => button.form.elements.selectedItem.value },
      { action: 'cancel', label: 'Cancelar', callback: () => null }
    ]
  })
  if (selected == null || selected === '') return null

  const choice = choices[Number(selected)]
  const item = choice?.pack.visible ? await choice.pack.getDocument(choice.id) : null
  if (item?.type === type) return item

  ui.notifications.warn('O item selecionado não está mais disponível no compêndio.')
  return null
}

export async function onSearchCustomRolls (_event, target) {
  if (!this.isEditable || target.disabled) return

  target.disabled = true
  try {
    const item = await pickCompendiumItem('customRoll', 'Rolagem Personalizada')
    if (!item || !this.isEditable) return

    const data = item.toObject()
    delete data._id
    delete data.ownership
    await this.actor.createEmbeddedDocuments('Item', [data])
  } catch (error) {
    console.error('vampiro-a-mascara-v5-ptbr | Falha ao importar Rolagem Personalizada', error)
    ui.notifications.error('Não foi possível adicionar a Rolagem Personalizada do compêndio.')
  } finally {
    target.disabled = false
  }
}
export async function openVisibleCompendium (key) {
  const pack = game.packs.get(key)
  if (!pack?.visible) return false

  const PackApplication = pack.applicationClass
  const app = pack.apps.find(candidate => candidate instanceof PackApplication) ?? new PackApplication({ collection: pack })
  await app.render({ force: true })
  return true
}

export async function onOpenMeritsFlawsCompendium () {
  if (!await openVisibleCompendium('vampiro-a-mascara-v5-ptbr.meritsflaws')) {
    ui.notifications.warn('O compêndio de Vantagens e Defeitos não está acessível.')
  }
}

export async function onOpenEquipmentCompendium () {
  if (!await openVisibleCompendium('vampiro-a-mascara-v5-ptbr.equipment')) {
    ui.notifications.warn('O compêndio de Equipamento não está acessível.')
  }
}
