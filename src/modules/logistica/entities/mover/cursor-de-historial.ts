// El cursor del historial de una unidad (6.04-2): `(creado_en, id)` como el de `shared/lib/paginacion`, pero el `id` de `historial_fases` es un `bigint` y no un guid, así que no pasa por
// `leerCursor()`. Es opaco (base64url de `instante|id`) y se valida antes de usarlo: uno ilegible es la primera página. Sólo camina hacia lo más viejo.
export type CursorDeHistorial = { instante: string; id: number }

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/

export function codificarCursorDeHistorial(cursor: CursorDeHistorial): string {
  return btoa(`${cursor.instante}|${String(cursor.id)}`)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export function leerCursorDeHistorial(texto: string | null | undefined): CursorDeHistorial | null {
  if (!texto || !/^[A-Za-z0-9_-]{10,200}$/.test(texto)) return null
  let crudo: string
  try {
    crudo = atob(texto.replaceAll('-', '+').replaceAll('_', '/'))
  } catch {
    return null
  }
  const [instante, id, ...resto] = crudo.split('|')
  if (resto.length > 0 || !instante || !id || !INSTANTE.test(instante) || !/^\d{1,18}$/.test(id)) {
    return null
  }
  return { instante, id: Number(id) }
}
