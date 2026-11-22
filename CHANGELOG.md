# Histórico de versões

## 1.7.4 — Correções no cabeçalho da ficha de Vampiro

- **Clã e Tipo de Predador:** os seletores abrem os compêndios correspondentes e adicionam à ficha o item confirmado. Clicar no nome de um item já preenchido abre a ficha dele.
- **Perdição do Clã:** o cabeçalho reconhece nomes traduzidos como Malkavianos e Ministério e orienta a selecionar um clã quando o campo está vazio.
- **Compulsão:** o seletor volta a mostrar a seta de abertura e exibe a compulsão ativa, com a opção Nenhuma para limpá-la.

## 1.7.3 — Ícones pintados

- **Ícones:** os 96 ícones desenhados da 1.7.2 foram trocados por 95 ícones pintados no estilo dos ícones do Foundry (equipamentos, pastas de Vantagens e Defeitos, Tipos de Predador, Potência do Sangue, Folhas de História, Oblivion e Cerimônias de Oblivion). Lança-chamas, lança-granadas e lançador incendiário descartável usam ícones do próprio Foundry. São 299 itens atualizados.
- Itens já arrastados para fichas mantêm o ícone antigo; arraste de novo do compêndio para atualizar.

## 1.7.2 — Ícones próprios nos compêndios

- **Ícones:** 347 itens que usavam um ícone genérico (o padrão do sistema, o de Disciplina, o de Sangue-Ralo fora dos Sangues-Ralos ou a caveira do Foundry) ganharam ícone próprio. São 96 ícones originais no mesmo estilo: equipamentos, pastas de Vantagens e Defeitos, Tipos de Predador, níveis de Potência do Sangue, Folhas de História, Oblivion e Cerimônias de Oblivion. Outros 34 equipamentos usam ícones do próprio Foundry. As Vantagens e Defeitos de Sangue-Ralo do Guia do Jogador usam o símbolo de Sangue-Ralo.
- **Caitiff:** o símbolo do clã era um WebP salvo como .png; o arquivo agora tem a extensão certa.
- Itens já arrastados para fichas mantêm o ícone antigo; arraste de novo do compêndio para atualizar.

## 1.7.1 — Botões de dano no empate bilateral

- **Empate bilateral:** o dano aplicado pelos botões fica registrado na mensagem; recarregar a página não permite aplicá-lo de novo. Cada botão fica sob o personagem certo, mesmo quando um dos lados já tem a trilha toda Agravada. Os botões não somem mais ao recarregar a página.

## 1.7.0 — Combate pelas regras dos livros e compêndio de Equipamentos revisto

- **Dano de armas:** o valor da arma entra no dano (margem + valor + bônus da munição). A armadura converte dano Agravado em Superficial, 1 por ponto, em vez de subtrair dano. O dano Superficial de ataques é dividido por 2, arredondando para cima. Armas de fogo e afiadas causam Agravado a mortais; a pistola de choque é exceção.
- **Trilha de Vitalidade cheia:** o dano que excede a trilha converte Superficial em Agravado (Livro Básico, p. 127). O cartão avisa quando a trilha fica toda Agravada (torpor, coma ou morte).
- **Munições e tags especiais:** incendiárias e Sopro de Dragão causam Agravado a todos (Sopro de Dragão segue o texto em inglês: 1 Agravado por rodada; nota de tradução na descrição). Flash-bang não causa dano e deixa o alvo Cego ou Desorientado. Estaca de madeira com ataque localizado ao coração e 5 ou mais de dano deixa um vampiro Estaqueado. "Automática" passa a ser +1 dado opcional e não esvazia o carregador. Ponta oca está marcada como regra da casa.
- **Ataque e defesa:** paradas padrão das armas pelo livro; modificadores opcionais de fora de alcance, tiro dentro do corpo a corpo, arma longa no corpo a corpo e ataque localizado (−2 sucessos). A janela de defesa tem cobertura e o botão "Alvo parado (Dificuldade 1)".
- **Empate bilateral:** em empate com parada própria, os dois lados sofrem dano como margem 1.
- **Compêndio de Equipamentos:** de 113 para 163 itens, em 6 pastas (Armas Brancas, Armas de Fogo, Explosivos e Especiais, Armaduras, Munição, Equipamento e Veículos). Nomes genéricos em português, com os modelos reais como exemplo e o nome original em inglês na descrição, para busca. Cada item traz o selo Oficial, Analogia ou Proposta (regra da casa) e a fonte. Valores corrigidos pelo Livro Básico e pela Segunda Inquisição; itens duplicados fundidos; armas de veículo e drone sem contador de munição; carregadores estendidos fundidos no carregador padrão; cartucho de fósforo branco removido.
- **Munição:** "Abrir Caixa" só reabastece carregadores do mesmo calibre e tipo de munição. Novas caixas de ponta oca 9 mm, perfurante 5,56 mm e Sopro de Dragão calibre 12.
- **Fichas existentes:** itens já arrastados para personagens não são alterados. Para usar os novos valores, arraste o item de novo a partir do compêndio.

## 1.6.7 — Botão da Coterie na aba de Atores

- **Coterie:** novo botão "Coterie" (com coroa) no topo da aba de Atores, ao lado de "Criar Ator" e "Criar Pasta". Antes a coroa só aparecia em pastas com personagens de jogadores, e a Coterie ficava sem acesso quando os personagens estavam fora de pastas (como o personagem criado automaticamente para o jogador). As coroas das pastas continuam.

## 1.6.6 — Fechar "Selecione a Rolagem" sem erro

- **Rolagens:** fechar a janela "Selecione a Rolagem" pelo X deixava um erro no console (falha do wod5e 5.3.15, que só reconhece o botão Cancelar). O módulo agora trata isso como cancelamento; as rolagens continuam iguais.

## 1.6.5 — Fichas de Caçador e Lobisomem

- **Caçador e Lobisomem:** as fichas não abriam no wod5e 5.3.15 (o cabeçalho usava um template que não existe mais no sistema). Voltam a abrir, com Ímpeto, Credo, Aflição, Tribo e Auspício.
- **Nomes nas fichas de ator:** nomes longos não ficam mais cortados, nem nas fichas de personagem do módulo nem nas de PdN e grupo do wod5e; a fonte diminui só quando o nome não cabe.
- **Textos:** "Plumário" padronizado também em Sistemas de Coterie; exemplo do campo Tipo de Coterie com "Gangue de Presas"; o tipo de item do Ímpeto do Caçador aparecia como "Veículo".

## 1.6.4 — Ficha de PdN dos Antagonistas

- **Antagonistas:** a ficha de PdN do wod5e (Szlachta, Vozhd e os demais) recebia por engano o estilo da ficha de vampiro do módulo, e o nome aparecia cortado ("S…", "V…"). O estilo do módulo agora vale só para as fichas de personagem; a de PdN voltou ao visual do sistema, com o nome inteiro sobre o retrato.

## 1.6.3 — Nomes longos na ficha de item

- **Ficha de item:** nomes longos, como os das Folhas de História e "Potência de Sangue 0 (zero): Sangue-Ralo", ficavam cortados no campo de nome. Agora a fonte diminui só quando o nome não cabe; nomes curtos continuam do mesmo tamanho.

## 1.6.2 — Correções dos testes no Foundry

- **Ataques com arma** voltam a funcionar sem o módulo Argon (enhancedcombathud): a rolagem não abria e dava erro no console.
- **Poderes passivos** (como Resiliência) aplicam o bônus de novo, sem erro, no Foundry 13.
- **Coterie:** Chasse, Lien, Portillon e os Antecedentes compartilhados voltam a gravar. A janela abre para jogadores mesmo sem permissão de criar diários.
- **Criação de personagem:** clicar duas vezes em "Avançar" não aplica mais o Clã em dobro nem pula o Tipo de Predador. Novo atalho "Criação de Personagem" no menu do cabeçalho da ficha.
- **Loja de XP:** compra de Rituais, Cerimônias e Fórmulas (nível × 3). Especialização só em Habilidade com ponto. Alquimia Sangue-Ralo só para Sangues-Ralos, que agora a veem na loja.
- **Textos:** as notas de regra de 48 poderes, que apareciam em inglês no cartão de teste resistido, foram traduzidas. "Sucesso por" e "Falha por" voltam a mostrar a margem. O resumo da criação automática não mostra mais tags HTML e diz "12ª". Concordâncias corrigidas ("+2 pontos", "1 sucesso", "1 ponto"), e "Feitiçaria de Sangue" sem maiúscula indevida. Notas do Ceifador em português.
- **Referências corrigidas:** "Tabu Folclórico" (Variante Tzimisce), "Destituído" (Dunsirn) e "Erudição" (exemplo de Projeto).
- **Tipos de Coterie:** nomes padronizados como "Plumário" e "Gangue de Presas"; o quadro geral ganhou rolagem horizontal.
- **Equipamento:** 98 ícones que não existem no Foundry 13 foram trocados por ícones do núcleo.

## 1.6.1 — Política editorial e fontes dos Clãs

- **Clãs do Guia do Jogador** (Banu Haqim, Hecata, Lasombra e Ministério): as descrições continuam resumidas. O rodapé agora diz "Descrição resumida não oficial — Guia do Jogador (Players Guide, Renegade Game Studios, 2023), p. N". Perdição, Compulsão e Disciplinas não mudaram.
- **Clãs do Manual Básico:** os 9 ganharam o rodapé "Fonte: Vampiro: A Máscara — Manual Básico, p. N", como os do Companion já tinham.
- **README:** nova seção "Política editorial". As regras necessárias para jogar aparecem completas; o texto narrativo novo entra resumido, e todas as fontes ficam identificadas.

## 1.6.0 — Guia do Jogador conferido com o original em inglês

- **Todo o conteúdo do Guia do Jogador no módulo foi conferido frase a frase com o Players Guide em inglês:** Clãs, Tipos de Predador, Folhas de História, Disciplinas, Vantagens e Defeitos e as entradas do Diário (Carniçais, Mortais, Sistemas e Tipos de Coterie, Memoriam e Projetos). Foram 92 campos corrigidos nos compêndios e 24 páginas no Diário. O texto oficial do Companion foi mantido.
- **Tipos de Predador:** os 6 do Guia ganharam a Parada de Predador, que faltava.
- **Folhas de História:** voltaram benefícios omitidos, como os 2 pontos de Máscara dos Dunsirn e os 2 sucessos automáticos em Cerimônias de Tenochtitlan.
- **Vantagens, Defeitos e Disciplinas:** frases, exemplos e regras omitidas foram restaurados. "Saúde" virou Vitalidade em todos os textos.
- **Tipos de Coterie:** as epígrafes de cada tipo voltaram, e o quadro foi corrigido em vários pontos (Pilares, Recursos, Chasse). Em Campeões, o quadro impresso repete por engano os requisitos do Culto de Sangue; o módulo segue a descrição.
- **Carniçais:** o quadro "Usando Vitae" ficou fiel ao original, e as referências cruzadas passaram para a Nota do módulo.
- **Szlachta:** a nota da ficha passa a dizer Olhos da Besta (Proteanismo); na 1.5.0 dizia "Metamorfose".

## 1.5.0 — Revisão bilíngue e retratos dos Antagonistas

- **Diário conferido frase a frase com o Players Guide em inglês** (p. 195–212 e 241–243): 16 correções de fidelidade em Convicções e Pilares (8), Crônicas e Tipos de Jogo (7) e Antagonistas (1). Exemplos: o Pilar "amigo que também é inimigo" (*frenemy*), "casas noturnas" em vez de "boatos", a pergunta sobre o sono diurno, a recomendação de regras rápidas só quando a aventura precisa terminar numa sessão. Os textos oficiais do Companion (Servos Carniçais, Szlachta, Vozhd) foram mantidos.
- **Rodapés corrigidos** nas páginas Servos Carniçais, Szlachta e Vozhd, que desde a 1.4.0 mostravam "241uia do Jogador, p. G".
- **Nota do Vozhd corrigida** no Diário e na ficha: o Guia diz que ele não precisa comer nada além do sangue do mestre, uma vez por mês (a nota anterior dizia "muito alimento", erro da tradução automática).
- **Szlachta pronto para jogo:** Olhos da Besta (Metamorfose) e Sentir a Besta (Animalismo), Disciplinas do clã Tzimisce, e Briga 8 como Parada de Dados Excepcional. A nota da ficha explica a escolha; o ID e as características continuam os mesmos.
- **Retratos dos 5 Antagonistas** (ficha e token), gerados para o módulo, em `assets/antagonistas/`.

## 1.4.2 — Correções na tradução do sistema

- O módulo passa a corrigir cinco textos da tradução pt-BR do próprio wod5e, sem alterar o sistema: “Máculas de Oblívio” (era “Título das Máculas de Oblívio”), “Os efeitos de Oblívio…” (era “Oblivio” sem acento), “Rolar Checagem de Sangue” (era “Chegagem”) e a opção “Automatizar Máculas de Oblívio”, cuja explicação dizia “testes de despertar” em vez de Checagens de Sangue. Arquivo: `lang/pt-BR/wod5e-correcoes.json`.

## 1.4.1 — Termos de Crônicas e Antagonistas

- **Crônicas e Tipos de Jogo:** termos padronizados como “aventura de sessão única” (*one-shot*), “sessão gravada ou transmitida” (*actual play*), “RPG por postagens” (*play-by-post*) e “transbordamento emocional” (*bleed*), com Nota do módulo: são traduções próprias, conferidas com uma reprodução do original em inglês, não termos oficiais.
- **Antagonistas:** a primeira página passa a se chamar “Servos Carniçais” (título do Companion), com o subtítulo “Tzimisce”. Nota do módulo em Retornados: o termo designa cadáveres animados por Cerimônias de Oblívio, e os quatro nomes são traduções próprias.
- **Szlachta:** Nota do módulo na ficha sobre os dois poderes de nível 1 (escolha do Narrador, pendente no modelo) e a parada excepcional de 8 dados. Nenhuma característica mudou, e os IDs dos Atores foram mantidos.

## 1.4.0 — Fechamento das pendências do Guia do Jogador

- **Novo compêndio “Antagonistas do Guia do Jogador”** (Atores SPC): Szlachta e Vozhd (carniçais, com Disciplinas), Cadáver sem Mente, Cadáver Agressivo e Servo Homuncular. Szlachta e Vozhd usam as características do Companion oficial (p. 22–23), iguais às do Guia (p. 241–243).
- **Diário de Regras do Guia:** três entradas novas, Convicções e Pilares (p. 205–212), Crônicas e Tipos de Jogo (p. 195–204) e Antagonistas (p. 241–243).
- **Carniçais:** Vício Fatal corrigido (“a capacidade de adiar o envelhecimento sem carregar o fardo da Maldição”); quadro “Usando Vitae para Curar os Vivos” (Guia, p. 139) na página de Disciplinas e Vitalidade.
- **Notas do módulo:** Crimes de Guerra nas páginas Comando e Regência (citado sem descrição no livro, nenhum item criado); Cálice Secreto (proporção de 2 Checagens por ponto de Fome, sem custo total fixo); Variante da Perdição Tremere: Sangue Roubado (leitura sugerida, não é errata).

## 1.3.1 — Fonte do Companion nos clãs

- **Clãs do Companion no compêndio:** Ravnos, Salubri e Tzimisce passam a citar a fonte ("Fonte: Vampiro: A Máscara — Companion, p. N") na descrição e na Perdição. A Perdição do Salubri ganha a Nota do módulo que a ficha já mostrava: nos dois casos vale a Gravidade da Perdição do Salubri.

## 1.3.0 — Criação automática de PJ

- **Criação automática de PJ** por macro (`chargen/macros/Criar_PJ_Automatico.js`): um vampiro completo e sorteado, com semente reproduzível, as mesmas regras e a mesma auditoria do assistente, resumo privado no chat e exclusão do Ator em caso de erro.
- **Assistente de criação conforme o Manual Básico:**
  - Disciplinas de clã 2+1 (p. 136); Caitiff escolhe duas Disciplinas quaisquer.
  - Caitiff começa com o Defeito Suspeito e não compra Status na criação (p. 107).
  - Especializações gratuitas em Erudição, Ofícios, Performance e Ciência com pontos, mais uma livre (p. 136 e 145).
  - 7 pontos de Vantagens, sem o bônus por Defeitos; os pontos extras do Narrador (p. 150) ficam numa configuração de mundo.
  - Especialização do Tipo de Predador numa Habilidade sem pontos vira 1 ponto nessa Habilidade, sem a Especialização (p. 149). O ponto não conta na distribuição de Habilidades.
  - Vitalidade (Vigor + 3) e Força de Vontade (Autocontrole + Determinação) passam a ser gravadas na ficha (p. 136); antes ficavam no padrão 5 do sistema.
- **Pastas em português no compêndio de Vantagens e Defeitos:** a seção de Sangue-Ralo voltou a aparecer, e as Qualidades e Defeitos de Sangue-Ralo não aparecem mais na lista geral. Itens de Caitiff só ficam disponíveis para Caitiff.
- Especializações dos Tipos de Predador do Guia do Jogador (Montero, Extorsionista, Alçapão, Ceifador, Perseguidor e Ladrão de Túmulos) aparecem em português no assistente e na ficha.
- Diálogo de Disciplina informa "2 pontos" quando o Clã concede 2; o resumo do macro no chat usa os nomes em português.
- Os campos de texto do assistente não voltam mais ao topo da janela a cada alteração.

## 1.2.0 — Regras sem item no Diário
- **Diário "Regras do Guia do Jogador"** ganha 5 entradas: **Carniçais** e **Mortais** (texto oficial do Companion, com as mudanças do Guia do Jogador em notas), **Sistemas de Coterie** (mudança de coterie, Coteries Fortes, criação de Domínio expandida), **Memoriam e Projetos** (versões simplificadas do Guia) e **Regras Opcionais do Companion** (Compulsões em Críticos Bestiais, Pegar a Metade).
- **Notas do módulo** em Influenciar o Bando, Escamas de Górgona, Manto Estígio e Amaranto Florido, com uma leitura sugerida onde o livro não define a regra.
- Termos: "Pilar" (no lugar de "Pedra de Toque") e "crítico bestial" (no lugar de "crítico bagunçado"), como no Manual Básico.

## 1.1.2 — Revisão do Guia do Jogador
- **Leituras duvidosas do Guia** conferidas com o original em inglês: 96 trechos, com 10 correções. Entre elas: Aura de Decadência (o dano Superficial à Saúde não é reduzido pela metade), Lista de Amigos, Marcado por Palavras, Contato Contextual, Criptoleto e cinco páginas do Diário de Tipos de Coterie.
- **Divergências do próprio livro:** vale a descrição detalhada em Campeões, Sabotadores e Vigilantes (a tabela do Diário foi ajustada), e a linha de parada em Cinzas às Cinzas (Vigor + Medicina, ou Vigor + Fortitude).

## 1.1.1 — Companion
- **Companion (Guia Suplementar):** conferência dos textos de Ravnos, Salubri, Tzimisce, dos 10 poderes e da Potência de Sangue contra o livro. O texto confere, com uma correção em Aliviando a Alma Bestial.
- **Nomes oficiais do Companion** em 13 Vantagens e Defeitos do Guia do Jogador, por exemplo Táticas de Bando, A Todo Custo, Legados Vampíricos, Aura Imprópria e Maldição da Megaira. As regras e os pontos seguem o Guia do Jogador.

## 1.1.0 — Guia do Jogador
- **Clãs:** Banu Haqim, Hecata, Lasombra, Ministério, Ravnos, Salubri e Tzimisce, com Perdição e Compulsão na ficha e na automação.
- **Tipos de Predador:** Extorsionista, Ladrão de Túmulos, Ceifador, Montero, Perseguidor e Alçapão.
- **Disciplinas:** 88 itens novos. São poderes novos em todas as Disciplinas e a Disciplina **Oblívio** completa, com as **Cerimônias**. Também entram 12 Rituais e 10 Fórmulas.
- **Vantagens e Defeitos:** os 60 do Guia, entre gerais, de Refúgio, Caitiff, Carniçal e Sangue-Ralo, além de Favores e Dívidas.
- **Variantes da Perdição:** 14 regras opcionais, uma por clã.
- **Coterie:** 49 Qualidades e Defeitos (de Coterie, de Domínio, de Coterie por clã, Favores e Dívidas de Coterie) e o Diário **Regras do Guia do Jogador**, com os 21 Tipos de Coterie.
- **Folhas de História:** as 7 Linhagens Hecata do Apêndice.
- **Erratas:** Hieros Gamos Profano passa ao nível 3. Osíris e Sacoleiro permitem Feitiçaria de Sangue também a Banu Haqim.
- **Correção:** a criação de personagem não aplicava o ponto de Feitiçaria de Sangue concedido por Clã ou Tipo de Predador. Agora o ponto é aplicado e o poder é escolhido.

## 1.0.0 — Manual Básico
- Compêndios do Manual Básico em português, validados contra o livro, e as ferramentas (ficha, criação de personagem, loja de XP, automação, cartões de rolagem e coterie).
