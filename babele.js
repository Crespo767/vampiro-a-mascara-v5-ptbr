// Registra no Babele as traducoes PT-BR dos compendios deste modulo.
Hooks.once('init', () => {
  if (!game.babele) return console.warn('vampiro-a-mascara-v5-ptbr | Babele nao esta ativo: os compendios aparecerao em ingles.')
  game.babele.register({ module: 'vampiro-a-mascara-v5-ptbr', lang: 'pt-BR', dir: 'lang/pt-BR/compendium' })
})
