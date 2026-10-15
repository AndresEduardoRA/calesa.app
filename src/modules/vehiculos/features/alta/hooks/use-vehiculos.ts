'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import type { ValoresDeFormulario } from '../../../entities/formulario'
import { crearVehiculo } from '../actions/crear-vehiculo'
import { guardarVehiculo } from '../actions/guardar-vehiculo'
import { MENSAJE_DE_VALIDACION } from '../resultado'

const enviar = <Dato>(pedido: Parameters<typeof enviarAccion<Dato>>[0]) =>
  enviarAccion(pedido, MENSAJE_DE_VALIDACION)

export type { Envio }

// Las dos escrituras de la ficha de un vehículo.
export function useVehiculos() {
  const creando = useAction(crearVehiculo)
  const guardando = useAction(guardarVehiculo)
  return {
    crear: (pedido: {
      id: string
      origenId: string
      valores: ValoresDeFormulario
      // La consulta a apibara que llenó la ficha, si el alta vino de ahí.
      consulta?: string
    }) => enviar(creando.executeAsync(pedido)),
    guardar: (pedido: {
      id: string
      actualizadoEnEsperado: string
      valores: ValoresDeFormulario
    }) => enviar(guardando.executeAsync(pedido)),
    enCurso: creando.isPending || guardando.isPending,
  }
}
