const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

export function withHeaderDamageTracks (BaseSheet) {
  return class HeaderDamageTracksSheet extends BaseSheet {
    #headerTrackUpdate = Promise.resolve()

    static DEFAULT_OPTIONS = {
      actions: {
        increaseHeaderTrack: function (_event, target) {
          return this.#changeHeaderTrack(target.dataset.track, 1)
        }
      }
    }

    async _preparePartContext (partId, context, options) {
      const prepared = await super._preparePartContext(partId, context, options)
      if (partId === 'header') return { ...prepared, canEditHeader: this.isEditable }
      return prepared
    }

    async _onRender (context, options) {
      await super._onRender(context, options)
      this.element?.querySelector('.cs-tracks-header')?.addEventListener('contextmenu', this.#onHeaderContextMenu, { capture: true })
    }

    #onHeaderContextMenu = event => {
      const size = event.target.closest('.cs-track-size')
      const freeBox = event.target.closest('.cs-damage-track > .resource-counter-step[data-state=""]')
      const track = size?.dataset.track ?? freeBox?.parentElement.dataset.track
      if (!track) return

      event.preventDefault()
      // Marked boxes continue to use wod5e's native healing handler.
      if (freeBox) event.stopPropagation()
      return this.#changeHeaderTrack(track, -1)
    }

    #changeHeaderTrack (track, delta) {
      if (track !== 'health' && track !== 'willpower') return

      return this.queueHeaderTrackUpdate(async actor => {
        const { max, superficial, aggravated } = actor.system[track]
        const nextMax = Math.max(0, max + delta)
        if (max === nextMax) return
        const nextSuperficial = Math.min(superficial, nextMax)
        const nextAggravated = Math.min(aggravated, nextMax - nextSuperficial)
        await actor.update({
          [`system.${track}.max`]: nextMax,
          [`system.${track}.superficial`]: nextSuperficial,
          [`system.${track}.aggravated`]: nextAggravated
        })
      })
    }

    queueHeaderTrackUpdate (update, { allowLocked = false } = {}) {
      this.#headerTrackUpdate = this.#headerTrackUpdate
        .then(async () => {
          if (!this.isEditable) return
          const actor = this.actor
          if (actor.system.locked && !allowLocked) {
            ui.notifications.warn(game.i18n.format('WOD5E.Notifications.CannotModifyResourceString', { string: actor.name }))
            return
          }
          await update(actor)
        })
        .catch(error => {
          console.error(`${MODULE_ID} | Falha ao ajustar a trilha`, error)
          ui.notifications.error('Não foi possível ajustar a trilha da ficha.')
        })
      return this.#headerTrackUpdate
    }
  }
}

export async function onEditHumanity (_event, target) {
  if (!this.isEditable || target.disabled) return
  const actor = this.actor
  const { value, stains } = actor.system.humanity
  target.disabled = true
  try {
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: 'Humanidade e Máculas' },
      content: `<div class="form-group"><label for="humanityValue">Humanidade</label>
        <input id="humanityValue" type="number" name="humanity" min="0" max="10" value="${value}"></div>
        <div class="form-group"><label for="humanityStains">Máculas</label>
        <input id="humanityStains" type="number" name="stains" min="0" max="10" value="${stains}"></div>`,
      rejectClose: false,
      ok: {
        label: 'Salvar',
        callback: (_event, button) => ({
          value: button.form.elements.humanity.valueAsNumber,
          stains: button.form.elements.stains.valueAsNumber
        })
      }
    })
    if (!result || !this.isEditable) return
    if (!Number.isInteger(result.value) || !Number.isInteger(result.stains) ||
      result.value < 0 || result.stains < 0 || result.value + result.stains > 10) {
      ui.notifications.warn('Preencha Humanidade e Máculas com números inteiros que juntos ocupem até 10 caixas.')
      return
    }
    await actor.update({ 'system.humanity.value': result.value, 'system.humanity.stains': result.stains })
  } finally {
    target.disabled = false
  }
}
