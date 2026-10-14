'use client'

import { useAction } from 'next-safe-action/hooks'
import type { ErrorApp } from '@/shared/lib/errores'
import type { PedidoDeAlta, ResultadoDeAlta } from '../../../entities/repositorios'
import { crearLead } from '../actions/crear-lead'
import { MENSAJE_DE_VALIDACION, type ResultadoDelAlta } from '../resultado'

// Además de lo que devuelve la action: si el pedido ni siquiera llegó al servidor.
export type Envio = ResultadoDelAlta<ResultadoDeAlta> | { ok: false; error: ErrorApp; sinRed: true }

type Respuesta = { data?: ResultadoDelAlta<ResultadoDeAlta>; serverError?: ErrorApp } | undefined

// Una action que no llega al servidor no responde: su promesa falla (o vuelve vacía). Eso se
// distingue de un error del servidor, porque lo que no llegó se puede reintentar tal cual (el
// intento lleva su id: si SÍ llegó y se perdió la respuesta, tampoco duplica).
async function enviar(pedido: Promise<Respuesta>): Promise<Envio> {
  const sinRed: Envio = {
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

export function useCrearLead() {
  const accion = useAction(crearLead)
  return {
    crear: (pedido: PedidoDeAlta) =>
      enviar(
        accion.executeAsync({
          id: pedido.id,
          adoptar: pedido.adoptar,
          ...pedido.datos,
        }),
      ),
    enCurso: accion.isPending,
  }
}
