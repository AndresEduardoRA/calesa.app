'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import type { PedidoDeAlta, ResultadoDeAlta } from '../../../entities/repositorios'
import { crearLead } from '../actions/crear-lead'
import { MENSAJE_DE_VALIDACION } from '../resultado'

export type { Envio }

const enviar = (pedido: Parameters<typeof enviarAccion<ResultadoDeAlta>>[0]) =>
  enviarAccion(pedido, MENSAJE_DE_VALIDACION)

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
