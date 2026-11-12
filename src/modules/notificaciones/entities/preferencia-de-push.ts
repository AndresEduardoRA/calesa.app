// La preferencia de push es `preferencias_usuario(clave = 'notificaciones.push', valor = { "<tipo>": false })`: sólo
// guarda lo apagado; sin fila, todo está encendido (`push_disparar` sólo mira `valor -> tipo = false`).
export const CLAVE_DE_PREFERENCIA_DE_PUSH = 'notificaciones.push'

export type ApagadosDePush = Readonly<Record<string, false>>

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

// Del jsonb guardado: sólo cuentan las claves cuyo valor es exactamente `false`.
export function apagadosDesde(valor: unknown): ApagadosDePush {
  if (!esObjeto(valor)) return {}
  const apagados: Record<string, false> = {}
  for (const [tipo, encendido] of Object.entries(valor)) {
    if (encendido === false) apagados[tipo] = false
  }
  return apagados
}

export function estaEncendido(apagados: ApagadosDePush, tipo: string): boolean {
  return !Object.hasOwn(apagados, tipo)
}

// El valor que queda tras cambiar un tipo. `null` = ya no hay nada apagado: se borra la fila (vuelve a «todo encendido»).
export function conPreferencia(
  valorActual: unknown,
  tipo: string,
  encendido: boolean,
): ApagadosDePush | null {
  const apagados: Record<string, false> = { ...apagadosDesde(valorActual) }
  if (encendido) {
    delete apagados[tipo]
  } else {
    apagados[tipo] = false
  }
  return Object.keys(apagados).length === 0 ? null : apagados
}
