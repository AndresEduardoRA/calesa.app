'use client'

import { useState } from 'react'
import type { ResumenDeImpacto } from '@/shared/lib/campos'
import { avisarExito } from '@/shared/ui/toasts'
import type { AmbitoDeFlujo, RequisitoParaConfigurar } from '../../../entities/flujo'
import { resumenDeImpacto } from '../../../entities/requisitos/impacto'
import type { RequisitosDeLaFase } from './use-requisitos-de-la-fase'

type Pendiente = { requisitoId: string; resumen: ResumenDeImpacto }

// «Bloqueante» de un requisito, desde el interruptor de su fila. Apagarlo guarda directo. Encenderlo lee antes el impacto: si ninguna unidad de la fase queda
// fuera de regla guarda directo; si no, deja el aviso en línea (`pendiente`) hasta que se confirma o se cancela (estado local: recargar lo descarta y el
// requisito queda como estaba). Una escritura a la vez: el interruptor se apaga mientras `r.enCurso`.
export function useBloqueanteDeRequisito(
  r: RequisitosDeLaFase,
  ambito: AmbitoDeFlujo,
  faseNombre: string,
  prefijo: string,
) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  // Si la otra persona lo quitó mientras se leía el aviso, ya no hay nada que confirmar.
  const requisito = pendiente
    ? (r.requisitos.find((x) => x.id === pendiente.requisitoId) ?? null)
    : null

  const volverAlInterruptor = (id: string) =>
    setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-bloqueante="${prefijo}-${id}"]`)?.focus()
    }, 0)

  async function guardar(destino: RequisitoParaConfigurar, valor: boolean): Promise<boolean> {
    const envio = await r.guardar(destino.id, { bloqueante: valor })
    if (envio === null) {
      return false
    }
    if (!envio.ok) {
      r.rechazar(envio)
      return false
    }
    avisarExito(valor ? 'El requisito ahora es bloqueante.' : 'El requisito ahora es informativo.')
    return true
  }

  async function cambiar(destino: RequisitoParaConfigurar, valor: boolean) {
    if (!valor) {
      await guardar(destino, false)
      return
    }
    const envio = await r.leerImpacto(destino.id)
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      r.rechazar(envio)
      return
    }
    const resumen = resumenDeImpacto(envio.data, { ambito, faseNombre })
    if (resumen === null) {
      await guardar(destino, true)
      return
    }
    setPendiente({ requisitoId: destino.id, resumen })
  }

  async function confirmar() {
    if (requisito === null) {
      setPendiente(null)
      return
    }
    await guardar(requisito, true)
    setPendiente(null)
    volverAlInterruptor(requisito.id)
  }

  function cancelar() {
    if (pendiente) {
      volverAlInterruptor(pendiente.requisitoId)
    }
    setPendiente(null)
  }

  return {
    // El que espera confirmación (con su aviso), o `null`.
    pendiente: requisito && pendiente ? { requisito, resumen: pendiente.resumen } : null,
    cambiar,
    confirmar,
    cancelar,
  }
}
