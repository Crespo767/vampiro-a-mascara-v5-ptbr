# Vampiro: A Máscara 5ª Edição — PT-BR para Foundry VTT

Módulo para o [Foundry VTT](https://foundryvtt.com) que traz em português os compêndios de **Vampiro: A Máscara 5ª Edição** e um conjunto de ferramentas para jogar no sistema [wod5e](https://foundryvtt.com/packages/wod5e). Entre as ferramentas estão a ficha de personagem, a criação de personagem, a loja de XP, a automação para o Narrador, os cartões de rolagem e a janela de coterie.

O conteúdo cobre dois livros: o **Manual Básico** e o **Guia do Jogador**.

## Criação automática de PJ

A macro **Criar Ficha Automática** abre um diálogo para escolher o tipo de ficha (Vampiro, Lobisomem, Caçador, Mortal, Carniçal, Personagem do Narrador, ou um Grupo: Coterie, Alcateia ou Célula). Ela está no compêndio **Macros**, na pasta "Vampiro a Máscara v5 PT-BR" da aba de Compêndios: arraste-a para a barra de macros ou importe-a. Nome e semente são opcionais e ficam no próprio diálogo (o código-fonte fica em `chargen/macros/Criar_Ficha_Automatica.js`). Uma semente informada reproduz as escolhas para os mesmos dados de compêndio. A macro abre a ficha e informa a semente; o resumo é enviado em mensagem privada. Requer o sistema wod5e, permissão para criar Atores e acesso à pasta de criação automática. O gerador escolhe as Disciplinas de clã e as Especializações gratuitas, respeita as restrições Caitiff e gasta 7 pontos de Vantagens, além dos pontos extras configurados pelo Narrador. Revise os textos e escolhas com o Narrador.

## Requisitos

| Item | Versão |
|---|---|
| Foundry VTT | 13 (testado na 13.350) |
| Sistema [wod5e](https://foundryvtt.com/packages/wod5e) | testado na 5.3.15 |
| Módulo [Babele](https://foundryvtt.com/packages/babele) | obrigatório (faz a tradução dos compêndios) |
| Módulo [libWrapper](https://foundryvtt.com/packages/lib-wrapper) | obrigatório |
| Idioma do Foundry | **Português (Brasil)** |

## Instalação

### Pelo Foundry (recomendado)
1. No Foundry, abra **Add-on Modules → Install Module**.
2. No campo **Manifest URL**, cole:
   ```
   https://github.com/Crespo767/vampiro-a-mascara-v5-ptbr/releases/latest/download/module.json
   ```
3. Clique em **Install**. O Foundry também oferece instalar o Babele e o libWrapper, se ainda não estiverem instalados.

Depois, o próprio Foundry avisa quando houver versão nova.

### Manual
1. Baixe o `module.zip` da [última release](https://github.com/Crespo767/vampiro-a-mascara-v5-ptbr/releases/latest).
2. Extraia a pasta dentro de `Data/modules/`. O caminho final deve ser `Data/modules/vampiro-a-mascara-v5-ptbr/module.json`.
3. Reinicie o Foundry.

### Ativar no mundo
1. Em **Configurações → Configurações Principais**, escolha o idioma **Português (Brasil)**.
2. Em **Gerenciar Módulos**, ative **Vampiro a Máscara v5 PT-BR**, **Babele** e **libWrapper**.
3. Recarregue o mundo.

Os compêndios aparecem na aba **Compêndios**, dentro da pasta *Vampiro a Máscara v5 PT-BR*.

## O que vem no módulo

### Compêndios
| Compêndio | Conteúdo |
|---|---|
| Clãs | 16: os 7 do Básico, os 7 do Guia do Jogador (Banu Haqim, Hecata, Lasombra, Ministério, Ravnos, Salubri, Tzimisce), Caitiff e Sangues-Ralos |
| Disciplinas | 209 poderes: todas as Disciplinas do Básico e do Guia, **Oblívio**, **Cerimônias**, Rituais de Feitiçaria de Sangue e Fórmulas de Alquimia Sangue-Ralo |
| Tipos de Predador | 16 (10 do Básico + 6 do Guia) |
| Potência de Sangue | 0 a 6+ |
| Vantagens e Defeitos | 210: Antecedentes, Qualidades e Defeitos gerais, de Refúgio, de Caitiff, de Carniçal e de Sangue-Ralo; Favores e Dívidas; **Variantes da Perdição**; Qualidades e Defeitos de **Coterie**, de **Domínio** e de Coterie por clã |
| Folhas de História | 32: as 25 do Manual Básico (Os Bahari, Golconda, Theo Bell, os Descendentes etc.) e as 7 do Guia do Jogador, uma pasta por Folha e um item por nível |
| Regras do Guia do Jogador | Diário com os 21 **Tipos de Coterie**, **Carniçais**, **Mortais**, **Sistemas de Coterie**, **Memoriam e Projetos**, **Regras Opcionais do Companion**, **Convicções e Pilares**, **Crônicas e Tipos de Jogo** e **Antagonistas** |
| Antagonistas do Guia do Jogador | 5 Atores prontos, com retratos: Szlachta, Vozhd, Cadáver sem Mente, Cadáver Agressivo e Servo Homuncular |
| Equipamento | Armas, armaduras e equipamentos (ainda em inglês) |
| Lobisomem: O Apocalipse | 177 itens do livro básico de Lobisomem: 11 Tribos, 5 Augúrios, 62 Dons (Inatos, por Augúrio e por Tribo), 23 Rituais e 76 Vantagens e Defeitos, com o texto das regras e a página |
| Caçador: A Revanche | 125 itens do livro básico de Caçador: 5 Credos, 7 Ímpetos, 12 Trunfos com 49 Distinções e 52 Vantagens e Defeitos, com o texto das regras e a página |
| Macros | A macro **Criar Ficha Automática** |

### Ferramentas
- **Ficha de personagem**: ficha de vampiro reformulada, com Perdição e Compulsão do clã.
- **Criação de personagem**: assistente passo a passo que aplica sozinho o que o Clã e o Tipo de Predador concedem. Abre sozinho quando um jogador sem personagem entra no mundo, ou pelo menu do cabeçalho da ficha ("Criação de Personagem").
- **Loja de XP**: gasto de experiência com os custos do Manual Básico, incluindo Rituais, Cerimônias e Fórmulas (nível × 3).
- **Automação**: aplicação de dano, testes resistidos, Compulsões e outras ajudas ao Narrador.
- **Cartões de rolagem**: cartões de chat reformulados.
- **Coterie**: janela do grupo, com Domínio (Chasse, Lien, Portillon), Antecedentes compartilhados, membros e equipamento. Ela abre pelo botão "Coterie" (com coroa) no topo da aba de Atores, ou pela coroa nas pastas que têm personagens de jogadores. A lista de desejos de cada jogador é um diário privado; para criá-la, o papel Jogador precisa da permissão "Criar Diários".

## Sobre a tradução

- **Manual Básico**: os textos seguem a edição brasileira oficial e foram conferidos página a página contra o livro.
- **Companion**: os poderes e clãs que aparecem no Companion oficial em português (Ravnos, Salubri, Tzimisce e alguns poderes) usam a redação dele.
- **Guia do Jogador**: não existe edição oficial em português. Os itens que só aparecem no Guia têm **tradução própria**, com o vocabulário do Manual Básico, conferida frase a frase com o original em inglês (versão 1.6.0). Eles são marcados no fim do texto com *"Tradução não oficial — Guia do Jogador, p. N"*. As descrições dos quatro Clãs do Guia (Banu Haqim, Hecata, Lasombra e Ministério) são resumos e trazem *"Descrição resumida não oficial"*.
- Os termos do Guia são traduções próprias conferidas com o original em inglês, não termos oficiais.

Encontrou um erro de tradução ou de regra? Abra uma [issue](https://github.com/Crespo767/vampiro-a-mascara-v5-ptbr/issues) com o nome do item e a página do livro.

## Política editorial

O módulo é uma ferramenta de apoio ao jogo e não substitui a leitura dos livros oficiais.

- **Regras necessárias para jogar** (Vantagens, Defeitos, Disciplinas, Tipos de Predador, Perdições, Compulsões, sistemas do Diário) aparecem completas e fiéis ao livro de origem.
- **Texto descritivo e narrativo** (ambientação, história, perfil dos Clãs) entra resumido, com redação própria. O módulo não incorpora seções narrativas completas dos livros além das apresentações de Clã que já vêm na base dos compêndios do Manual Básico e do Companion.
- **Identificação da fonte:** os Clãs de todas as fontes e os itens do Companion e do Guia do Jogador trazem a origem no fim do texto. O texto oficial em português leva *"Fonte: … Manual Básico / Companion, p. N"*, a tradução própria leva *"Tradução não oficial — Guia do Jogador, p. N"* e o resumo leva *"Descrição resumida não oficial — …"*. Os demais itens do Manual Básico seguem a edição oficial, sem rodapé.
- **Sem alterações mecânicas:** correções de texto não mudam IDs, tipos de Item, modificadores nem automações.
- Uma decisão editorial já fechada só é reaberta com uma fonte nova que a contradiga.

## Créditos

- **VtM5e Tools**, de Harbl: base das ferramentas e dos itens dos compêndios (licença MIT).
- **Vampire: The Masquerade 5e Compendium**, de Clownf1sh: base dos compêndios do Manual Básico.
- Sistema **wod5e**, de Veilza e colaboradores.
- Tradução, unificação e adaptação PT-BR: Crespo767.

## Aviso legal

Projeto de fã, gratuito e sem fins comerciais, sem vínculo com a Paradox Interactive, a World of Darkness, a Renegade Game Studios ou a Galápagos Jogos. *Vampiro: A Máscara*, *World of Darkness* e os textos de regras pertencem aos seus respectivos detentores de direitos. Este módulo serve para facilitar o jogo de quem tem os livros e não os substitui: compre os livros oficiais.

O código é distribuído sob a licença MIT (veja [LICENSE](LICENSE)); a licença não cobre o conteúdo dos livros.
