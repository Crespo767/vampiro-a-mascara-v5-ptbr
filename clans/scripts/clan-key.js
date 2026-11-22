const CLAN_NAME_ALIASES = new Map([
  ['malkavianos', 'malkavian'],
  ['ministério', 'ministry'],
  ['sangues-ralos', 'thin-blooded']
])

export function getClanKey (clan) {
  const name = clan?.flags?.babele?.originalName || clan?.originalName || clan?.name
  const key = name?.trim().toLocaleLowerCase('pt-BR')
  return CLAN_NAME_ALIASES.get(key) ?? key
}
