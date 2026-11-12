// Fundir la primera página recién leída (la que trae lo nuevo tras una señal de Realtime) con lo que la pantalla ya
// tiene cargado, sin saltar ni perder lo de «Ver más». Pura: sin I/O.
import type { Notificacion } from './notificacion'

// De más nuevo a más viejo: `(creado_en, id)` descendente, como lee la base.
function masNuevaPrimero(a: Notificacion, b: Notificacion): number {
  if (a.creadoEn !== b.creadoEn) {
    return a.creadoEn < b.creadoEn ? 1 : -1
  }
  return b.id - a.id
}

// Las filas frescas mandan sobre las cargadas con el mismo id (su estado cambió: leída, accionada). Una cargada que cae
// dentro del tramo que cubre la página fresca y no vino en ella ya no cumple el filtro (se accionó, o se purgó): se quita.
// Lo cargado más allá del tramo (lo de «Ver más») se conserva tal cual.
export function fundirPagina(
  cargadas: readonly Notificacion[],
  frescas: readonly Notificacion[],
  hayMasAlla: boolean,
): Notificacion[] {
  const ultima = frescas.at(-1)
  const frescasPorId = new Map(frescas.map((n) => [n.id, n]))
  const dentroDelTramo = (n: Notificacion) =>
    !hayMasAlla || ultima === undefined ? true : masNuevaPrimero(n, ultima) <= 0
  const conservadas = cargadas.filter((n) => !frescasPorId.has(n.id) && !dentroDelTramo(n))
  return [...frescas, ...conservadas].sort(masNuevaPrimero)
}

// Suma una página de «Ver más» al final sin repetir lo que una fusión ya trajo.
export function sumarPagina(
  cargadas: readonly Notificacion[],
  siguientes: readonly Notificacion[],
): Notificacion[] {
  const vistas = new Set(cargadas.map((n) => n.id))
  return [...cargadas, ...siguientes.filter((n) => !vistas.has(n.id))]
}
