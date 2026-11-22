import { getClanKey } from '../../clans/scripts/clan-key.js'

/**
 * Compulsions (VtM5e corebook, "Compulsions" p. 208): when a vampire
 * suffers a Bestial Failure, the Storyteller picks or randomly rolls one
 * from a 1d10 table. Text below is transcribed from the corebook.
 */
const GENERIC_COMPULSIONS = {
  hunger: {
    name: 'Hunger',
    label: 'Fome',
    text: 'O vampiro fará qualquer coisa para saciar sua Fome, não importando que isso signifique violência, subterfúgio ou suplicar desavergonhadamente. Qualquer ação dele que não tenha como objetivo imediato a sua alimentação incorrerá em uma penalidade de dois dados à parada de dados usada. Esta Compulsão se encerra quando o vampiro sacia pelo menos 1 nível de Fome.'
  },
  dominance: {
    name: 'Dominance',
    label: 'Dominância',
    text: 'O vampiro transforma sua próxima interação em uma disputa, empregando todos os meios à sua disposição para obter a vitória e esfregá-la na cara do perdedor. O vampiro não pode lançar mão de trabalho em equipe e realiza qualquer ação que evite estabelecer sua dominação ou desafiar a autoridade com uma penalidade de dois dados nas suas paradas. Esta Compulsão se encerra quando o vampiro tiver “vencido” e se regozijado.'
  },
  harm: {
    name: 'Harm',
    label: 'Dano',
    text: 'O vampiro realiza todas as ações que não resultem imediatamente em dano de algo ou alguém com uma penalidade de dois dados à sua parada. Esta Compulsão se encerra quando o vampiro incapacita, destrói ou expulsa seu alvo. Se o vampiro atacar um objeto, este precisa ser muito valioso para alguém que o vampiro valoriza, como, por exemplo, ele próprio.'
  },
  paranoia: {
    name: 'Paranoia',
    label: 'Paranoia',
    text: 'O vampiro tenta escapar de qualquer coisa que ele perceba como ameaça, suspeitando de tudo e de todos. Qualquer ação não tomada com esse fim em vista sofre uma penalidade de dois dados. A Compulsão se encerra quando o vampiro houver passado aproximadamente uma hora em um local seguro: ou seja, um telhado com boa visibilidade, seu próprio refúgio ou enterrado profundamente na terra.'
  }
}

// Clan Compulsions (p. 208-210 of the corebook, plus the 7 clans the
// corebook doesn't cover - see below). Anything still missing (Caitiff,
// thin-blood, any clan not listed here at all) falls back to a generic
// improvise-it prompt.
const CLAN_COMPULSIONS = {
  brujah: {
    name: 'Rebellion',
    label: 'Rebelião',
    text: 'O vampiro se posiciona contra qualquer um ou qualquer coisa que lhe pareça representar o <em>status quo</em> na situação, o que pode ser seu próprio líder, um ponto de vista expresso por uma bolsa em potencial ou somente a tarefa que ele supostamente deveria executar no momento.<br><br>Até que tenha ido contra suas ordens (percebidas ou reais) ou o que se espera dele (ou ele acha que esperam), o vampiro recebe uma penalidade de dois dados em todas as suas rolagens. Esta Compulsão se encerra quando ele tiver feito alguém mudar de ideia (à força, se necessário) ou tiver feito o oposto do que era esperado.'
  },
  gangrel: {
    name: 'Feral Impulses',
    label: 'Impulsos Ferais',
    text: 'Retornando a um estado animal, o vampiro regressa a um ponto onde a fala se torna difícil, as roupas desconfortáveis e os argumentos são mais bem-resolvidos com garras e presas.<br><br>Durante uma cena, o vampiro sofre uma penalidade de três dados em todas as rolagens e envolvam Manipulação e Inteligência. Ele só consegue pronunciar sentenças monossilábicas nesse período.'
  },
  malkavian: {
    name: 'Delusion',
    label: 'Delírio',
    text: 'Com seus dons extrassensoriais enlouquecidos, o vampiro experimenta o que podem ser verdades ou presságios, mas que os outros chamam de delírios trazidos à tona pela Fome.<br><br>Apesar de ainda estarem funcionais, a mente e as percepções do vampiro ficam distorcidas. Durante uma cena, ele sofre uma penalidade de dois dados em rolagens e envolvam Destreza, Manipulação, Autocontrole e Raciocínio, bem como em rolagens para resistir ao frenesi de terror.'
  },
  nosferatu: {
    name: 'Cryptophilia',
    label: 'Criptofilia',
    text: 'A necessidade de saber invade o vampiro. Ele é consumido por uma fome de segredos – de saber o que poucos ou ninguém mais sabe – quase tão forte quanto sua sede de sangue. Ele também se recusa a dividir segredos, exceto em estrita troca por segredos ainda maiores.<br><br>Independentemente do tamanho do segredo, todas as ações que não forem usadas para aprendê-lo sofrem uma penalidade de dois dados. A Compulsão se encerra quando o vampiro aprende um segredo suficientemente grande para ser considerado útil. Compartilhá-lo é opcional.'
  },
  toreador: {
    name: 'Obsession',
    label: 'Obsessão',
    text: 'Extasiado pela beleza, o vampiro torna-se temporariamente obcecado com algo singularmente belo, ficando incapaz de pensar em qualquer outra coisa.<br><br>Escolha um alvo, como uma pessoa, canção, obra de arte, mancha de sangue ou até a própria aurora. Extasiado, o vampiro dificilmente consegue desviar sua atenção desse objeto, e, se falarem com ele, só conseguirá falar sobre o objeto. Quaisquer outras ações sofrem uma penalidade de dois dados. Esta Compulsão dura até o vampiro não puder mais perceber o objeto adorado, ou término da cena.'
  },
  tremere: {
    name: 'Perfectionism',
    label: 'Perfeccionismo',
    text: 'Nada a não ser o melhor satisfaz o vampiro. Qualquer outra coisa, exceto uma performance excepcional, provoca uma profunda sensação de falha no vampiro, por isso ele repete tarefas obsessivamente até que estejam “na medida”.<br><br>Até que o vampiro obtenha uma vitória crítica em uma rolagem de Habilidade ou a cena termine, ele agirá sob uma penalidade de dois dados em todas as suas paradas de dados. Reduza a penalidade para um dado no caso de uma ação repetida, e remova-a por completo em uma segunda repetição.'
  },
  ventrue: {
    name: 'Arrogance',
    label: 'Arrogância',
    text: 'A necessidade que o vampiro tem de governar aflora. Nada pode impedi-lo de assumir o controle de uma situação.<br><br>Alguém deve obedecer a uma ordem do vampiro. Qualquer ação que não esteja diretamente associada com liderança sofre uma penalidade de dois dados. Esta Compulsão dura até a ordem ser obedecida, embora isso não deva ocorrer por vias sobrenaturais, como por meio de Dominação.'
  },

  // Added 2026-07-22 from the Player's Guide (p.12-60) - the 7 clans the
  // corebook's own Clan Compulsions section skips entirely. Keyed by
  // clanName.toLowerCase() exactly as looked up below, so "Banu Haqim"
  // (the only multi-word one) needs its literal space here too - every
  // other key above is safe as a single word purely by coincidence.
  'banu haqim': {
    name: 'Judgment',
    label: 'Julgamento (tradução não oficial)',
    text: 'Durante uma cena, o vampiro é compelido a punir quem agir contra uma de suas Convicções, seja amigo ou inimigo, saciando pelo menos um ponto de Fome com o sangue do transgressor. Enquanto não o fizer, sofre uma penalidade de três dados em todos os testes. A Compulsão termina quando for satisfeita ou quando a cena acabar. Se a vítima for vampiro, aplique também o teste de Frenesi de Fome da Perdição. <em>(tradução não oficial)</em>'
  },
  hecata: {
    name: 'Morbidity',
    label: 'Morbidez (tradução não oficial)',
    text: 'O vampiro sente uma necessidade imediata de levar algo da vida à morte ou da morte à vida. Ele sofre uma penalidade de dois dados em ações que não busquem terminar ou ressuscitar algo. O alvo não precisa ser uma pessoa ou criatura viva: pode ser um objeto ou algo abstrato, como uma ideia ou conversa. A Compulsão dura até que o vampiro mate ou devolva algo à vida, literal ou figurativamente. <em>(tradução não oficial)</em>'
  },
  lasombra: {
    name: 'Ruthlessness',
    label: 'Implacabilidade (tradução não oficial)',
    text: 'O vampiro despreza o fracasso e recorre a qualquer meio para alcançar seu objetivo. Na próxima vez que falhar em uma ação, sofre uma penalidade de dois dados em todos os testes, inclusive em novas tentativas da ação que desencadeou a penalidade. A Compulsão termina quando uma nova tentativa daquela ação é bem-sucedida ou quando a cena acaba. <em>(tradução não oficial)</em>'
  },
  ministry: {
    name: 'Transgression',
    label: 'Transgressão (tradução não oficial)',
    text: 'O vampiro sente necessidade de romper as amarras das crenças. Ele sofre uma penalidade de dois dados em todas as paradas que não estejam relacionadas a levar alguém, inclusive a si mesmo, a violar um Princípio da Crônica ou uma Convicção pessoal. A Compulsão termina quando isso causar pelo menos uma Mácula. <em>(tradução não oficial)</em>'
  },
  ravnos: {
    name: 'Tempting Fate',
    label: 'Destino Tentador',
    text: 'O vampiro é levado por seu Sangue a cortejar o perigo. Afinal, assombrados como são pelo fogo justo que percorre sua linhagem, por que não? Na próxima vez que o vampiro precisar resolver um problema, qualquer solução que não seja a mais audaciosa ou perigosa sofrerá uma penalidade de dois dados. (Soluções particularmente vistosas e arriscadas podem até merecer dados bônus, neste caso.) O Audaz é livre para convencer seus companheiros a agirem ao modo dele, mas agirá sozinho se for preciso. A Compulsão persiste até o problema ser resolvido ou tentativas futuras tornarem-se impraticáveis. <em>(Guia Suplementar de Vampiro: A Máscara, p. 9)</em>'
  },
  salubri: {
    name: 'Affective Empathy',
    label: 'Empatia Afetiva',
    text: 'Quando um Salubri sofre uma Compulsão, ele é tomado de empatia por um problema pessoal que aflige alguém na cena e procura ajudar na sua resolução. A escala do problema não é importante; o Salubri compreende que sofrer às vezes é parte de uma situação em progresso e não um evento isolado. Qualquer ação que não seja realizada em função de mitigar aquela tragédia pessoal incorre em uma penalidade de dois dados. A compulsão persiste até que o fardo do sofredor seja aliviado, uma crise mais imediata o suplante ou a cena chegue ao final. <em>(Guia Suplementar de Vampiro: A Máscara, p. 15)</em>'
  },
  tzimisce: {
    name: 'Covetousness',
    label: 'Cobiça',
    text: 'Quando um Tzimisce sofre uma Compulsão, ele fica obcecado em possuir algo da cena, passando a desejar adicioná-lo à sua proverbial pilha de tesouro. O alvo do desejo pode ser qualquer coisa, de um objeto a uma pessoa. Toda ação cujo propósito não seja tomar posse do alvo sofrerá uma penalidade de dois dados. A Compulsão persiste até a posse ser obtida (o Narrador decide o que constitui a posse, no caso de um alvo que não seja um objeto) ou se tornar inalcançável. <em>(Guia Suplementar de Vampiro: A Máscara, p. 19)</em>'
  }
}

export function getCompulsionsForClan (clan) {
  const options = Object.values(GENERIC_COMPULSIONS)
  const clanCompulsion = CLAN_COMPULSIONS[getClanKey(clan)]
  if (clanCompulsion?.name) options.push(clanCompulsion)
  return options
}

/**
 * Roll on the Compulsion table for an actor suffering a Bestial Failure.
 * Reroll 10 for Caitiff, thin-bloods and actors without a clan.
 */
export async function rollCompulsion(actor) {
  const clan = actor?.items?.find(item => item.type === 'clan')
  const clanKey = getClanKey(clan)

  let result
  do {
    const roll = await new Roll('1d10').evaluate()
    result = roll.total === 10 ? 0 : roll.total
  } while (result === 0 && (!clanKey || clanKey === 'caitiff' || clanKey === 'thin-blooded'))

  let generic = null
  if (result >= 1 && result <= 3) generic = GENERIC_COMPULSIONS.hunger
  else if (result >= 4 && result <= 5) generic = GENERIC_COMPULSIONS.dominance
  else if (result >= 6 && result <= 7) generic = GENERIC_COMPULSIONS.harm
  else if (result >= 8 && result <= 9) generic = GENERIC_COMPULSIONS.paranoia

  if (generic) {
    await setSheetCompulsion(actor, generic.name)
    return { name: generic.label ?? generic.name, text: generic.text }
  }

  // result === 0: Clan Compulsion
  const clanCompulsion = CLAN_COMPULSIONS[clanKey]
  if (clanCompulsion?.name) {
    await setSheetCompulsion(actor, clanCompulsion.name)
    return { name: `Compulsão de Clã (${clan.name}): ${clanCompulsion.label ?? clanCompulsion.name}`, text: clanCompulsion.text }
  }

  // No write-up for this clan - nothing matches a
  // sheet picker option, so leave the sheet's Compulsion field alone and
  // let the chat message's improvise prompt stand on its own.
  return {
    name: `Compulsão de Clã (${clan.name})`,
    text: 'Este clã não tem uma descrição de Compulsão no livro básico. Consulte um suplemento que o apresente ou peça ao Narrador que improvise uma Compulsão que combine com o clã.'
  }
}

// Writes to vtm5e-charactersheet's own flag namespace (the sheet's
// Compulsion picker reads flags.vampiro-a-mascara-v5-ptbr.compulsion) - a plain
// cross-module setFlag call needs no import/coupling. Uses just the short
// display name (e.g. "Hunger", "Rebellion"), matching the picker's option
// values exactly (see GENERIC_COMPULSION_NAMES/CLAN_COMPULSION_NAMES in
// vtm5e-charactersheet/scripts/vampire-actor-sheet.js).
async function setSheetCompulsion(actor, name) {
  await actor.setFlag('vampiro-a-mascara-v5-ptbr', 'compulsion', name)
}

export function buildCompulsionHTML(compulsion) {
  return `
    <div class="vtm5e-automation-compulsion">
      <p class="vtm5e-automation-compulsion-title">${compulsion.name.startsWith('Compulsão') ? compulsion.name : `Compulsão: ${compulsion.name}`}</p>
      <p class="vtm5e-automation-compulsion-text">${compulsion.text}</p>
    </div>
  `
}

// [vtm5e-ptbr] Fonte única para a ficha de personagem (charactersheet):
// nome interno (valor gravado no flag 'compulsion', em inglês) -> { label, text }.
export const COMPULSION_BY_NAME = Object.fromEntries(
  [...Object.values(GENERIC_COMPULSIONS), ...Object.values(CLAN_COMPULSIONS)].map((c) => [c.name, c])
)
