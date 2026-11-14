// La situación real de un vehículo (`vehiculos.situacion`, la calcula la base): logística la lee para la tarjeta, el panel y la bandeja. Los valores
// son los de `SITUACIONES` de `vehiculos` (una entidad no importa otro módulo); `situacion.test.ts` los ata al `check` de la base. Una no ganada no
// llega a logística (no cuenta): de las otras, sólo «En subasta» y «Sin resolver» se dicen aparte de la fase.
import { z } from 'zod'

export const SITUACIONES_DE_LA_UNIDAD = ['en_subasta', 'sin_resolver', 'no_ganada', 'fase'] as const

export type SituacionDeLaUnidad = (typeof SITUACIONES_DE_LA_UNIDAD)[number]

// Una situación que la app no conoce no tumba la lectura: se lee como su fase.
export const esquemaDeSituacionDeLaUnidad = z.enum(SITUACIONES_DE_LA_UNIDAD).catch('fase')

const TEXTO: Partial<Record<SituacionDeLaUnidad, string>> = {
  en_subasta: 'En subasta',
  sin_resolver: 'Sin resolver',
  no_ganada: 'No ganada',
}

/** El texto de la situación cuando la subasta manda; `null` si la situación es su fase. */
export function textoDeSituacion(situacion: SituacionDeLaUnidad): string | null {
  return TEXTO[situacion] ?? null
}
