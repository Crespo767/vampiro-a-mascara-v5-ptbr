// Ficha de Personagem do Narrador do wod5e com as trilhas do cabeçalho de Vampiro.
import { SPCActorSheet } from '/systems/wod5e/system/actor/spc-actor-sheet.js'
import { withHeaderDamageTracks } from './header-tracks.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'

export class CharacterSheetSPCActorSheet extends withHeaderDamageTracks(SPCActorSheet) {
  static PARTS = {
    ...SPCActorSheet.PARTS,
    header: { template: `modules/${MODULE_ID}/charactersheet/templates/spc-sheet-header.hbs` }
  }
}
