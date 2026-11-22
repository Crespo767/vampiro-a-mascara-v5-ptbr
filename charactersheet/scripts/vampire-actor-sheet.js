// Extends wod5e's real VampireActorSheet rather than replacing it, so all
// existing data-binding/roll wiring (dot counters, damage tracking,
// disciplines, item actions) keeps working untouched. This module only
// swaps specific PARTS for its own templates and narrows/reorders the
// visible tab list to match the reference design.
import { VampireActorSheet } from '/systems/wod5e/system/actor/vtm/vampire-actor-sheet.js'
import {
  prepareDisciplinesFlatContext,
  prepareMeritsFlawsContext,
  prepareCurrencyContext,
  decorateStatsTooltips,
  onToggleExpandRow,
  onSpendOrAddExperience
} from './shared-context.js'
import { onSearchConditions } from './condition-picker.js'
import { onRouseCheck, onTestFrenzy } from './vampire-quick-rolls.js'
import { onEditResonance } from './feed.js'
// [vtm5e-ptbr] nome em português e texto do livro das Compulsões (mesma fonte da automação)
import { COMPULSION_BY_NAME, getCompulsionsForClan } from '../../automation/scripts/compulsion.js'
import { checkRestrictions } from '../../chargen/scripts/grant-engine.js'
import { getClanKey } from '../../clans/scripts/clan-key.js'

const MODULE_ID = 'vampiro-a-mascara-v5-ptbr'
const HEADER_CHOICES = new Map([
  ['clan', { pack: 'clans', title: 'Selecionar Clã' }],
  ['predatorType', { pack: 'predatortypes', title: 'Selecionar Predador' }]
])
// Official V5 Bane titles per clan, transcribed from the "Clan Sheet"
// quick-reference spreads in the Player's Guide (pp. 11-13: each clan's
// BANE/COMPULSION line), same short-title convention as Compulsion names
// above. Each clan has exactly one canonical Bane, so unlike Compulsion
// this isn't a picker - it's just looked up from the actor's clan.
const CLAN_BANE_NAMES = {
  caitiff: 'Nenhuma Perdição Comum',
  'thin-blooded': 'Nenhuma Perdição Comum',
  brujah: 'Temperamento Violento',
  gangrel: 'Características Bestiais',
  malkavian: 'Perspectiva Fraturada',
  nosferatu: 'Repulsivos',
  toreador: 'Fixação Estética',
  tremere: 'Sangue Deficiente',
  ventrue: 'Paladar Refinado',
  'banu haqim': 'Vício em Sangue',
  hecata: 'Beijo Doloroso',
  lasombra: 'Imagem Distorcida',
  ministry: 'Abomina a Luz',
  ravnos: 'Condenados',
  salubri: 'Caçados',
  tzimisce: 'Enraizados'
}

// Full Bane text, keyed the same way as CLAN_BANE_NAMES above. Bane is
// 1:1 with Clan (every vampire of a given clan has the exact same Bane -
// there's no picker, no per-character variation), so this is looked up
// directly from the actor's Clan name rather than read off the Clan
// Item's own `system.bane` field. That field turned out to be unreliable
// on some third-party compendium Items (e.g. the corebook clans shipped
// by vampire-the-masquerade-5e-compendium never populated it, so the
// hover tooltip stayed empty for those clans no matter what the Item
// itself said) - looking it up the same way Compulsion text already is
// (COMPULSION_TEXT_BY_NAME above) sidesteps that entirely and auto-
// updates the instant a different Clan item is dropped onto the sheet,
// with no dependency on any particular compendium's data quality.
// Verbatim from "Vampire the Masquerade.pdf" (corebook) and the V5
// Player's Guide via pdftotext -raw - same transcriptions already used in
// configure-corebook-clan-banes-compendium.js and
// configure-new-clans-compendium.js.
const CLAN_BANE_TEXT = {
  caitiff: '<p>Intocados pelos Antediluvianos, os Caitiff não compartilham nenhuma perdição. Personagens Caitiff começam com o Defeito Suspeito (•) e você não pode adquirir Status para eles durante a criação de personagem. O Narrador sempre pode impor uma penalidade de um ou dois dados a testes Sociais contra Membros que saibam que eles são Caitiffs, a despeito do seu eventual Status.</p><p>Além disso, aumentar uma das Disciplinas de um Caitiff custa seis vezes o nível adquirido em pontos de experiência.</p>',
  brujah: '<p>O Sangue dos Brujah fervilha com fúria malcontida, que explode sob a menor provocação. Subtraia uma quantidade de dados igual à Gravidade da Perdição do Brujah de qualquer parada para resistir a um frenesi de fúria, o que não pode reduzir a parada a menos do que um dado.</p>',
  gangrel: '<p>Os Gangrel se relacionam com sua Besta como os demais Membros se relacionam com os Gangrel: com desconfiança. Quando em frenesi, os Gangrel ganham um ou mais de um aspecto animalesco: um traço físico, um odor ou um comportamento. Esses aspectos duram por mais uma noite depois do frenesi, persistindo como uma ressaca após uma farra. Cada aspecto reduz um Atributo em 1 ponto – o Narrador pode decidir que uma língua bifurcada ou um odor de urso reduzem Carisma, enquanto orelhas de morcego reduzem Determinação (“todos esses sons me distraem”). Na dúvida, o aspecto reduz Inteligência ou Manipulação.</p><p>A quantidade de aspectos que um Gangrel manifesta é igual à sua Gravidade da Perdição. Se seu personagem Curtir a Onda do frenesi dele (consulte a pág. 219), você pode escolher manifestar apenas um aspecto, portanto sofrendo apenas uma penalidade em um Atributo.</p>',
  malkavian: '<p>Afligidos por sua linhagem, todos os Malkavianos são amaldiçoados com pelo menos um tipo de transtorno mental. Dependendo da sua história e do estado da sua mente ao morrer, eles podem experimentar delírios, visões de clareza terrível ou algo totalmente diferente.</p><p>Quando um Malkaviano sofre uma Falha Bestial ou uma Compulsão, sua perdição vem à tona. Nesse caso, o personagem sofre uma penalidade igual à sua Gravidade da Perdição em uma categoria de parada de dados (Física, Social ou Mental) durante toda a cena. Isso se soma a todas as penalidades devidas a Compulsões.</p><p>Durante a criação do personagem, o jogador e o Narrador decidem qual tipo de penalidade e a natureza exata da aflição que acomete o personagem.</p><p>Exemplo: <em>Heloísa decide que sua personagem, uma Malkaviana conhecida como Gizzard, às vezes, em vez de sentir sensações físicas, ela as experimenta na forma de vozes. Quando isso ocorre, ela sofre uma penalidade de -1 (sua Gravidade da Perdição é 1) em todas as paradas Físicas conforme as vozes a distraem. Naturalmente, isso deve ser interpretado.</em></p>',
  nosferatu: '<p>Hediondos e vis, considera-se que todos os Nosferatu possuem o Defeito Repulsivo (-2) e jamais podem aumentar seu valor na Qualidade Visual. Além disso, qualquer tentativa de esconder suas deformidades resulta em uma penalidade à parada de dados igual à Gravidade da Perdição do personagem (o que inclui poderes de Disciplina, como Máscara de Mil Faces e Disfarce do Impostor). A maioria dos Nosferatu não quebra a Máscara ao serem avistados. Eles são vistos pelos mortais como grotescos e quase sempre aterrorizantes, mas nem sempre de modo sobrenatural.</p>',
  toreador: '<p>Os Toreador exemplificam o velho ditado segundo o qual a arte no sangue assume formas estranhas. Eles desejam tão intensamente a beleza que acabam sofrendo em sua ausência. Enquanto seu personagem se encontrar em um ambiente menos do que belo, suas paradas de dados usadas para acionar Disciplinas sofrem um redutor equivalente à sua Gravidade da Perdição. O Narrador decide especificamente como a beleza ou feiura do ambiente em que um Toreador se encontra (incluindo roupas, bonecas de sangue etc.) o penaliza, baseando-se no senso estético do personagem. Dito isso, até os devotos da Escola Ashcan jamais acham as ruas comuns perfeitamente belas. Essa obsessão com a estética também faz com que as divas se percam em momentos de beleza e com que uma falha bestial geralmente resulte em um transe de arrebatamento, conforme detalhado nas regras de Compulsões (pág. 208).</p>',
  tremere: '<p>Houve um tempo em que o clã foi definido por uma rígida hierarquia de Laços de Sangue que iam do topo à base da Pirâmide. Entretanto, após a queda de Viena, seu Sangue recuou e abortou todas essas conexões. O Vitae Tremere não tem mais a capacidade de criar Laços de Sangue com outros Membros, embora os próprios Tremere possam ser Enlaçados por Membros de outros clãs. Um Tremere ainda consegue enlaçar mortais e carniçais, embora seu Vitae corrompido precise ser consumido um número de vezes extra igual à Gravidade da Perdição do vampiro para que o laço se forme. Alguns pensam que essa mudança é a vingança do Antediluviano devorado por Tremere, outros a atribuem a uma simples mutação. Seja como for, o clã estuda seu próprio Vitae atentamente para descobrir se o processo pode ser revertido e se, de fato, eles desejam isso.</p>',
  ventrue: '<p>Os Ventrue possuem paladares refinados. Quando um Bórgia bebe sangue de qualquer mortal que não seja da sua preferência, ele precisa fazer um grande esforço de vontade para que o sangue não volte na forma de vômito escarlate. Os gostos variam grandemente, indo desde sangues azuis que só se alimentam de morenas genuínas, de indivíduos de descendência suíça ou homossexuais, àqueles que só bebem de soldados, de mortais que sofrem de transtorno de estresse pós-traumático ou de usuários de metanfetamina. Com um teste de Determinação + Percepção (Dificuldade 4 ou maior), seu personagem pode sentir se um mortal possui o sangue desejado.</p><p>Se você quer que seu personagem se alimente de tudo que não seja seu tipo de vítima predileta, você deve gastar uma quantidade de pontos de Força de Vontade igual à Gravidade da Perdição do personagem.</p>',
  'banu haqim': '<p>Quando um Banu Haqim sacia ao menos um nível de Fome com Sangue de outro vampiro, ele deve fazer um teste de Frenesi de Fome com Dificuldade 2 + sua Gravidade da Perdição. Se falhar, tenta se empanturrar com o Sangue da vítima, podendo chegar a cometer diablerie. <em>(tradução não oficial)</em></p>',
  hecata: '<p>O Beijo dos Hecata causa agonia. Ao beber diretamente de uma vítima, um Hecata só pode fazer uma alimentação prejudicial, causando perda de sangue. Mortais relutantes que não estejam contidos tentam escapar; mesmo os coagidos ou voluntários devem passar em um teste de Vigor + Determinação, Dificuldade 2 + Gravidade da Perdição, para não lutar contra a dor. Vampiros coagidos ou voluntários mordidos por um Hecata devem fazer um teste de Frenesi, Dificuldade 3, para evitar um Frenesi de terror. <em>(tradução não oficial)</em></p>',
  lasombra: '<p>O reflexo ou a imagem gravada de um Lasombra é distorcido. Quem souber o que procurar pode reconhecê-lo como vampiro; outras pessoas percebem que algo está errado. Isso não esconde necessariamente sua identidade em imagens de vigilância.</p><p>Usar tecnologia moderna de comunicação, inclusive fazer uma chamada telefônica, exige um teste de Tecnologia com Dificuldade 2 + Gravidade da Perdição. Microfones apresentam problemas com sua voz assim como câmeras com sua imagem. O Lasombra sofre uma penalidade igual à Gravidade da Perdição ao evitar sistemas eletrônicos de detecção de vampiros. <em>(tradução não oficial)</em></p>',
  ministry: '<p>Sob luz intensa dirigida diretamente a eles, natural ou artificial, os membros do Ministério sofrem uma penalidade em todas as paradas de dados igual à sua Gravidade da Perdição. Acrescente também a Gravidade da Perdição ao dano Agravado sofrido pela luz solar. <em>(tradução não oficial)</em></p>',
  ravnos: '<p>Os Ravnos estão <em>condenados</em>. O fogo solar que incinerou seu fundador arde no Sangue do clã, irrompendo da sua carne caso se estabeleçam por muito tempo. Quando um Ravnos dorme no mesmo local mais do que uma vez em sete noites, role uma quantidade de dados igual à Gravidade da Perdição dele. Ele sofre uma quantidade de dano Agravado igual ao número de resultados iguais a 10 (críticos) rolado conforme é queimado de dentro para fora. Isso acontece toda vez que um Ravnos passa um dia em um local em que já dormiu há menos de uma semana. O que constitui uma semana neste caso depende da amplitude da crônica. Contudo, a menos que dito o contrário, dois locais de descanso precisam estar distanciados entre si por no mínimo 1,6 quilômetro para se evitar a Perdição. Além disso, um refúgio móvel, como um trailer ou caminhonete, é seguro, contanto que o local onde fique estacionado esteja pelo menos a 1,6 quilômetro de distância do último local. Personagens Ravnos não podem adquirir o Defeito Nenhum Refúgio durante a sua criação.</p><p><em>(Guia Suplementar de Vampiro: A Máscara, p. 9)</em></p>',
  salubri: '<p>Os Salubri são <em>caçados</em>: Membros de outros clãs são particularmente... <em>apaixonados</em> pelo Vitae Salubri. Quando um vampiro não pertencente ao Clã Salubri consome o sangue de um Ciclope, geralmente acha difícil parar de sugar. Consumir o suficiente para saciar ao menos um nível de Fome requer um teste de Frenesi de Fome (consulte a pág. 220 de <em>Vampiro: A Máscara</em>) com Dificuldade 2 + a Gravidade da Perdição do Salubri (para Banu Haqim a dificuldade é 3 + a sua Gravidade da Perdição). Em caso de falha, <em>o vampiro simplesmente continuará a sugar</em>, até o ponto de precisar ser impedido fisicamente.</p><p>Além disso, o terceiro olho que Saulot abriu enquanto realizava uma das suas muitas jornadas foi herdado pela linhagem. Esse terceiro olho nem sempre tem a aparência de um olho humano, e há rumores da existência de pupilas verticais e serpentinas, até mesmo de manchas fotossensíveis semelhantes às de anelídeos. Apesar de esse olho poder ser fisicamente coberto com um lenço ou capuz, ele está sempre presente e nenhum poder sobrenatural consegue escondê-lo. Sempre que um Salubri ativa um poder de Disciplina, o terceiro olho chora sangue, tanto mais quanto maior o nível da Disciplina em uso, a quantidade variando de umas poucas lágrimas a um fluxo torrencial. Esse sangue provoca um teste de Frenesi de Fome em vampiros próximos que tenham Fome 4 ou maior.</p><p><em>Nota do módulo: nos dois casos a Gravidade da Perdição usada é a do Salubri (o original em inglês repete isso).</em> <em>(Guia Suplementar de Vampiro: A Máscara, p. 15)</em></p>',
  tzimisce: '<p>Os Tzimisce são <em>enraizados</em>: todo Tzimisce deve escolher uma posse específica – um domínio físico, um grupo de pessoas, uma organização ou até mesmo algo mais esotérico – claramente definida e limitada. Os integrantes do clã devem passar seu dia de sono cercados pela posse escolhida. Historicamente, isso quase sempre significa dormir no solo da sua terra, mas também pode significar estar cercado por aquilo que nas noites de hoje eles dominam: um certo tipo de gente, uma construção profundamente ligada à sua obsessão, uma facção da contracultura local ou elementos ainda mais improváveis. Quando deixa de fazê-lo, eles sofrem uma quantidade de dano Agravado à Força de Vontade igual à sua Gravidade da Perdição ao despertar na noite seguinte.</p><p><em>(Guia Suplementar de Vampiro: A Máscara, p. 19)</em></p>'
}

// Clan hover-tooltip text: Sobriquet + in-clan Disciplines + one line of
// flavor, keyed the same way as CLAN_BANE_TEXT/CLAN_BANE_NAMES above.
// Looked up by name rather than read off the Clan Item's own
// `system.description` field for the same reason as Bane - the field on
// the actual Items (particularly the third-party community compendium's
// corebook clans) turned out to hold boilerplate/placeholder content
// rather than real per-clan text, so the tooltip showed the same generic
// filler no matter which clan was selected. This is intentionally short
// (a quick-reference tooltip, not the full compendium entry) - Bane
// detail already has its own separate tooltip, so it isn't repeated
// here. Verbatim/paraphrased-minimally from "Vampire the Masquerade.pdf"
// (corebook) and the V5 Player's Guide via pdftotext -raw.
const CLAN_DESCRIPTION_TEXT = {
  caitiff: 'Alcunhas: Os Sem-Clã, Órfãos, Panders. Sem Disciplinas de clã fixas: na criação, escolha duas Disciplinas quaisquer, com dois pontos em uma e um na outra. Nem todo Membro herda a maldição de um dos clãs conhecidos; o que os Caitiff perdem em respeito e linhagem compensam com um Sangue flexível e a ausência de uma perdição incapacitante.',
  brujah: 'Alcunhas: O Clã Erudito, Ralé, Rebeldes. Disciplinas do Clã: Celeridade, Potência, Presença. Idealistas e agitadores inflamados que sempre lutaram pelo progresso da sociedade dos Membros, seja derrubando o sistema, seja defendendo-o até o fim.',
  gangrel: 'Alcunhas: O Clã das Feras, Párias, Lobos. Disciplinas do Clã: Animalismo, Fortitude, Proteanismo. Párias, andarilhos, arruaceiros e caçadores que se refugiam nas partes mais pobres das cidades sem se envergonhar disso; reivindicam poucos domínios e não se curvam a nenhum Príncipe.',
  malkavian: 'Alcunhas: O Clã da Lua, Lunáticos, Filhos de Malkav. Disciplinas do Clã: Auspícios, Dominação, Ofuscação. Seus dons extrassensoriais correm soltos ao lado de um transtorno mental amaldiçoado: veem demais do mundo de uma vez, entendem fundo demais, sentem forte demais para suportar.',
  nosferatu: 'Alcunhas: Horrores, O Clã dos Ocultos, Ratos de Esgoto. Disciplinas do Clã: Animalismo, Ofuscação, Potência. O Abraço os deforma em abominações grotescas ao longo de semanas de dor; trazem a maldição por fora, não por dentro, e se consideram, só meio de brincadeira, os mais humanos dos Membros.',
  toreador: 'Alcunhas: Divas, O Clã da Rosa, Artistas. Disciplinas do Clã: Auspícios, Celeridade, Presença. Obcecados pela perfeição estética em todas as formas, bela ou terrível: beleza é poder, e o amor pode fazer até os mortos sentirem algo real.',
  tremere: 'Alcunhas: Usurpadores, Bruxos, O Clã Quebrado. Disciplinas do Clã: Auspícios, Dominação, Feitiçaria de Sangue. Antigos magos herméticos que buscaram o elixir da vida e encontraram a maldição de Caim; hoje fazem sua magia com sangue fresco no lugar do ritual.',
  ventrue: 'Alcunhas: O Clã dos Reis, Sangues-Azuis, Patrícios. Disciplinas do Clã: Dominação, Fortitude, Presença. Movidos pelo impulso de governar, os Ventrue há muito ocupam mais posições de poder na Camarilla do que qualquer outro clã, e detestam ter de renunciar a elas.',
  'banu haqim': 'Alcunhas: Os Juízes, Filhos de Haqim, Mediadores. Disciplinas do Clã: Feitiçaria de Sangue, Celeridade, Ofuscação. Os de fora os veem como obstinados, sóbrios e severos; a cultura do clã valoriza quem persegue objetivos e põe os feitos acima da linhagem ou da tradição. <em>(tradução não oficial)</em>',
  hecata: 'Alcunhas: Os Necromantes, Membros-Demônio, Clã da Morte. Disciplinas do Clã: Auspícios, Fortitude, Oblívio. Um clã guarda-chuva de linhagens voltadas à morte, presente em inúmeros domínios e sempre mal recebido; de um Hecata sempre se pode esperar uma opinião sem rodeios, ainda que não honesta. <em>(tradução não oficial)</em>',
  lasombra: 'Alcunhas: Clã da Noite, Magistrados, Guardiões das Sombras. Disciplinas do Clã: Dominação, Oblívio, Potência. Poucos clãs são tão implacavelmente eficientes em atingir seus objetivos: para esmagar rivais ou consolidar influência, os Lasombra não fazem nada pela metade. <em>(tradução não oficial)</em>',
  ministry: 'Alcunhas: Serpentes, Clã da Fé, Setitas. Disciplinas do Clã: Ofuscação, Presença, Proteanismo. Veem o mundo como um mercado e querem ser os confidentes de todos, oferecendo tudo o que os outros oferecem, e mais. <em>(tradução não oficial)</em>',
  ravnos: 'Alcunhas: Trapaceiros, Corvos, Audazes, Os Assombrados. Disciplinas do Clã: Animalismo, Ofuscação, Presença. Andarilhos de sangue indomado, encontrados em quase toda parte e à vontade em qualquer ambiente, embora as estruturas mais conservadoras dos Membros os vejam como ervas daninhas num jardim bem cuidado. <em>(tradução não oficial)</em>',
  salubri: 'Alcunhas: Ciclopes, Ladrões de Almas, Progênie de Saulot. Disciplinas do Clã: Auspícios, Dominação, Fortitude. Um clã caçado pelos pilares da sociedade dos Membros; a má fama é injusta, e quase todo Salubri precisa de uma coterie para se proteger nas noites após o Abraço. <em>(tradução não oficial)</em>',
  tzimisce: 'Alcunhas: Dragões, O Velho Clã, Voivodes. Disciplinas do Clã: Animalismo, Dominação, Proteanismo. Uma força intimidadora em qualquer grupo social, em boa parte pela postura: um Tzimisce considera uma coterie, seis quarteirões ou uma propriedade inteira simplesmente seus. <em>(tradução não oficial)</em>'
}

export class CharacterSheetVampireActorSheet extends VampireActorSheet {
  #choosingHeaderItem = false
  #headerTrackUpdate = Promise.resolve()

  // wod5e's base sheet defaults to a cramped 1000x800 window (WoDActorBase.
  // DEFAULT_OPTIONS) - the reference screenshots were clearly captured from
  // a much wider window (~1500px+), which is a big part of why every dot
  // row/label read as "clunky" at the default size: the same space-between
  // spacing that looks airy at 1500px looks stretched/cramped at 1000px.
  // Foundry deep-merges static DEFAULT_OPTIONS up the prototype chain, so
  // only the changed keys need to be declared here.
  static DEFAULT_OPTIONS = {
    position: { width: 1400, height: 900 },
    actions: {
      searchConditions: onSearchConditions,
      toggleExpandRow: onToggleExpandRow,
      addExperience: onSpendOrAddExperience,
      rouseCheck: onRouseCheck,
      resistFrenzy: onTestFrenzy,
      editResonance: onEditResonance,
      increaseHeaderTrack: function (_event, target) {
        return this.#changeHeaderTrack(target.dataset.track, 1)
      },
      editHumanity: function (_event, target) {
        return this.#editHumanity(target)
      },
      chooseHeaderItem: function (_event, target) {
        return this.#chooseHeaderItem(target.dataset.type)
      },
      openChargenWizard: function () {
        game.modules.get(MODULE_ID).api.openChargenWizard(this.document)
      }
    }
  }

  async _onRender (context, options) {
    await super._onRender(context, options)
    this.element?.querySelector('.cs-vampire-header')?.addEventListener('contextmenu', this.#onHeaderContextMenu, { capture: true })
  }

  #onHeaderContextMenu = event => {
    const size = event.target.closest('.cs-track-size')
    const dots = event.target.closest('.resource-value-step')?.closest('.cs-header-dots')
    const freeBox = event.target.closest('.cs-damage-track > .resource-counter-step[data-state=""]')
    const track = size?.dataset.track ?? dots?.dataset.track ?? freeBox?.parentElement.dataset.track
    if (!track) return

    event.preventDefault()
    // The wod5e listener on the square itself still handles healing marked boxes.
    if (freeBox) event.stopPropagation()
    return this.#changeHeaderTrack(track, -1)
  }

  #changeHeaderTrack (track, delta) {
    this.#headerTrackUpdate = this.#headerTrackUpdate
      .then(async () => {
        const actor = this.actor
        if (!this.isEditable) return
        if (actor.system.locked && track !== 'hunger') {
          ui.notifications.warn(game.i18n.format('WOD5E.Notifications.CannotModifyResourceString', { string: actor.name }))
          return
        }

        if (track === 'hunger' || track === 'potency') {
          const isHunger = track === 'hunger'
          const value = isHunger ? actor.system.hunger.value : actor.system.blood.potency
          const path = isHunger ? 'system.hunger.value' : 'system.blood.potency'
          if (value > 0) await actor.update({ [path]: value - 1 })
          return
        }

        if (track !== 'health' && track !== 'willpower') return
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
      .catch(error => {
        console.error(`${MODULE_ID} | Falha ao ajustar a trilha`, error)
        ui.notifications.error('Não foi possível ajustar a trilha da ficha.')
      })
    return this.#headerTrackUpdate
  }

  _getHeaderControls () {
    const controls = super._getHeaderControls()
    if (game.user.isGM || (this.document.isOwner && this.document.getFlag(MODULE_ID, 'wizardCompleted') !== true)) {
      controls.push({ action: 'openChargenWizard', icon: 'fa-solid fa-wand-magic-sparkles', label: 'Criação de Personagem' })
    }
    return controls
  }

  static PARTS = (() => {
    // Settings is dropped entirely per Jake's call - not just hidden from
    // nav, never rendered at all. Blood stays rendered (just unreachable
    // via nav) purely as a safety net - its remaining unique fields
    // (Sire/Generation/Predator Type/detail grid) have now been migrated
    // into Concept & Lore below, so nothing currently depends on it, but
    // there's no reason to force a render error if something still does.
    const { settings, ...parts } = VampireActorSheet.PARTS

    return {
      ...parts,
      header: {
        template: `modules/${MODULE_ID}/charactersheet/templates/vampire-sheet-header.hbs`
      },
      tabs: {
        template: `modules/${MODULE_ID}/charactersheet/templates/tab-navigation.hbs`
      },
      stats: {
        template: `modules/${MODULE_ID}/charactersheet/templates/attributes-skills.hbs`
      },
      disciplines: {
        template: `modules/${MODULE_ID}/charactersheet/templates/disciplines.hbs`
      },
      features: {
        template: `modules/${MODULE_ID}/charactersheet/templates/merits-flaws.hbs`
      },
      biography: {
        template: `modules/${MODULE_ID}/charactersheet/templates/concept-lore.hbs`
      },
      equipment: {
        template: `modules/${MODULE_ID}/charactersheet/templates/equipment.hbs`
      },
      experience: {
        template: `modules/${MODULE_ID}/charactersheet/templates/experience.hbs`
      }
    }
  })()

  tabs = {
    stats: {
      id: 'stats',
      group: 'primary',
      title: 'Atributos e Habilidades',
      icon: '<i class="fa-regular fa-chart-line"></i>'
    },
    disciplines: {
      id: 'disciplines',
      group: 'primary',
      title: 'Disciplinas',
      icon: '<span class="wod5e-symbol">b</span>'
    },
    features: {
      id: 'features',
      group: 'primary',
      title: 'Vantagens e Defeitos',
      icon: '<i class="fas fa-gem"></i>'
    },
    biography: {
      id: 'biography',
      group: 'primary',
      title: 'Conceito e História',
      icon: '<i class="fas fa-id-card"></i>'
    },
    equipment: {
      id: 'equipment',
      group: 'primary',
      title: 'Equipamento',
      icon: '<i class="fa-solid fa-toolbox"></i>'
    },
    experience: {
      id: 'experience',
      group: 'primary',
      title: 'Experiência',
      icon: '<i class="fa-solid fa-file-contract"></i>'
    },
    notepad: {
      id: 'notepad',
      group: 'primary',
      title: 'Notas',
      icon: '<i class="fas fa-sticky-note"></i>'
    },
    blood: {
      id: 'blood',
      group: 'primary',
      title: 'WOD5E.VTM.Blood',
      icon: '<i class="fa-solid fa-droplet"></i>',
      hidden: true
    }
  }

  async _preparePartContext (partId, context, options) {
    context = { ...(await super._preparePartContext(partId, context, options)) }

    switch (partId) {
      case 'header':
        context.canEditHeader = this.isEditable
        return this.prepareHeaderContext(context, this.actor)
      case 'stats':
        return decorateStatsTooltips(context)
      case 'disciplines':
        return prepareDisciplinesFlatContext(context)
      case 'features':
        return prepareMeritsFlawsContext(context)
      case 'biography':
        return this.prepareConceptLoreContext(context, this.actor)
      case 'equipment':
        return prepareCurrencyContext(context, this.actor)
    }

    return context
  }

  async #editHumanity (target) {
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

  async #chooseHeaderItem (type) {
    const choice = HEADER_CHOICES.get(type)
    if (!choice || !this.isEditable || this.#choosingHeaderItem) return

    const actor = this.actor
    const existingItem = actor.items.find(item => item.type === type)
    if (existingItem) return existingItem.sheet.render(true)

    this.#choosingHeaderItem = true
    try {
      const pack = game.packs.get(`${MODULE_ID}.${choice.pack}`)
      const items = (await pack?.getDocuments() ?? []).filter(item => item.type === type)
      if (!items.length) {
        ui.notifications.warn(`${choice.title}: nenhum item disponível no compêndio.`)
        return
      }

      items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      const options = items.map(item => new Option(item.name, item.id).outerHTML).join('')
      const selectedId = await foundry.applications.api.DialogV2.wait({
        window: { title: choice.title },
        content: `<select name="itemId" aria-label="${choice.title}">
          <option value="" selected disabled>Escolha uma opção</option>${options}
        </select><p>Para aplicar os benefícios de criação, use o assistente Criação de Personagem no menu da ficha.</p>`,
        modal: true,
        rejectClose: false,
        buttons: [
          { action: 'select', label: 'Selecionar', default: true, callback: (_event, button) => button.form.elements.itemId.value },
          { action: 'cancel', label: 'Cancelar', callback: () => null }
        ]
      })

      const item = items.find(item => item.id === selectedId)
      if (!item || !this.isEditable || actor.items.some(item => item.type === type)) return

      const failures = checkRestrictions(actor, item.getFlag(MODULE_ID, 'restrictions'))
      if (failures.length) {
        ui.notifications.warn(`Não é possível escolher ${item.name}: ${failures.join(' ')}`)
        return
      }

      if (type === 'clan') {
        const predator = actor.items.find(item => item.type === 'predatorType')
        const conflicts = checkRestrictions(actor, predator?.getFlag(MODULE_ID, 'restrictions'), item)
        if (conflicts.length) {
          ui.notifications.warn(`${item.name} é incompatível com o Tipo de Predador ${predator.name}. ${conflicts.join(' ')} Use Criação de Personagem para alterar a escolha.`)
          return
        }
      }

      const data = item.toObject()
      delete data._id
      delete data.ownership
      await actor.createEmbeddedDocuments('Item', [data])
    } catch (error) {
      console.error(`${MODULE_ID} | ${choice.title}`, error)
      ui.notifications.error(`${choice.title}: não foi possível concluir a seleção.`)
    } finally {
      this.#choosingHeaderItem = false
    }
  }

  async prepareHeaderContext (context, actor) {
    const actorData = actor.system

    const resonanceFilter = actor.items.filter((item) => item.type === 'resonance')
    const predatorFilter = actor.items.filter((item) => item.type === 'predatorType')

    context.blood = actorData.blood
    context.resonance = resonanceFilter[0]
    context.resonanceDescription = context.resonance?.system?.description || ''
    context.predator = predatorFilter[0]
    context.bane = this.getBaneText(context.clan)
    context.baneName = this.getBaneName(context.clan) || (context.bane ? 'Ver descrição' : '')
    context.clanDescription = this.getClanDescription(context.clan)
    context.predatorDescription = context.predator?.system?.description || ''
    const activeCompulsion = actor.getFlag(MODULE_ID, 'compulsion')
    const compulsionNames = getCompulsionsForClan(context.clan).map(compulsion => compulsion.name)
    const compulsion = Object.hasOwn(COMPULSION_BY_NAME, activeCompulsion) ? activeCompulsion : ''
    if (compulsion && !compulsionNames.includes(compulsion)) compulsionNames.push(compulsion)
    // [vtm5e-ptbr] o valor gravado continua em inglês; a tela mostra o nome
    // em português e o texto do livro (COMPULSION_BY_NAME, compulsion.js).
    context.compulsionOptions = compulsionNames.map((value) => ({
      value,
      label: COMPULSION_BY_NAME[value].label,
      selected: value === compulsion
    }))
    context.compulsionText = COMPULSION_BY_NAME[compulsion]?.text ?? ''

    return context
  }

  // Bane has exactly one canonical name per clan (unlike Compulsion, which
  // offers a choice) - looked up rather than stored as a flag, so it can
  // never drift out of sync with the actor's actual clan.
  getBaneName (clan) {
    return getClanEntry(CLAN_BANE_NAMES, clan) ?? ''
  }

  getBaneText (clan) {
    const text = getClanEntry(CLAN_BANE_TEXT, clan) ?? clan?.system?.bane?.trim()
    if (!text) return ''
    // [vtm5e-ptbr] textos do livro já vêm em <p>
    return text.startsWith('<p>') ? text : `<p>${text}</p>`
  }

  getClanDescription (clan) {
    const text = getClanEntry(CLAN_DESCRIPTION_TEXT, clan)
    return text ? `<p>${text}</p>` : ''
  }

  // wod5e's own prepareDisciplinesContext (run by super._preparePartContext
  // above) already builds context.disciplines with each discipline's owned
  // powers grouped/sorted and every item's system.enrichedDescription
  async prepareConceptLoreContext (context, actor) {
    const actorHeaders = actor.system.headers

    context.concept = actorHeaders.concept
    context.chronicle = actorHeaders.chronicle
    context.ambition = actorHeaders.ambition
    context.desire = actorHeaders.desire
    context.tenets = actorHeaders.tenets
    context.enrichedTenets = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      actorHeaders.tenets
    )
    context.touchstones = actorHeaders.touchstones
    context.enrichedTouchstones = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      actorHeaders.touchstones
    )
    context.sire = actorHeaders.sire
    context.generation = actorHeaders.generation

    return context
  }
}

function getClanEntry (entries, clan) {
  const key = getClanKey(clan)
  return Object.hasOwn(entries, key) ? entries[key] : undefined
}
