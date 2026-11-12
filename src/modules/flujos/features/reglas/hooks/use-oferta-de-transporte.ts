'use client'

import { useState } from 'react'
import { avisarExito } from '@/shared/ui/toasts'
import {
  borradorDe,
  cambioDeOferta,
  type BorradorDeOferta,
  type OfertaDeTransporte,
} from '../../../entities/reglas/oferta'
import type { EscrituraDeReglas } from './use-escritura-de-reglas'
import { usePedidosDeReglas } from './use-pedidos-de-reglas'

export type GrupoDeOferta = keyof BorradorDeOferta

// El borrador de la oferta de transporte: lo marcado todavía sin guardar. Vive en el cliente; quien lo monta le pone `key` con la firma de lo guardado,
// así que lo marcado sobrevive a encender o apagar otra regla y se reinicia sólo cuando lo guardado cambia de verdad.
export function useOfertaDeTransporte(
  flujoId: string,
  guardada: OfertaDeTransporte,
  escritura: EscrituraDeReglas,
) {
  const pedir = usePedidosDeReglas()
  const [borrador, setBorrador] = useState<BorradorDeOferta>(() => borradorDe(guardada))

  function marcar(grupo: GrupoDeOferta, id: string, marcada: boolean) {
    setBorrador((antes) => ({
      ...antes,
      [grupo]: marcada
        ? [...antes[grupo].filter((x) => x !== id), id]
        : antes[grupo].filter((x) => x !== id),
    }))
  }

  async function guardar() {
    const envio = await escritura.mandar(() =>
      pedir.guardarOferta(flujoId, escritura.ultimaVersion(), borrador),
    )
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    escritura.conocer(envio.data.version)
    avisarExito('Oferta de transporte guardada.')
  }

  return {
    borrador,
    hayCambio: cambioDeOferta(guardada, borrador),
    marcar,
    ofrecerTodos: () => setBorrador({ puertosOrigen: [], puertosDestino: [], navieras: [] }),
    guardar,
  }
}
