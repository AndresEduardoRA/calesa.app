// Quién ve «Aprobar» en la guardada y por qué está apagado. Lo decide la base (`cotizacion_aprobar`); esto sólo elige qué se dibuja. Nada de React ni de Supabase.
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { CotizacionDeLaHoja } from '../hoja-de-una-guardada'
import type { MarcaDeLaGuardada } from './tipos'

export const SIN_VEHICULO = 'Para aprobarla, asígnale un vehículo.'
export const ES_INVALIDA = 'Una cotización inválida no se aprueba.'
export const SIN_LECTURA = 'No se pudo leer si está aprobada. Recarga para intentarlo.'

// Lo ve quien aprueba en el origen de la cotización. Que la vea (y el resto) lo dice la base al confirmar.
export function puedeAprobar(
  cotizacion: Pick<CotizacionDeLaHoja, 'origenId'>,
  permisos: Permisos,
): boolean {
  return puede(permisos, 'cotizaciones.aprobar', cotizacion.origenId)
}

// La action no llama a la base sin la clave en algún origen; el origen lo mira la base.
export function puedeAprobarAlguna(permisos: Permisos): boolean {
  return puede(permisos, 'cotizaciones.aprobar')
}

// Por qué el botón queda apagado (nulo = se puede), en el orden de la base: sin vehículo y después inválida. Sin la lectura de la marca no se adivina.
export function motivoParaNoAprobar(
  cotizacion: Pick<CotizacionDeLaHoja, 'vehiculoId'>,
  marca: Pick<MarcaDeLaGuardada, 'estado'> | null,
): string | null {
  if (marca === null) {
    return SIN_LECTURA
  }
  if (cotizacion.vehiculoId === null) {
    return SIN_VEHICULO
  }
  return marca.estado === 'invalida' ? ES_INVALIDA : null
}
