// Quién ve «Emitir comprobante» y «Anular» en la guardada (4.26-2). Lo decide la base (`comprobante_emitir`, `comprobante_anular`, 4.26-1); esto sólo elige qué
// se dibuja y evita llamar a la base sin la clave. Nada de React ni de Supabase.
import { puede, type Permisos } from '@/shared/lib/permisos'

import type { CotizacionDeLaHoja } from '../hoja-de-una-guardada'
import type { ComprobanteDeLaCotizacion, EstadoDeLaCotizacion } from './comprobante'

// Emitir y anular piden la misma clave, global (P5 a; `por_origen` falso).
const CLAVE = 'cotizaciones.comprobantes.emitir'

// Se emite de una final activa sin comprobante vigente, con la clave. Ver la cotización y su versión los mira la base al confirmar.
export function puedeEmitirComprobante(
  cotizacion: Pick<CotizacionDeLaHoja, 'clase'> & { estado: EstadoDeLaCotizacion },
  permisos: Permisos,
  vigente: ComprobanteDeLaCotizacion | null,
): boolean {
  return (
    cotizacion.clase === 'final' &&
    cotizacion.estado === 'activa' &&
    vigente === null &&
    puede(permisos, CLAVE)
  )
}

// Las actions no llaman a la base sin la clave.
export function puedeEmitirComprobantes(permisos: Permisos): boolean {
  return puede(permisos, CLAVE)
}

export function puedeAnularComprobantes(permisos: Permisos): boolean {
  return puede(permisos, CLAVE)
}

// La sección «Comprobantes» se dibuja en una final o en una cotización que ya tiene alguno (una final que bajó a preventa con sólo anulados, P7 a).
export function seVenLosComprobantes(
  clase: CotizacionDeLaHoja['clase'],
  comprobantes: readonly ComprobanteDeLaCotizacion[],
): boolean {
  return clase === 'final' || comprobantes.length > 0
}
