// Las notas de un requisito (opcionales, hasta 500 caracteres): la regla es una sola para el dato, el documento, la espera y la edición. Espejo de
// `_requisito_validar()` (`…20261111222241_requisitos_crear.sql`). Sin I/O.
export const LARGO_MAXIMO_DE_LAS_NOTAS = 500
export const MENSAJE_DE_NOTAS_LARGAS = `Las notas tienen hasta ${String(LARGO_MAXIMO_DE_LAS_NOTAS)} caracteres.`

// Las notas ya sin los espacios de los bordes: `null` si quedaron vacías, `error` si pasan del largo (la base cuenta caracteres, no unidades UTF-16).
export function validarNotas(texto: string): { ok: true; valor: string | null } | { ok: false } {
  const recortado = texto.trim()
  if (Array.from(recortado).length > LARGO_MAXIMO_DE_LAS_NOTAS) {
    return { ok: false }
  }
  return { ok: true, valor: recortado === '' ? null : recortado }
}
