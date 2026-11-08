// La serie de comprobantes en los e2e (4.26-2 y 4.26-3). La serie vigente es una fila única (`comprobantes_ajustes`) y un comprobante frena el borrado de su
// cotización y de quien lo emitió (`restrict`): cada spec guarda la serie de antes, pone la suya y al terminar la devuelve y borra sus comprobantes y su contador.
// Antes de empezar se limpia lo que dejó una corrida que cayó a la mitad, para no romper los specs que vienen después.
import { literal, sql } from './sql'

export type SerieGuardada = { serie: string; actualizadoPor: string | null }

const PREFIJO = 'E2E-'

// Deja la base sin series de prueba: si la vigente es una de prueba vuelve a «A» (sin autor), y borra los comprobantes y contadores de las series pedidas.
export function limpiarSeriesDePrueba(series: readonly string[]): void {
  const lista = series.map(literal).join(', ')
  sql(`
    insert into public.comprobantes_contadores (serie, ultimo) values ('A', 0) on conflict do nothing;
    update public.comprobantes_ajustes set serie = 'A', actualizado_por = null where serie like ${literal(`${PREFIJO}%`)};
    delete from public.comprobantes where serie in (${lista});
    delete from public.comprobantes_contadores where serie in (${lista})`)
}

export function guardarSerie(): SerieGuardada {
  const [serie = 'A', actualizadoPor = ''] = sql(
    `select serie || '|' || coalesce(actualizado_por::text, '') from public.comprobantes_ajustes`,
  ).split('|')
  return { serie, actualizadoPor: actualizadoPor === '' ? null : actualizadoPor }
}

// Pone una serie de prueba como vigente, con su contador en cero: el próximo comprobante es «<serie>-1».
export function ponerSerie(serie: string): void {
  sql(`
    insert into public.comprobantes_contadores (serie, ultimo) values (${literal(serie)}, 0) on conflict (serie) do update set ultimo = 0;
    update public.comprobantes_ajustes set serie = ${literal(serie)}`)
}

// Devuelve la serie de antes y borra lo de las series de prueba (la vigente primero: el contador es su FK).
export function restaurarSerie(guardada: SerieGuardada, series: readonly string[]): void {
  const autor = guardada.actualizadoPor === null ? 'null' : literal(guardada.actualizadoPor)
  sql(
    `update public.comprobantes_ajustes set serie = ${literal(guardada.serie)}, actualizado_por = ${autor}`,
  )
  limpiarSeriesDePrueba(series)
}

export const serieVigente = (): string => sql('select serie from public.comprobantes_ajustes')

// Los comprobantes de una cotización como «S-N|anulado|motivo», del más viejo al más nuevo.
export function comprobantesDe(cotizacionId: string): string[] {
  return sql(`
    select serie || '-' || numero || '|' || (anulado_en is not null) || '|' || coalesce(motivo_anulacion, '')
    from public.comprobantes where cotizacion_id = ${literal(cotizacionId)} order by emitido_en, numero`)
    .split('\n')
    .filter((fila) => fila !== '')
}
