// Quién abre la papelera de cotizaciones y quién restaura (4.24-2, P2 a y P10 del 4.24-1b). Lo decide la base; esto sólo elige qué se dibuja. Nada de
// React ni de Supabase.
import { puede, type Permisos } from '@/shared/lib/permisos'

import type { CotizacionDeLaHoja } from '../hoja-de-una-guardada'

// Envía cotizaciones a la papelera quien edita, modera o gestiona finales en algún origen (4.24-3). La action lo mira antes de llamar a la base; cuál de ellas
// puede, lo decide la base por cotización.
export function puedeEnviarCotizacionesALaPapelera(permisos: Permisos): boolean {
  return (
    puede(permisos, 'cotizaciones.editar') ||
    puede(permisos, 'cotizaciones.moderar') ||
    puede(permisos, 'cotizaciones.final.gestionar')
  )
}

// La abre quien puede enviar cotizaciones a la papelera o quien puede vaciarla: ve lo suyo o, con la clave de vaciarla, todo. Los lotes que le tocan los
// decide la base.
export function puedeAbrirLaPapeleraDeCotizaciones(permisos: Permisos): boolean {
  return (
    puedeEnviarCotizacionesALaPapelera(permisos) || puede(permisos, 'cotizaciones.papelera.purgar')
  )
}

// «Enviar a la papelera» en la guardada (4.24-3): el espejo de `_cotizacion_a_papelera()` sobre lo que la página ya leyó. Quien puede guardarla (la base ya miró
// editar por su alcance, o `final.gestionar` del origen en una final) o, en una preventa, quien modera en algún origen, como `tiene_permiso()` sin origen.
export function puedeEnviarLaCotizacion(
  cotizacion: Pick<CotizacionDeLaHoja, 'clase'>,
  puedeGuardar: boolean,
  permisos: Permisos,
): boolean {
  return (
    puedeGuardar || (cotizacion.clase === 'preventa' && puede(permisos, 'cotizaciones.moderar'))
  )
}

export function puedePurgarLaPapeleraDeCotizaciones(permisos: Permisos): boolean {
  return puede(permisos, 'cotizaciones.papelera.purgar')
}

// Restaura quien envió el lote o quien puede vaciar la papelera (P10): deshacer el propio envío no pide más.
export function puedeRestaurarElLote(lote: { esMio: boolean }, puedePurgar: boolean): boolean {
  return lote.esMio || puedePurgar
}
