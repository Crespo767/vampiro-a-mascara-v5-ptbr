import { getImpairmentKey } from '../../automation/scripts/impairment-conditions.js'
import { formatDataItemId } from '/systems/wod5e/system/actor/scripts/format-data-item-id.js'
import { openVisibleCompendium, pickCompendiumItem } from './compendium-picker.js'

const CONDITIONS_PACK = 'wod5e.conditions'

async function createCondition (sheet, data) {
  if (!sheet.isEditable) return
  await sheet.actor.createEmbeddedDocuments('Item', [data])
}

async function importCondition (sheet, condition) {
  const impairment = getImpairmentKey(condition)
  if (impairment && sheet.actor.items.some(item => getImpairmentKey(item) === impairment)) {
    ui.notifications.warn('O personagem já tem esta condição de debilitação.')
    return
  }

  const data = condition.toObject()
  delete data._id
  delete data.ownership
  await createCondition(sheet, data)
}

export async function onCreateCondition (event, target) {
  event.preventDefault()
  if (!this.isEditable || target.dataset.creating) return

  target.dataset.creating = 'true'
  try {
    const name = game.i18n.format('WOD5E.NewString', { string: game.i18n.localize('TYPES.Item.condition') })
    await createCondition(this, { name, type: 'condition', flags: { wod5e: { dataItemId: `condition-${formatDataItemId(name)}` } } })
  } catch (error) {
    console.error('Falha ao criar Condição.', error)
    ui.notifications.error('Não foi possível criar a Condição.')
  } finally {
    delete target.dataset.creating
  }
}

export function withConditionDrop (BaseSheet) {
  return class ConditionDropSheet extends BaseSheet {
    async _onDrop (event) {
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
      if (!this.isEditable || data.type !== 'Item') return super._onDrop(event)

      const item = await Item.implementation.fromDropData(data)
      if (item?.type !== 'condition' || item.parent?.uuid === this.actor.uuid) return super._onDrop(event)
      try {
        await importCondition(this, item)
      } catch (error) {
        console.error('Falha ao importar Condição.', error)
        ui.notifications.error('Não foi possível adicionar a Condição.')
      }
    }
  }
}

export async function onSearchConditions (_event, target) {
  if (!this.isEditable || target.disabled) return

  target.disabled = true
  try {
    if (await openVisibleCompendium(CONDITIONS_PACK)) return

    const condition = await pickCompendiumItem('condition', 'Condição')
    if (condition && this.isEditable) await importCondition(this, condition)
  } catch (error) {
    console.error('vampiro-a-mascara-v5-ptbr | Falha ao importar Condição', error)
    ui.notifications.error('Não foi possível adicionar a Condição do compêndio.')
  } finally {
    target.disabled = false
  }
}
