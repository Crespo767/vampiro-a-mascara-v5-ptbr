// A small crown button on the Actors sidebar's folder header row(s) -
// Pathfinder party-sheet-module-inspired, per Jake's ask - so opening the
// Coterie window never needs Smartphone Widget installed at all. The phone
// app tile (coterie-phone-app.js) stays as a nice-to-have on top of this
// for anyone who does run Smartphone Widget; this is the real primary entry
// point for the public bundle.
//
// Only appears on folders that actually contain at least one player-owned
// actor - a generic "this looks like a PC folder" heuristic rather than a
// hardcoded folder name, so it doesn't clutter unrelated folders (Shops,
// NPCs, etc) and needs no GM setup to show up in the right place.
//
// Confirmed against the real installed folder-partial.hbs on the sandbox:
// each folder row is `<li class="directory-item folder" data-folder-id="...">`
// wrapping a `<header class="folder-header" data-action="toggleFolder">` -
// appending our button there, not inside the .subdirectory content area.

export function registerDirectoryButton () {
  Hooks.on('renderActorDirectory', (_app, html) => {
    const root = html instanceof HTMLElement ? html : html[0]
    if (!root) return

    // [vtm5e-ptbr] Coroa fixa no topo da aba, ao lado de "Criar Ator" e
    // "Criar Pasta": a Coterie abre mesmo quando os personagens dos
    // jogadores estão fora de pastas.
    const actions = root.querySelector('.directory-header .header-actions')
    if (actions && !actions.querySelector('.vtm5e-coterie-header-btn')) {
      const top = document.createElement('button')
      top.type = 'button'
      top.className = 'vtm5e-coterie-header-btn'
      top.innerHTML = '<i class="fas fa-crown" inert></i><span>Coterie</span>'
      top.addEventListener('click', (event) => {
        event.preventDefault()
        game.modules.get('vampiro-a-mascara-v5-ptbr')?.api?.openCoterie()
      })
      actions.appendChild(top)
    }

    root.querySelectorAll('.directory-item.folder').forEach((li) => {
      const header = li.querySelector(':scope > .folder-header')
      if (!header || header.querySelector('.vtm5e-coterie-open-btn')) return

      const folder = game.folders.get(li.dataset.folderId)
      const hasPlayerActor = folder?.contents?.some((a) => a.hasPlayerOwner)
      if (!hasPlayerActor) return

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'vtm5e-coterie-open-btn icon'
      button.dataset.tooltip = 'Abrir Coterie'
      button.innerHTML = '<i class="fas fa-crown"></i>'
      button.addEventListener('click', (event) => {
        event.stopPropagation() // don't also toggle the folder open/closed
        game.modules.get('vampiro-a-mascara-v5-ptbr')?.api?.openCoterie()
      })
      header.appendChild(button)
    })
  })
}
