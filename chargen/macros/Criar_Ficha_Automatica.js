try {
  const modulo = game.modules.get('vampiro-a-mascara-v5-ptbr')
  if (!modulo?.active || !modulo.api?.openAutoCreateDialog) throw new Error('O módulo de Vampiro precisa estar ativo e atualizado.')
  await modulo.api.openAutoCreateDialog()
} catch (erro) {
  console.error('Falha ao criar ficha automática:', erro)
  ui.notifications.error(`Não foi possível criar a ficha: ${erro.message}`)
}
