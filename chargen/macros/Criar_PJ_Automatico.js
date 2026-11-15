const NOME = ''
const SEMENTE = ''

try {
  const modulo = game.modules.get('vampiro-a-mascara-v5-ptbr')
  if (!modulo?.active || !modulo.api?.autoCreateCharacter) throw new Error('O módulo de Vampiro precisa estar ativo e atualizado.')
  const { actor, seed } = await modulo.api.autoCreateCharacter({ name: NOME, seed: SEMENTE })
  actor.sheet.render(true)
  ui.notifications.info(`Personagem criado. Semente: ${seed}`)
} catch (erro) {
  console.error('Falha ao criar personagem automático:', erro)
  ui.notifications.error(`Não foi possível criar o personagem: ${erro.message}`)
}
