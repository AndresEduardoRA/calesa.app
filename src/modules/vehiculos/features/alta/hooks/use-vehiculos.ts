'use client'

import { useAction } from 'next-safe-action/hooks'
import type { ErrorApp } from '@/shared/lib/errores'
import type { ValoresDeFormulario } from '../../../entities/formulario'
import { crearVehiculo } from '../actions/crear-vehiculo'
import { guardarVehiculo } from '../actions/guardar-vehiculo'
import { MENSAJE_DE_VALIDACION, type ResultadoDeGuardar } from '../resultado'

// Además de lo que devuelve la action: si el pedido ni siquiera llegó al servidor.
export type Envio<Dato> = ResultadoDeGuardar<Dato> | { ok: false; error: ErrorApp; sinRed: true }

type Respuesta<Dato> = { data?: ResultadoDeGuardar<Dato>; serverError?: ErrorApp } | undefined

// Una action que no llega al servidor no responde: su promesa falla (o vuelve vacía). Eso se
// distingue de un error del servidor, porque lo que no llegó se puede reintentar tal cual.
async function enviar<Dato>(pedido: Promise<Respuesta<Dato>>): Promise<Envio<Dato>> {
  const sinRed: Envio<Dato> = {
    ok: false,
    sinRed: true,
    error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
  }
  try {
    const respuesta = await pedido
    if (!respuesta) {
      return sinRed
    }
    if (respuesta.serverError) {
      return { ok: false, error: respuesta.serverError }
    }
    return (
      respuesta.data ?? {
        ok: false,
        error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION },
      }
    )
  } catch {
    return sinRed
  }
}

// Las dos escrituras de la ficha de un vehículo.
export function useVehiculos() {
  const creando = useAction(crearVehiculo)
  const guardando = useAction(guardarVehiculo)
  return {
    crear: (pedido: {
      id: string
      origenId: string
      valores: ValoresDeFormulario
      // La respuesta de apibara que llenó la ficha, si el alta vino de ahí.
      apibara?: Record<string, unknown>
    }) => enviar(creando.executeAsync(pedido)),
    guardar: (pedido: {
      id: string
      actualizadoEnEsperado: string
      valores: ValoresDeFormulario
    }) => enviar(guardando.executeAsync(pedido)),
    enCurso: creando.isPending || guardando.isPending,
  }
}
