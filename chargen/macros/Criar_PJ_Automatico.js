try {
  const modulo = game.modules.get('vampiro-a-mascara-v5-ptbr')
  if (!modulo?.active || !modulo.api?.openAutoCreateDialog) throw new Error('O módulo de Vampiro precisa estar ativo e atualizado.')
  await modulo.api.openAutoCreateDialog()
} catch (erro) {
  console.error('Falha ao criar personagem automático:', erro)
  ui.notifications.error(`Não foi possível criar o personagem: ${erro.message}`)
}
