'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerEsperasDelVehiculo } from '../actions/leer-esperas'

const NO_SE_LEYO = 'No se pudieron leer los repuestos que espera este vehículo.'

// Los repuestos que espera un vehículo, para su hueco del panel (8.13-3, D10): se leen al abrir el bloque y otra vez si cambia la fase del vehículo. No escucha `logistica:unidad-cambio` (es de
// `logistica` y un área no la importa): mover un ítem pasa en otra pantalla y al volver al panel el hueco se monta de nuevo.
export function useEsperasDelVehiculo(unidad: { id: string; faseId: string | null }) {
  return useLecturaAlMontar(
    () => enviarAccion(leerEsperasDelVehiculo({ vehiculo: unidad.id }), NO_SE_LEYO),
    `${unidad.id}:${unidad.faseId ?? ''}`,
  )
}
