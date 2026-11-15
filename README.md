# Vampiro: A Máscara 5ª Edição — PT-BR para Foundry VTT

Módulo para o [Foundry VTT](https://foundryvtt.com) que traz em português os compêndios de **Vampiro: A Máscara 5ª Edição** e um conjunto de ferramentas para jogar no sistema [wod5e](https://foundryvtt.com/packages/wod5e). Entre as ferramentas estão a ficha de personagem, a criação de personagem, a loja de XP, a automação para o Narrador, os cartões de rolagem e a janela de coterie.

O conteúdo cobre dois livros: o **Manual Básico** e o **Guia do Jogador**.

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
| Folhas de História | 7 Linhagens Hecata do Guia do Jogador, uma pasta por Folha e um item por nível |
| Regras do Guia do Jogador | Diário com os 21 **Tipos de Coterie**, **Carniçais**, **Mortais**, **Sistemas de Coterie**, **Memoriam e Projetos** e **Regras Opcionais do Companion** |
| Equipamento | Armas, armaduras e equipamentos (ainda em inglês) |

### Ferramentas
- **Ficha de personagem**: ficha de vampiro reformulada, com Perdição e Compulsão do clã.
- **Criação de personagem**: assistente passo a passo que aplica sozinho o que o Clã e o Tipo de Predador concedem.
- **Loja de XP**: gasto de experiência com os custos do Manual Básico.
- **Automação**: aplicação de dano, testes resistidos, Compulsões e outras ajudas ao Narrador.
- **Cartões de rolagem**: cartões de chat reformulados.
- **Coterie**: janela do grupo, com Domínio (Chasse, Lien, Portillon), Antecedentes compartilhados, membros e equipamento. Ela abre pelo ícone de coroa na pasta de Atores.

## Sobre a tradução

- **Manual Básico**: os textos seguem a edição brasileira oficial e foram conferidos página a página contra o livro.
- **Companion**: os poderes e clãs que aparecem no Companion oficial em português (Ravnos, Salubri, Tzimisce e alguns poderes) usam a redação dele.
- **Guia do Jogador**: não existe edição oficial em português. Os itens que só aparecem no Guia têm **tradução própria**, com o vocabulário do Manual Básico, e são marcados no fim do texto com *"Tradução não oficial — Guia do Jogador, p. N"*. Alguns trechos tiveram leitura difícil; podem ser revistos em versões futuras.

Encontrou um erro de tradução ou de regra? Abra uma [issue](https://github.com/Crespo767/vampiro-a-mascara-v5-ptbr/issues) com o nome do item e a página do livro.

## Créditos

- **VtM5e Tools**, de Harbl: base das ferramentas e dos itens dos compêndios (licença MIT).
- **Vampire: The Masquerade 5e Compendium**, de Clownf1sh: base dos compêndios do Manual Básico.
- Sistema **wod5e**, de Veilza e colaboradores.
- Tradução, unificação e adaptação PT-BR: Crespo767.

## Aviso legal

Projeto de fã, gratuito e sem fins comerciais, sem vínculo com a Paradox Interactive, a World of Darkness, a Renegade Game Studios ou a Galápagos Jogos. *Vampiro: A Máscara*, *World of Darkness* e os textos de regras pertencem aos seus respectivos detentores de direitos. Este módulo serve para facilitar o jogo de quem tem os livros e não os substitui: compre os livros oficiais.

O código é distribuído sob a licença MIT (veja [LICENSE](LICENSE)); a licença não cobre o conteúdo dos livros.
