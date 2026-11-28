// [vtm5e-ptbr] Arquétipos da criação automática de Vampiros.
//
// Cada arquétipo descreve um conceito de personagem e orienta TODAS as escolhas do gerador, para que
// Atributos, Habilidades, Disciplinas, Tipo de Predador, Vantagens, Defeitos, equipamento e textos
// combinem entre si. Os nomes de Vantagens, Defeitos, Tipos de Predador e equipamento são os nomes
// em português dos compêndios do módulo. Tudo o que não existir ou não for permitido é ignorado e o
// gerador recorre ao sorteio, sempre respeitando as regras (o gerador nunca confia cegamente nesta lista).
//
// Campos:
//   attrs        os 9 Atributos, do mais ao menos importante (o 1º recebe 4, os três seguintes 3...)
//   skills       Habilidades por prioridade (até 19, o máximo usado por "Pau pra Toda Obra")
//   dists        distribuições de Habilidades preferidas
//   disciplines  Disciplinas preferidas (ids do wod5e; "bloodsorcery" = Feitiçaria de Sangue)
//   predators    Tipos de Predador preferidos
//   backgrounds  chaves de Antecedente preferidas para escolhas de Tipo de Predador
//   packages     pacotes de Vantagens [[nome, pontos], ...]; o gerador compra pacotes inteiros
//   flaws        Defeitos candidatos [nome, pontos]
//   specialties  rótulos preferidos de Especialização por Habilidade
//   gear         equipamento: { from } copia do compêndio; { name, note } cria um item próprio
//   textos       concepts, ambitions, desires, convictions [Convicção, descrição do Pilar], life,
//                embrace, appearance, hooks
//
// Marcadores nos textos: {cidade}, {nome}, {pilar} (nome do Pilar), {idade} (idade do Pilar).

export const ARCHETYPES = [
  {
    id: 'brawler', label: 'Briguento de rua',
    attrs: ['strength', 'stamina', 'dexterity', 'composure', 'wits', 'resolve', 'charisma', 'manipulation', 'intelligence'],
    skills: ['brawl', 'athletics', 'intimidation', 'streetwise', 'melee', 'awareness', 'stealth', 'drive', 'insight', 'firearms', 'survival', 'larceny', 'subterfuge', 'leadership', 'persuasion', 'medicine', 'etiquette', 'craft', 'politics'],
    dists: ['balanced', 'specialist'],
    disciplines: ['potence', 'celerity', 'fortitude', 'protean', 'presence', 'animalism', 'obfuscate', 'dominate', 'auspex', 'oblivion', 'bloodsorcery'],
    predators: ['Vira-lata', 'Extorsionista', 'Sanguessuga'],
    backgrounds: ['contact', 'allies', 'haven', 'resources', 'retainer', 'herd', 'influence', 'fame', 'status', 'mask', 'enemy'],
    packages: [[['Contatos', 2], ['Refúgio Base', 1]], [['Aliados (Efetividade)', 2], ['Aliados (Confiabilidade)', 1]], [['Recursos', 1], ['Refúgio Base', 1]], [['Influência', 1]], [['Arsenal Oculto', 1]], [['Lacaios', 1]]],
    flaws: [['Inimigo', 1], ['Inimigo', 2], ['Vivendo no Limite', 1], ['Dívida Menor', 1], ['Suspeito', 1]],
    specialties: { brawl: ['Boxe', 'Agarrões', 'Briga de bar'], athletics: ['Corrida', 'Escalada'], intimidation: ['Ameaças', 'Olhar fixo'], streetwise: ['Bairros', 'Gangues'], melee: ['Facas', 'Porretes'] },
    gear: [{ from: 'Soco inglês' }, { from: 'Roupa reforçada / couro pesado', name: 'Jaqueta de couro' }, { name: 'Celular pré-pago', note: 'Chip descartável, trocado todo mês.' }, { name: 'Moto usada', note: 'Moto de baixa cilindrada, boa para fugir pelas vielas.' }],
    concepts: ['[Ex-lutador|Ex-lutadora] de rua que virou o punho da vizinhança', 'Segurança de boate que resolve problemas com as mãos', '[Ex-boxeador|Ex-boxeadora] que defende o bairro onde cresceu'],
    ambitions: ['Tirar o bairro das mãos de quem explora seus moradores', 'Tornar-se a força que ninguém em {cidade} ousa desafiar', 'Encontrar quem traiu seu senhor e cobrar a dívida'],
    desires: ['Dar uma lição no agiota que ameaçou um vizinho', 'Ganhar a próxima briga sem perder o controle', 'Recuperar a moto que roubaram na semana passada'],
    convictions: [['Nunca abandone quem luta ao seu lado', 'irmão mais velho de {nome}, dono de uma academia de boxe de bairro', { rel: [2, 12] }], ['Quem tem força deve proteger quem não tem', 'dona de uma quitanda que vende fiado para metade da rua'], ['Não bata em quem não pode revidar', 'treinador de futebol de várzea que tira crianças da rua']],
    life: 'Cresceu nos bairros operários de {cidade}, aprendeu a lutar cedo e passou a juventude entre ringues improvisados, empregos de segurança e brigas que não eram suas.',
    embrace: ['viu [nele|nela] uma fúria que valia a pena preservar', 'precisava de alguém que não fugisse de uma briga', '[o|a] encontrou [ferido|ferida] depois de enfrentar [sozinho|sozinha] um grupo de capangas'],
    appearance: ['Corpo largo de quem treinou a vida inteira, nariz quebrado e nós dos dedos marcados. Veste jaqueta, moletom e tênis gastos.', 'Cabelo raspado, cicatriz na sobrancelha e um jeito de andar que faz as pessoas abrirem caminho.'],
    hooks: ['Alguém do passado mortal reconheceu {nome} numa briga e começou a fazer perguntas.', 'O Inimigo de {nome} está recrutando gente nas mesmas ruas onde {nome} caça.']
  },
  {
    id: 'investigator', label: 'Investigador',
    attrs: ['wits', 'resolve', 'dexterity', 'intelligence', 'composure', 'stamina', 'strength', 'manipulation', 'charisma'],
    skills: ['investigation', 'firearms', 'insight', 'awareness', 'intimidation', 'streetwise', 'stealth', 'athletics', 'drive', 'brawl', 'politics', 'subterfuge', 'larceny', 'medicine', 'melee', 'technology', 'persuasion', 'occult', 'academics'],
    dists: ['balanced', 'specialist'],
    disciplines: ['auspex', 'celerity', 'dominate', 'obfuscate', 'fortitude', 'potence', 'presence', 'animalism', 'oblivion', 'protean', 'bloodsorcery'],
    predators: ['Perseguidor', 'Extorsionista', 'Sandman', 'Vira-lata'],
    backgrounds: ['contact', 'resources', 'mask', 'allies', 'haven', 'influence', 'retainer', 'herd', 'status', 'fame', 'enemy'],
    packages: [[['Contatos', 2], ['Máscara', 1]], [['Refúgio Base', 1], ['Arsenal Oculto', 1]], [['Recursos', 1], ['Mawla', 1]], [['Influência', 1], ['Contatos', 1]], [['Máscara', 2]], [['Aliados (Efetividade)', 1], ['Aliados (Confiabilidade)', 1]]],
    flaws: [['Vivendo no Limite', 1], ['Dívida Menor', 1], ['Inimigo', 1], ['Perseguidores', 1], ['Adversário', 1]],
    specialties: { investigation: ['Cenas de crime', 'Interrogatório', 'Pistas'], firearms: ['Pistolas', 'Revólveres'], insight: ['Mentiras', 'Motivações'], awareness: ['Emboscadas', 'Detalhes'], intimidation: ['Interrogatório', 'Coerção'] },
    gear: [{ from: 'Pistola 9 mm' }, { from: 'Carregador 9 mm (15)', qty: 2 }, { from: 'Colete balístico / jaqueta flak' }, { name: 'Caderno de capa preta', note: 'Nomes, endereços e dívidas de quem já cruzou seu caminho.' }, { name: 'Distintivo antigo', note: 'De quando ainda respirava; ainda abre algumas portas.' }],
    concepts: ['[Ex-investigador|Ex-investigadora] de homicídios que agora caça os crimes dos Membros', 'Detetive particular que aceita os casos que a polícia não aceita', 'Ex-policial que não conseguiu largar o último caso'],
    ambitions: ['Levar à justiça o vampiro que destruiu sua vida mortal', 'Tornar-se a pessoa a quem a corte recorre quando um crime precisa ser resolvido', 'Descobrir o que realmente aconteceu na noite do próprio Abraço'],
    desires: ['Arrancar de um informante o nome de quem encomendou o último assassinato', 'Recuperar um arquivo que sumiu da delegacia', 'Seguir um suspeito até o refúgio dele'],
    convictions: [['Os culpados devem ser punidos', 'antiga parceira de {nome} na polícia, que ainda investiga a "morte" [dele|dela]', { rel: [-8, 10] }], ['Nunca puna um inocente', 'filho de {nome}, estudante de Direito que visita o túmulo vazio de {nome}', { abs: [18, 26] }], ['A verdade sempre vem à tona', 'repórter policial veterano que nunca aceitou suborno']],
    life: 'Foi [investigador|investigadora] da Polícia Civil em {cidade} por mais de uma década, [acostumado|acostumada] a madrugadas em cenas de crime e a casos que ninguém queria.',
    embrace: ['caçava o mesmo assassino e viu [nele|nela] o instinto de [um juiz|uma juíza]', 'precisava de alguém que soubesse fazer perguntas', '[o|a] encontrou à beira da morte numa cena de crime e decidiu não [desperdiçá-lo|desperdiçá-la]'],
    appearance: ['Sobretudo gasto, [barba por fazer|cabelo preso às pressas] e olhos fundos que avaliam todo mundo. Quase nunca pisca.', 'Camisa social sem gravata, sapatos gastos de tanto andar e uma postura de quem espera uma emboscada.'],
    hooks: ['Uma antiga colega de {nome} está perto de descobrir que [ele|ela] continua andando por aí.', 'O caso que {nome} persegue pode envolver alguém poderoso demais para ser acusado.']
  },
  {
    id: 'scholar', label: 'Acadêmico do oculto',
    attrs: ['intelligence', 'resolve', 'wits', 'composure', 'manipulation', 'charisma', 'dexterity', 'stamina', 'strength'],
    skills: ['occult', 'academics', 'investigation', 'awareness', 'insight', 'etiquette', 'science', 'medicine', 'persuasion', 'politics', 'stealth', 'technology', 'subterfuge', 'finance', 'craft', 'drive', 'leadership', 'athletics', 'performance'],
    dists: ['specialist', 'balanced'],
    disciplines: ['bloodsorcery', 'auspex', 'dominate', 'obfuscate', 'oblivion', 'presence', 'fortitude', 'animalism', 'celerity', 'protean', 'potence'],
    predators: ['Sandman', 'Consensualista', 'Osíris', 'Ladrão de Túmulos'],
    backgrounds: ['resources', 'haven', 'contact', 'herd', 'retainer', 'mask', 'influence', 'allies', 'fame', 'status', 'enemy'],
    packages: [[['Refúgio Base', 2], ['Biblioteca', 1]], [['Linguística', 2]], [['Recursos', 2]], [['Mawla', 1], ['Contatos', 1]], [['Linguística', 1], ['Contatos', 1]], [['Rebanho', 1]]],
    flaws: [['Fome de Conhecimento', 1], ['Dívida Menor', 1], ['Arcaico', 2], ['Vivendo no Passado', 1], ['Laço Longo', 1]],
    specialties: { occult: ['Hermetismo', 'Folclore', 'Rituais'], academics: ['História', 'Teologia', 'Filologia'], investigation: ['Arquivos', 'Manuscritos'], science: ['Química', 'Física'], medicine: ['Anatomia', 'Diagnóstico'], craft: ['Encadernação', 'Caligrafia'], performance: ['Oratória', 'Música'] },
    gear: [{ name: 'Grimório pessoal', note: 'Caderno de couro com anotações cifradas sobre o oculto.' }, { name: 'Estojo de pesquisa', note: 'Lupa, luvas de algodão, lápis e fichas de catalogação.' }, { from: 'Bengala-espada' }, { name: 'Credencial de pesquisador', note: 'Dá acesso noturno a arquivos e bibliotecas da cidade.' }],
    concepts: ['[Historiador|Historiadora] e arquivista do oculto', '[Professor universitário obcecado|Professora universitária obcecada] por manuscritos proibidos', '[Bibliotecário|Bibliotecária] que guarda segredos do Sangue'],
    ambitions: ['Recuperar um acervo perdido de sua linhagem', 'Compreender a origem do próprio Sangue', 'Escrever a verdadeira história noturna de {cidade}'],
    desires: ['Consultar o manuscrito que apareceu num sebo do centro', 'Traduzir uma página em latim antes do amanhecer', 'Entrar no arquivo de uma paróquia sem ser notado'],
    convictions: [['O conhecimento deve ser preservado, nunca queimado', 'bibliotecária que cuida de um acervo histórico e o deixa ler à noite'], ['Não faça mal a quem dorme', 'sobrinho de {nome}, professor aposentado que acredita que {nome} morreu há muito tempo', { abs: [62, 80] }], ['Toda pergunta merece resposta honesta', 'estudante de mestrado que {nome} orienta em segredo']],
    life: 'Passou a vida entre bibliotecas, arquivos paroquiais e salas de aula de {cidade}, mais à vontade com livros antigos do que com pessoas.',
    embrace: ['precisava de um tradutor para um códice que ninguém mais conseguia ler', 'admirava sua erudição e temia que ela se perdesse com a morte', 'descobriu que [ele|ela] sabia demais sobre os Membros'],
    appearance: ['Terno de tweed, óculos de aro fino e mãos manchadas de tinta. Fala com vocabulário rebuscado.', '[Magro, pálido|Magra, pálida] mesmo para um vampiro, com cardigã e uma pilha de livros sempre debaixo do braço.'],
    hooks: ['O manuscrito que {nome} procura pertenceu a alguém que não quer ser encontrado.', 'Alguém está pagando caro por informações sobre os rituais que {nome} pesquisa.']
  },
  {
    id: 'artist', label: 'Artista boêmio',
    attrs: ['charisma', 'dexterity', 'manipulation', 'composure', 'wits', 'intelligence', 'stamina', 'resolve', 'strength'],
    skills: ['performance', 'persuasion', 'craft', 'etiquette', 'insight', 'subterfuge', 'awareness', 'streetwise', 'academics', 'athletics', 'drive', 'technology', 'finance', 'intimidation', 'investigation', 'leadership', 'politics', 'stealth', 'occult'],
    dists: ['balanced', 'jackOfAllTrades'],
    disciplines: ['presence', 'auspex', 'celerity', 'dominate', 'obfuscate', 'fortitude', 'animalism', 'protean', 'potence', 'oblivion', 'bloodsorcery'],
    predators: ['Sereia', 'Scene Queen', 'Osíris', 'Consensualista'],
    backgrounds: ['fame', 'herd', 'contact', 'resources', 'haven', 'allies', 'influence', 'retainer', 'mask', 'status', 'enemy'],
    packages: [[['Fama', 2]], [['Contatos', 2]], [['Recursos', 2], ['Refúgio Base', 1]], [['Rebanho', 2]], [['Fama', 1], ['Contatos', 1]], [['Belo', 2]]],
    flaws: [['Dependência', 1], ['Viciado em Laço', 1], ['Inimigo', 1], ['Dívida Menor', 1], ['Vivendo no Limite', 1]],
    specialties: { performance: ['Música', 'Teatro', 'Dança', 'Canto'], craft: ['Fotografia', 'Pintura', 'Escultura'], persuasion: ['Charme', 'Sedução'], etiquette: ['Cena artística', 'Alta sociedade'], academics: ['História da Arte', 'Literatura'] },
    gear: [{ name: 'Instrumento ou câmera de trabalho', note: 'A ferramenta da sua arte, sempre por perto.' }, { name: 'Portfólio e convites', note: 'Convites para vernissages, shows e festas da cena cultural.' }, { name: 'Kit de maquiagem', note: 'Para parecer viva diante das luzes.' }, { from: 'Canivete' }],
    concepts: ['[Fotógrafo e curador|Fotógrafa e curadora] que transforma a noite em arte', '[Músico|Musicista] de bar que hipnotiza a plateia', '[Pintor boêmio|Pintora boêmia] que retrata o que ninguém mais vê'],
    ambitions: ['Criar a obra definitiva sobre a beleza de {cidade} à noite', 'Ser [lembrado|lembrada] pela arte, não pelo que se tornou', 'Reunir em torno de si a cena artística mais brilhante da cidade'],
    desires: ['Conhecer o artista revelação do festival de música antes da concorrência', 'Terminar uma obra antes da próxima exposição', 'Reconquistar um admirador que se afastou'],
    convictions: [['A beleza verdadeira nunca deve ser destruída', 'sobrinha-neta de {nome}, estudante de artes que vê em {nome} uma inspiração', { abs: [18, 26] }], ['Nunca traia quem confiou em você', 'dono de um pequeno estúdio onde {nome} trabalha há décadas'], ['Toda arte merece uma plateia', 'garçom de um bar de música ao vivo que nunca falta a uma apresentação']],
    life: 'Viveu da própria arte em {cidade}, entre ateliês, bares de música ao vivo e a coluna social dos jornais locais.',
    embrace: ['ficou obcecado pela obra [dele|dela] e quis [preservá-lo|preservá-la] para sempre', 'queria [um muso|uma musa] que não envelhecesse', 'viu [nele|nela] um talento que a morte desperdiçaria'],
    appearance: ['Roupas escolhidas a dedo, joias marcantes e batom escuro. Move-se como se estivesse sempre sendo [observado|observada].', 'Cabelo comprido, dedos cheios de anéis e um sorriso que as pessoas não esquecem.'],
    hooks: ['Um ex-amante de {nome} percebeu que [ele|ela] não aparece direito nas fotos.', 'Alguém comprou uma obra antiga de {nome} e quer conhecer "o artista original".']
  },
  {
    id: 'socialite', label: 'Herdeiro da elite',
    attrs: ['manipulation', 'charisma', 'composure', 'intelligence', 'wits', 'resolve', 'strength', 'stamina', 'dexterity'],
    skills: ['persuasion', 'etiquette', 'finance', 'politics', 'insight', 'leadership', 'academics', 'subterfuge', 'intimidation', 'drive', 'awareness', 'investigation', 'performance', 'technology', 'firearms', 'athletics', 'streetwise', 'melee', 'medicine'],
    dists: ['specialist', 'balanced'],
    disciplines: ['dominate', 'presence', 'fortitude', 'auspex', 'obfuscate', 'celerity', 'potence', 'animalism', 'oblivion', 'protean', 'bloodsorcery'],
    predators: ['Scene Queen', 'Sereia', 'Consensualista', 'Montero'],
    backgrounds: ['resources', 'influence', 'retainer', 'status', 'contact', 'fame', 'haven', 'allies', 'herd', 'mask', 'enemy'],
    packages: [[['Recursos', 3]], [['Influência', 2]], [['Lacaios', 2]], [['Status', 1]], [['Recursos', 2], ['Contatos', 1]], [['Refúgio Base', 2], ['Luxo', 1]]],
    flaws: [['Adversário', 2], ['Adversário', 1], ['Dívida Menor', 1], ['Dívidas de Prestação', 1], ['Arcaico', 2]],
    specialties: { persuasion: ['Negociação', 'Charme'], etiquette: ['Alta sociedade', 'Negócios'], finance: ['Fusões e Aquisições', 'Investimentos'], politics: ['Câmara Municipal', 'Facções'], academics: ['Direito Empresarial', 'Economia'] },
    gear: [{ name: 'Smartphone e tablet criptografados', note: 'Agenda de clientes e contatos da alta sociedade.' }, { name: 'Pasta executiva de couro', note: 'Contratos, procurações e o selo da família.' }, { from: 'Tecido balístico', name: 'Blazer de tecido balístico' }, { name: 'Carro de luxo', note: 'Sedã importado, sempre estacionado com manobrista.' }],
    concepts: ['[Herdeiro|Herdeira] de família tradicional e [advogado|advogada] que comanda pela caneta', '[Empresário|Empresária] que trata a noite como um mercado', 'Socialite que conhece os segredos de todas as famílias ricas'],
    ambitions: ['Conquistar um lugar de confiança junto ao Príncipe', 'Garantir que a família continue sob controle de seu clã', 'Dominar as finanças da noite de {cidade}'],
    desires: ['Fechar a compra de um casarão histórico antes do rival', 'Humilhar um novo-rico num jantar beneficente', 'Conseguir uma audiência com um ancião da corte'],
    convictions: [['A família vem antes de tudo', 'sobrinha de {nome}, herdeira do negócio da família, que confia cegamente em {nome}', { abs: [24, 40] }], ['Sua palavra é um contrato', 'juiz aposentado e antigo mentor, o homem mais honesto que {nome} conheceu'], ['Quem serve bem merece respeito', 'governanta que trabalha para a família há trinta anos']],
    life: 'Nasceu numa das famílias mais tradicionais de {cidade}, estudou nas melhores escolas e assumiu cedo os negócios e os escritórios da família.',
    embrace: ['queria garantir que a fortuna da família continuasse sob seu controle', 'viu [nele o herdeiro|nela a herdeira] ideal para seus negócios noturnos', 'precisava de alguém com acesso às famílias ricas da cidade'],
    appearance: ['Postura impecável, roupas de grife em tons neutros e um anel de sinete. Nunca levanta a voz; não precisa.', 'Terno sob medida, relógio caro e um sorriso educado que nunca chega aos olhos.'],
    hooks: ['Um rival de {nome} descobriu um segredo da família e está pronto para usá-lo.', 'O imóvel que {nome} quer comprar esconde passagens usadas por outros Membros.']
  },
  {
    id: 'hacker', label: 'Hacker e explorador urbano',
    attrs: ['intelligence', 'wits', 'dexterity', 'resolve', 'composure', 'stamina', 'strength', 'manipulation', 'charisma'],
    skills: ['technology', 'stealth', 'larceny', 'investigation', 'streetwise', 'awareness', 'science', 'athletics', 'subterfuge', 'drive', 'animalken', 'brawl', 'craft', 'insight', 'academics', 'finance', 'firearms', 'persuasion', 'survival'],
    dists: ['specialist', 'balanced'],
    disciplines: ['obfuscate', 'auspex', 'animalism', 'celerity', 'dominate', 'potence', 'fortitude', 'presence', 'protean', 'oblivion', 'bloodsorcery'],
    predators: ['Sacoleiro', 'Sandman', 'Alçapão', 'Perseguidor'],
    backgrounds: ['contact', 'haven', 'resources', 'mask', 'retainer', 'allies', 'herd', 'influence', 'fame', 'status', 'enemy'],
    packages: [[['Contatos', 2]], [['Refúgio Base', 2], ['Sistema de Segurança', 1]], [['Poterna', 1]], [['Máscara', 2]], [['Recursos', 1]], [['Segredos da Cidade', 1]]],
    flaws: [['Dívidas de Prestação', 1], ['Perseguidores', 1], ['Inimigo', 1], ['Fome de Conhecimento', 1], ['Dívida Menor', 1]],
    specialties: { technology: ['Invasão de Sistemas', 'Redes', 'Eletrônica'], stealth: ['Túneis', 'Silêncio'], larceny: ['Fechaduras', 'Alarmes'], investigation: ['Dados', 'Arquivos'], science: ['Engenharia', 'Física'], craft: ['Eletrônica', 'Mecânica'] },
    gear: [{ from: 'Ferramenta de arrombamento de fechaduras' }, { from: 'Visão noturna (amplificação / IR)' }, { name: 'Notebook reforçado', note: 'Com adaptadores de rede e um rádio para escutar frequências da polícia.' }, { name: 'Mapas dos túneis', note: 'Plantas antigas de galerias, porões e ferrovias desativadas, anotadas à mão.' }],
    concepts: ['Hacker e [explorador urbano|exploradora urbana] que mapeia os subterrâneos da cidade', '[Técnico|Técnica] de redes que invade câmeras para vigiar a noite', 'Informante digital que troca segredos por favores'],
    ambitions: ['Saber tudo o que acontece debaixo e por cima de {cidade}', 'Montar a maior rede de informações da noite', 'Expor o segredo de alguém poderoso no momento certo'],
    desires: ['Decifrar um arquivo criptografado roubado de um servidor da prefeitura', 'Explorar um túnel que ninguém visita há décadas', 'Apagar um vídeo que mostra o que não devia'],
    convictions: [['Informação deve ser livre', 'repórter freelance que publica vazamentos sobre a política local'], ['Não deixe ninguém para trás no escuro', 'colega de exploração urbana que ainda acha que {nome} só "sumiu da internet"', { abs: [20, 35] }], ['Proteja quem não sabe se proteger online', 'irmã mais nova de {nome}, que pede ajuda com o computador', { rel: [-12, -2] }]],
    life: 'Era [técnico|técnica] de informática de dia e explorador urbano à noite, [conhecido|conhecida] nos fóruns por fotografar túneis, porões e galerias esquecidas de {cidade}.',
    embrace: ['achou seus esconderijos com facilidade demais para ser [deixado vivo|deixada viva]', 'precisava de alguém que entendesse as redes modernas', '[o|a] encontrou [perdido|perdida] nos túneis e viu utilidade em sua curiosidade'],
    appearance: ['Moletom com capuz, mochila impermeável e luvas sem dedos. Fala rápido, com gírias de fórum.', '[Magro|Magra], olheiras permanentes e um fone de ouvido sempre pendurado no pescoço.'],
    hooks: ['Um blogueiro de exploração urbana está perto demais do refúgio de {nome}.', 'O arquivo que {nome} roubou contém nomes de empresas de fachada de alguém da corte.']
  },
  {
    id: 'healer', label: 'Profissional de saúde',
    attrs: ['composure', 'intelligence', 'wits', 'charisma', 'resolve', 'dexterity', 'manipulation', 'stamina', 'strength'],
    skills: ['medicine', 'insight', 'persuasion', 'science', 'academics', 'awareness', 'investigation', 'etiquette', 'subterfuge', 'occult', 'drive', 'technology', 'stealth', 'streetwise', 'politics', 'leadership', 'finance', 'athletics', 'craft'],
    dists: ['balanced', 'specialist'],
    disciplines: ['auspex', 'fortitude', 'dominate', 'presence', 'obfuscate', 'oblivion', 'celerity', 'animalism', 'protean', 'potence', 'bloodsorcery'],
    predators: ['Consensualista', 'Ceifador', 'Sandman', 'Sacoleiro'],
    backgrounds: ['herd', 'contact', 'allies', 'influence', 'resources', 'haven', 'retainer', 'mask', 'fame', 'status', 'enemy'],
    packages: [[['Rebanho', 2]], [['Contatos', 2]], [['Recursos', 2], ['Refúgio Base', 1]], [['Aliados (Efetividade)', 1], ['Aliados (Confiabilidade)', 1]], [['Influência', 1]], [['Reconhecimento de Bolsas', 1]]],
    flaws: [['Transparente', 1], ['Laço Longo', 1], ['Fome de Conhecimento', 1], ['Dívida Menor', 1], ['Exclusão de Presa', 1]],
    specialties: { medicine: ['Primeiros socorros', 'Cirurgia', 'Psiquiatria', 'Flebotomia'], insight: ['Emoções', 'Mentiras'], science: ['Biologia', 'Neurociência', 'Química'], academics: ['Psicologia Clínica', 'Saúde Pública'], persuasion: ['Acolhimento', 'Negociação'] },
    gear: [{ from: 'Kit de primeiros socorros' }, { name: 'Kit de coleta de sangue', note: 'Agulhas, garrotes e bolsas de doação.' }, { name: 'Crachá do hospital', note: 'Ainda funciona nas portas de serviço.' }, { from: 'Spray de pimenta' }],
    concepts: ['[Psicólogo|Psicóloga] do plantão de crise noturno', '[Enfermeiro|Enfermeira] de UTI que nunca tira o turno do dia', '[Médico|Médica] que atende quem não pode procurar hospital'],
    ambitions: ['Encontrar um jeito de existir sem ferir ninguém', 'Entender o que o Sangue faz com a mente', 'Proteger os pacientes que ninguém mais protege'],
    desires: ['Encontrar a paciente que ligou para o plantão e desligou chorando', 'Conseguir bolsas de sangue sem levantar suspeitas', 'Salvar um paciente que os médicos desenganaram'],
    convictions: [['Nunca deixe alguém sozinho em sua pior noite', 'voluntário do plantão que divide o turno da madrugada com {nome}'], ['Ninguém deve ser usado sem consentimento', 'mãe idosa de {nome}, que vive numa casa de repouso e [o|a] recebe toda semana', { rel: [20, 32] }], ['Toda vida merece cuidado', 'enfermeira veterana que ensinou {nome} a profissão']],
    life: 'Trabalhou anos nos hospitais e serviços de saúde de {cidade}, sempre nos plantões noturnos que ninguém queria.',
    embrace: ['admirava sua compaixão e queria [um médico|uma médica] entre os seus', 'foi atendido por [ele|ela] numa noite ruim e não quis [deixá-lo|deixá-la] partir', 'precisava de alguém com acesso a sangue e a segredos médicos'],
    appearance: ['Cabelo preso, roupas práticas e um olhar cansado que acolhe e avalia ao mesmo tempo.', 'Jaleco sobre roupas simples, mãos sempre limpas e uma calma que acalma os outros.'],
    hooks: ['Um dos doadores de {nome} tem um parente ligado a caçadores.', 'Um paciente antigo reconheceu {nome}, que não envelheceu um dia.']
  },
  {
    id: 'wanderer', label: 'Andarilho da natureza',
    attrs: ['stamina', 'wits', 'resolve', 'strength', 'dexterity', 'composure', 'intelligence', 'charisma', 'manipulation'],
    skills: ['survival', 'animalken', 'athletics', 'awareness', 'stealth', 'brawl', 'science', 'medicine', 'drive', 'intimidation', 'melee', 'firearms', 'craft', 'occult', 'insight', 'investigation', 'streetwise', 'larceny', 'academics'],
    dists: ['specialist', 'balanced'],
    disciplines: ['protean', 'animalism', 'fortitude', 'celerity', 'obfuscate', 'auspex', 'potence', 'presence', 'dominate', 'oblivion', 'bloodsorcery'],
    predators: ['Fazendeiro', 'Perseguidor', 'Vira-lata', 'Alçapão'],
    backgrounds: ['haven', 'contact', 'herd', 'retainer', 'resources', 'allies', 'mask', 'influence', 'fame', 'status', 'enemy'],
    packages: [[['Refúgio Base', 2], ['Localização', 1]], [['Contatos', 1]], [['Resistência ao Laço', 1]], [['Sabujo de Sangue', 1]], [['Recursos', 1]], [['Aliados (Efetividade)', 1], ['Aliados (Confiabilidade)', 1]]],
    flaws: [['Feio', 1], ['Suspeito', 1], ['Vivendo no Passado', 1], ['Analfabeto', 2], ['Fedor', 1]],
    specialties: { survival: ['Rastreamento', 'Abrigo', 'Orientação'], animalken: ['Cães', 'Cavalos', 'Aves'], athletics: ['Escalada', 'Corrida'], stealth: ['Mata fechada', 'Sombras'], science: ['Biologia', 'Botânica'] },
    gear: [{ from: 'Facão' }, { from: 'Kit de primeiros socorros' }, { name: 'Mochila de trilha', note: 'Corda, lanterna de cabeça, isqueiro, mapas topográficos e binóculo.' }, { name: 'Jipe velho', note: 'Barulhento e quase indestrutível.' }],
    concepts: ['[Biólogo|Bióloga] e ex-guarda florestal que vive como [lobo solitário|loba solitária] na mata', '[Caminhoneiro|Caminhoneira] que nunca para na cidade', '[Caçador|Caçadora] do interior que a cidade nunca domesticou'],
    ambitions: ['Impedir que a cidade engula a mata', 'Viver longe da política dos Membros', 'Descobrir o que aconteceu com seu senhor'],
    desires: ['Descobrir quem anda envenenando os animais das trilhas', 'Encontrar um novo abrigo antes da chuva', 'Seguir um rastro estranho até o fim'],
    convictions: [['Não mate nada que você não vá usar', 'filha de {nome}, veterinária de gado que acredita que {nome} se perdeu na mata', { rel: [-34, -20] }], ['A natureza deve ser protegida dos homens', 'brigadista voluntário que combate queimadas e caçadores ilegais'], ['Nunca abandone um animal ferido', 'dona de um abrigo de cães na estrada']],
    life: 'Passou a vida nas matas e serras ao redor de {cidade}, trabalhando como guarda florestal, guia ou caçador, longe das ruas.',
    embrace: ['precisava de um guardião que soubesse ler os homens e a mata', '[o|a] testou por três noites na floresta antes de decidir', '[o|a] encontrou [ferido|ferida] na serra e [o|a] reconheceu como igual'],
    appearance: ['Pele curtida de sol que nunca mais vai ver, [barba cheia|cabelo trançado] e olhos amarelados. Roupas camufladas e botas de trilha.', '[Alto e magro|Alta e magra], cabelo comprido preso, unhas grossas como garras. Cheira a terra molhada.'],
    hooks: ['Os envenenamentos servem para afastar visitantes de uma área onde alguém quer construir sem licença.', 'O senhor de {nome} pode estar em torpor numa gruta que só {nome} conhece.']
  },
  {
    id: 'criminal', label: 'Criminoso profissional',
    attrs: ['dexterity', 'wits', 'manipulation', 'composure', 'strength', 'stamina', 'resolve', 'charisma', 'intelligence'],
    skills: ['larceny', 'streetwise', 'stealth', 'subterfuge', 'firearms', 'intimidation', 'drive', 'awareness', 'brawl', 'insight', 'melee', 'athletics', 'finance', 'persuasion', 'technology', 'etiquette', 'investigation', 'politics', 'medicine'],
    dists: ['balanced', 'jackOfAllTrades'],
    disciplines: ['obfuscate', 'celerity', 'dominate', 'potence', 'presence', 'auspex', 'fortitude', 'animalism', 'oblivion', 'protean', 'bloodsorcery'],
    predators: ['Extorsionista', 'Sacoleiro', 'Vira-lata', 'Montero'],
    backgrounds: ['contact', 'resources', 'retainer', 'mask', 'haven', 'allies', 'influence', 'herd', 'fame', 'status', 'enemy'],
    packages: [[['Contatos', 2]], [['Recursos', 2]], [['Lacaios', 1], ['Arsenal Oculto', 1]], [['Máscara', 2]], [['Refúgio Base', 1], ['Poterna', 1]], [['Checar o Porta-malas', 1]]],
    flaws: [['Inimigo', 1], ['Inimigo', 2], ['Vivendo no Limite', 1], ['Dívida Menor', 1], ['Suspeito', 1], ['Dependência', 1]],
    specialties: { larceny: ['Fechaduras', 'Alarmes', 'Bolsos'], streetwise: ['Mercado negro', 'Contrabando'], stealth: ['Invasão', 'Multidões'], subterfuge: ['Blefe', 'Disfarces'], firearms: ['Pistolas', 'Escopetas'], drive: ['Fuga', 'Carros'] },
    gear: [{ from: 'Pistola de bolso' }, { from: 'Ferramenta de arrombamento de fechaduras' }, { from: 'Canivete' }, { name: 'Carro "frio"', note: 'Placa trocada, documentos de outra pessoa.' }, { name: 'Celular descartável', note: 'Três chips, nenhum no próprio nome.' }],
    concepts: ['[Ladrão|Ladra] de cargas que trabalha para quem paga melhor', 'Contrabandista que sabe onde tudo é vendido', '[Arrombador|Arrombadora] que nenhuma fechadura segura'],
    ambitions: ['Montar o próprio esquema e não dever nada a ninguém', 'Controlar o mercado negro de {cidade}', 'Dar o golpe que vai garantir a eternidade'],
    desires: ['Receber o dinheiro de um serviço antes que o contratante suma', 'Despistar a polícia por mais uma semana', 'Recuperar a carga que um rival roubou'],
    convictions: [['Nunca delate quem confiou em você', 'parceiro antigo de {nome}, preso há anos e que nunca [o|a] entregou', { rel: [-6, 8] }], ['Não roube de quem não tem', 'avó de {nome}, que ainda [o|a] espera para o almoço de domingo', { rel: [40, 55] }], ['Palavra dada é palavra cumprida', 'dono de um bar que guarda recados para {nome}']],
    life: 'Cresceu entre receptadores e desmanches de {cidade}, aprendeu cedo a abrir portas que não eram suas e nunca teve emprego com carteira assinada.',
    embrace: ['precisava de alguém que conseguisse entrar em qualquer lugar', 'devia um favor e pagou com a eternidade de um ladrão', 'viu [nele|nela] a astúcia de um predador nato'],
    appearance: ['Roupa escura e discreta, boné baixo e mãos rápidas que nunca param quietas.', 'Corrente de prata, tatuagens nos dedos e um sorriso de quem já se safou de muita coisa.'],
    hooks: ['Um antigo comparsa de {nome} saiu da prisão e quer sua parte.', 'A carga que {nome} roubou pertencia a um Membro.']
  },
  {
    id: 'journalist', label: 'Jornalista',
    attrs: ['wits', 'charisma', 'intelligence', 'manipulation', 'composure', 'resolve', 'dexterity', 'stamina', 'strength'],
    skills: ['investigation', 'persuasion', 'insight', 'academics', 'technology', 'subterfuge', 'politics', 'awareness', 'etiquette', 'streetwise', 'performance', 'stealth', 'drive', 'occult', 'finance', 'craft', 'larceny', 'athletics', 'leadership'],
    dists: ['balanced', 'jackOfAllTrades'],
    disciplines: ['auspex', 'presence', 'dominate', 'obfuscate', 'celerity', 'fortitude', 'animalism', 'potence', 'protean', 'oblivion', 'bloodsorcery'],
    predators: ['Perseguidor', 'Sereia', 'Consensualista', 'Scene Queen'],
    backgrounds: ['contact', 'fame', 'influence', 'resources', 'allies', 'haven', 'mask', 'herd', 'retainer', 'status', 'enemy'],
    packages: [[['Contatos', 3]], [['Fama', 1], ['Influência', 1]], [['Recursos', 1], ['Refúgio Base', 1]], [['Máscara', 1], ['Contatos', 1]], [['Segredos da Cidade', 1]], [['Aliados (Efetividade)', 1], ['Aliados (Confiabilidade)', 1]]],
    flaws: [['Fome de Conhecimento', 1], ['Perseguidores', 1], ['Inimigo', 1], ['Vivendo no Limite', 1], ['Transparente', 1]],
    specialties: { investigation: ['Entrevistas', 'Documentos', 'Fontes'], persuasion: ['Entrevistas', 'Debate'], academics: ['Jornalismo', 'História Local'], technology: ['Redes sociais', 'Pesquisa online'], performance: ['Rádio', 'Oratória'], craft: ['Fotografia', 'Edição de vídeo'] },
    gear: [{ name: 'Gravador digital', note: 'Cheio de entrevistas que nunca foram ao ar.' }, { name: 'Notebook e pendrives', note: 'Arquivos de reportagens e fontes protegidas.' }, { name: 'Crachá de imprensa', note: 'Abre portas em eventos e repartições.' }, { from: 'Spray de pimenta' }],
    concepts: ['Repórter [investigativo|investigativa] que descobriu a história errada', 'Radialista da madrugada que ouve todos os segredos da cidade', 'Colunista social que sabe demais'],
    ambitions: ['Publicar a história que ninguém em {cidade} teve coragem de contar', 'Descobrir quem controla de verdade a cidade', 'Proteger as fontes que confiaram em {nome}'],
    desires: ['Conseguir uma entrevista com alguém que nunca fala', 'Descobrir quem apagou uma reportagem do arquivo do jornal', 'Seguir uma fonte até um encontro suspeito'],
    convictions: [['A verdade é sagrada', 'editora veterana que nunca cedeu a pressões'], ['Nunca entregue uma fonte', 'informante anônimo que arriscou o emprego para falar com {nome}'], ['Dê voz a quem não tem', 'líder comunitária de um bairro esquecido pela imprensa']],
    life: 'Trabalhou em jornais, rádios e blogs de {cidade}, sempre atrás da história que os poderosos queriam esconder.',
    embrace: ['descobriu que [ele|ela] estava perto demais da verdade sobre os Membros', 'queria uma voz influente a seu serviço', 'admirava sua coragem e quis [preservá-lo|preservá-la]'],
    appearance: ['Bolsa cheia de papéis, caneta atrás da orelha e um olhar curioso que não deixa nada passar.', 'Óculos, camisa amarrotada e a mania de anotar tudo o que ouve.'],
    hooks: ['A reportagem que {nome} prepara pode expor a Máscara.', 'Uma fonte antiga de {nome} sumiu sem deixar rastro.']
  },
  {
    id: 'worker', label: 'Trabalhador da noite',
    attrs: ['stamina', 'wits', 'dexterity', 'resolve', 'composure', 'strength', 'charisma', 'intelligence', 'manipulation'],
    skills: ['drive', 'craft', 'streetwise', 'awareness', 'athletics', 'brawl', 'insight', 'technology', 'persuasion', 'larceny', 'stealth', 'medicine', 'intimidation', 'etiquette', 'firearms', 'melee', 'survival', 'politics', 'leadership'],
    dists: ['jackOfAllTrades', 'balanced'],
    disciplines: ['fortitude', 'celerity', 'potence', 'obfuscate', 'animalism', 'auspex', 'presence', 'dominate', 'protean', 'oblivion', 'bloodsorcery'],
    predators: ['Vira-lata', 'Sandman', 'Alçapão', 'Sacoleiro'],
    backgrounds: ['contact', 'allies', 'haven', 'resources', 'herd', 'retainer', 'influence', 'mask', 'fame', 'status', 'enemy'],
    packages: [[['Contatos', 2]], [['Aliados (Efetividade)', 1], ['Aliados (Confiabilidade)', 1]], [['Refúgio Base', 1], ['Oficina Mecânica', 1]], [['Recursos', 1]], [['Rebanho', 1]], [['Influência', 1]]],
    flaws: [['Dívida Menor', 1], ['Inimigo', 1], ['Vivendo no Limite', 1], ['Dependência', 1], ['Analfabeto', 2]],
    specialties: { drive: ['Caminhões', 'Táxi', 'Motos'], craft: ['Mecânica', 'Solda', 'Marcenaria'], streetwise: ['Rodoviária', 'Bares do centro'], awareness: ['Estradas', 'Detalhes'], technology: ['Rádios', 'Eletrônica'] },
    gear: [{ from: 'Chave de roda / pé de cabra / martelo' }, { name: 'Caixa de ferramentas', note: 'Chaves, alicates e fita isolante; resolve quase tudo.' }, { name: 'Veículo de trabalho', note: 'Táxi, van ou caminhão velho que conhece todas as ruas.' }, { name: 'Rádio comunicador', note: 'Fala com os colegas do turno da noite.' }],
    concepts: ['Taxista da madrugada que conhece todos os atalhos', '[Mecânico|Mecânica] de oficina que conserta carros e problemas', 'Vigia [noturno|noturna] que viu coisas demais'],
    ambitions: ['Garantir um futuro para a família que deixou para trás', 'Ser livre de qualquer senhor ou príncipe', 'Ter o próprio negócio na cidade'],
    desires: ['Consertar o motor antes da próxima corrida', 'Descobrir quem anda seguindo sua van', 'Pagar uma dívida antes do prazo'],
    convictions: [['Trabalho honesto é dignidade', 'antigo chefe de {nome} na oficina, que ainda guarda a vaga [dele|dela]'], ['Proteja os seus', 'cônjuge de {nome}, que acredita numa história de abandono', { rel: [-5, 5] }], ['Ajude quem precisa de carona', 'motorista de ônibus que divide café com {nome} nas madrugadas']],
    life: 'Passou a vida trabalhando nos turnos da noite de {cidade}: no volante, na oficina ou vigiando galpões enquanto a cidade dormia.',
    embrace: ['precisava de alguém que conhecesse as ruas de madrugada', '[o|a] escolheu como motorista e depois como cria', '[o|a] encontrou à beira da estrada depois de um acidente'],
    appearance: ['Mãos calejadas, boné surrado e roupa de trabalho manchada de graxa.', 'Olhos acostumados ao escuro, jaqueta de náilon e um cigarro apagado no canto da boca.'],
    hooks: ['Um passageiro antigo de {nome} reconheceu seu rosto num lugar onde [ele|ela] não deveria estar.', 'O dono da oficina onde {nome} trabalha deve dinheiro a um Membro.']
  },
  {
    id: 'mystic', label: 'Místico e religioso',
    attrs: ['resolve', 'charisma', 'composure', 'wits', 'intelligence', 'manipulation', 'stamina', 'dexterity', 'strength'],
    skills: ['occult', 'insight', 'persuasion', 'leadership', 'academics', 'performance', 'awareness', 'etiquette', 'medicine', 'subterfuge', 'intimidation', 'politics', 'animalken', 'streetwise', 'survival', 'craft', 'stealth', 'investigation', 'athletics'],
    dists: ['balanced', 'specialist'],
    disciplines: ['auspex', 'oblivion', 'presence', 'dominate', 'bloodsorcery', 'fortitude', 'obfuscate', 'animalism', 'protean', 'celerity', 'potence'],
    predators: ['Osíris', 'Consensualista', 'Ceifador', 'Ladrão de Túmulos'],
    backgrounds: ['herd', 'fame', 'influence', 'contact', 'allies', 'haven', 'resources', 'retainer', 'mask', 'status', 'enemy'],
    packages: [[['Rebanho', 3]], [['Influência', 1], ['Contatos', 1]], [['Refúgio Base', 1], ['Proteção', 1]], [['Fama', 1]], [['Aliados (Efetividade)', 1], ['Aliados (Confiabilidade)', 1]], [['Recursos', 1]]],
    flaws: [['Laço Longo', 1], ['Inimigo', 1], ['Vivendo no Passado', 1], ['Dívida Menor', 1], ['Fome de Conhecimento', 1]],
    specialties: { occult: ['Umbanda', 'Espiritismo', 'Catolicismo popular', 'Rituais'], insight: ['Confissões', 'Medos'], persuasion: ['Sermões', 'Consolo'], leadership: ['Comunidade', 'Fiéis'], performance: ['Canto', 'Oratória'], academics: ['Teologia', 'História da Igreja'], craft: ['Imagens sacras', 'Ervas'] },
    gear: [{ name: 'Terço ou guia de contas', note: 'Objeto de fé que ainda segura com força.' }, { name: 'Bíblia ou livro de orações anotado', note: 'Margens cheias de anotações sobre o Sangue.' }, { name: 'Velas e ervas', note: 'Para rituais, bênçãos e para acalmar os fiéis.' }, { from: 'Estaca de madeira' }],
    concepts: ['[Ex-seminarista|Ex-noviça] que ainda reza pela própria alma', '[Pai|Mãe] de santo que ouve os mortos', '[Pregador|Pregadora] de rua que reuniu um rebanho fiel'],
    ambitions: ['Encontrar redenção para o que se tornou', 'Guiar um rebanho que precisa de fé', 'Entender o lugar dos Membros na criação'],
    desires: ['Celebrar uma missa à meia-noite sem que ninguém perceba', 'Proteger um fiel que está sendo ameaçado', 'Descobrir por que a capela antiga está fechada'],
    convictions: [['Ame o próximo como a si mesmo', 'padre de uma paróquia de bairro que acolhe moradores de rua'], ['Respeite os mortos', 'coveiro do cemitério municipal, que conversa com os túmulos'], ['Nunca negue abrigo a quem pede', 'freira que mantém uma casa de acolhida']],
    life: 'Dedicou a vida à fé em {cidade}, entre paróquias, terreiros, procissões e as pessoas que buscavam consolo nas madrugadas.',
    embrace: ['viu em sua fé uma força que queria para si', 'queria um líder espiritual para seus seguidores', 'testou sua fé e se surpreendeu quando ela não se quebrou'],
    appearance: ['Roupas simples, um objeto de fé sempre à vista e uma voz calma que acalma multidões.', 'Olhos fundos de quem reza demais, mãos marcadas por velas e um sorriso triste.'],
    hooks: ['Um dos fiéis de {nome} começou a desconfiar de por que os cultos são sempre à noite.', 'Alguém deixou símbolos estranhos na porta do refúgio de {nome}.']
  }
]

// O que cada Tipo de Predador faz, para a biografia (frase sem sujeito: "{nome} ...").
export const PREDATOR_TEXT = {
  'Osíris': 'cultiva seguidores que oferecem o próprio sangue por devoção',
  Fazendeiro: 'recusa-se a beber de humanos e vive de sangue animal',
  'Scene Queen': 'caça dentro da própria cena social, entre seus admiradores',
  Montero: 'conta com lacaios que conduzem as presas até um lugar seguro',
  Extorsionista: 'cobra em sangue o que lhe devem, à base de ameaça',
  Sandman: 'alimenta-se de pessoas adormecidas, entrando em casas sem ser notado',
  Sereia: 'seduz as presas e bebe nos momentos de intimidade',
  Consensualista: 'só bebe de quem consente, mantendo a ilusão de um tratamento ou de um capricho',
  'Vira-lata': 'ataca à força nas ruas, de preferência criminosos',
  'Alçapão': 'atrai as presas para o próprio refúgio',
  Trinchador: 'alimenta-se em segredo da própria família mortal',
  Sacoleiro: 'vive de sangue ensacado, roubado ou comprado no mercado negro',
  Ceifador: 'alimenta-se de doentes terminais e moribundos',
  Perseguidor: 'escolhe uma presa e a segue por noites até o momento certo',
  'Ladrão de Túmulos': 'bebe de cadáveres frescos em necrotérios e cemitérios',
  Sanguessuga: 'alimenta-se de outros vampiros'
}

// Rótulos concretos para as Especializações genéricas dos Tipos de Predador.
export const GENERIC_SPECIALTY_DETAILS = {
  animalken: ['Cães', 'Gatos', 'Ratos', 'Cavalos', 'Corvos'],
  etiquette: ['Alta sociedade', 'Cena artística', 'Meio acadêmico', 'Cena noturna'],
  leadership: ['Movimento estudantil', 'Torcida organizada', 'Sindicato', 'Comunidade'],
  streetwise: ['Cena noturna', 'Bares do centro', 'Baile funk', 'Rodoviária'],
  occult: ['Umbanda', 'Hermetismo', 'Espiritismo', 'Catolicismo popular'],
  performance: ['Música', 'Teatro', 'Dança', 'Oratória']
}

export const FIRST_NAMES = {
  f: ['Ana', 'Bianca', 'Camila', 'Carolina', 'Cecília', 'Clara', 'Daniela', 'Denise', 'Eduarda', 'Fernanda', 'Gabriela', 'Heloísa', 'Iris', 'Isabel', 'Janaína', 'Joana', 'Juliana', 'Larissa', 'Lavínia', 'Letícia', 'Lorena', 'Luciana', 'Luíza', 'Maitê', 'Mariana', 'Natália', 'Olívia', 'Priscila', 'Raquel', 'Regina', 'Rosana', 'Silvia', 'Simone', 'Tainá', 'Tatiana', 'Valentina', 'Vanessa', 'Yara'],
  m: ['Adriano', 'Alexandre', 'Antônio', 'Benedito', 'Bernardo', 'Caio', 'César', 'Cláudio', 'Diego', 'Edson', 'Emanuel', 'Fabrício', 'Fernando', 'Flávio', 'Gilberto', 'Guilherme', 'Hugo', 'Igor', 'Jair', 'Júlio', 'Leonardo', 'Lucas', 'Marcelo', 'Matheus', 'Miguel', 'Nilton', 'Otávio', 'Pedro', 'Renan', 'Ricardo', 'Rodrigo', 'Samir', 'Sérgio', 'Teodoro', 'Thiago', 'Tomás', 'Valter', 'Wagner']
}

export const SURNAMES = ['Abreu', 'Alencar', 'Amorim', 'Aragão', 'Arruda', 'Bastião', 'Bernardes', 'Bittencourt', 'Brandt', 'Cardoso', 'Carneiro', 'Castilho', 'Coutinho', 'Dantas', 'Esteves', 'Falcone', 'Fagundes', 'Galvão', 'Godoy', 'Guimarães', 'Haddad', 'Jardim', 'Lacorte', 'Leme', 'Macedo', 'Magalhães', 'Matos', 'Medeiros', 'Moraes', 'Nakamura', 'Novaes', 'Pacheco', 'Pimentel', 'Quintela', 'Ramalho', 'Rangel', 'Sampaio', 'Sodré', 'Tavares', 'Toledo', 'Valadares', 'Ventura', 'Vilar', 'Werneck', 'Xavier', 'Zanetti']
