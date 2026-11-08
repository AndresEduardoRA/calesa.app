// Quién ve «Marcar final» en la guardada y por qué está apagado (4.25-2). Lo decide la base (`cotizacion_marcar_final`); esto sólo elige qué se dibuja. Nada de
// React ni de Supabase.
import { puede, type Permisos } from '@/shared/lib/permisos'

import type { CotizacionDeLaHoja } from '../hoja-de-una-guardada'

// Lo ve, en una preventa, quien gestiona finales en el origen de la cotización. La cartera del lead y las preventas que no puede mandar a la papelera no se
// adivinan: las dice la base al confirmar.
export function puedeMarcarLaFinal(
  cotizacion: Pick<CotizacionDeLaHoja, 'clase' | 'origenId'>,
  permisos: Permisos,
): boolean {
  return (
    cotizacion.clase === 'preventa' &&
    puede(permisos, 'cotizaciones.final.gestionar', cotizacion.origenId)
  )
}

// La action no llama a la base sin la clave en algún origen; el origen lo mira la base.
export function puedeMarcarFinales(permisos: Permisos): boolean {
  return puede(permisos, 'cotizaciones.final.gestionar')
}

// Por qué el botón queda apagado (nulo = se puede), en el orden de la base: primero el vehículo, después el lead. A quien no puede guardarla no se le pide
// que guarde.
export function motivoParaNoMarcar(
  cotizacion: Pick<CotizacionDeLaHoja, 'vehiculoId' | 'leadId'>,
  puedeGuardar: boolean,
): string | null {
  const falta =
    cotizacion.vehiculoId === null ? 'vehículo' : cotizacion.leadId === null ? 'cliente' : null
  if (falta === null) {
    return null
  }
  return puedeGuardar
    ? `Para marcarla final, elige el ${falta} y guarda.`
    : `Para marcarla final le falta el ${falta}: pídeselo a quien la cotizó.`
}
