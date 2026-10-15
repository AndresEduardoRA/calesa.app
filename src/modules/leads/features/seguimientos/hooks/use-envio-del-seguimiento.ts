'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import type { ResultadoDeSeguimiento } from '../../../entities/repositorios'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearSeguimiento } from '../actions/crear-seguimiento'
import { guardarSeguimiento } from '../actions/guardar-seguimiento'
import type { PedidoDelRedactor } from './estado-del-redactor'

export type EnvioDeSeguimiento = Envio<ResultadoDeSeguimiento>

// La escritura del redactor. Distingue un pedido que no llegó al servidor (se reintenta tal cual: el
// alta lleva su id y guardar lo ya guardado no choca) de un error del servidor.
export function useEnvioDelSeguimiento() {
  const crear = useAction(crearSeguimiento)
  const guardar = useAction(guardarSeguimiento)
  return {
    enCurso: crear.isPending || guardar.isPending,
    enviar: (pedido: Extract<PedidoDelRedactor, { tipo: 'crear' | 'guardar' }>) =>
      enviarAccion<ResultadoDeSeguimiento>(
        pedido.tipo === 'crear'
          ? crear.executeAsync(pedido.pedido)
          : guardar.executeAsync(pedido.pedido),
        MENSAJE_DE_VALIDACION,
      ),
  }
}
