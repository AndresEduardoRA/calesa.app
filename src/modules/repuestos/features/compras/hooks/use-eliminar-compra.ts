'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import type { CompraVersionada } from '../../../entities/compras/repositorio'
import { eliminarCompra } from '../actions/eliminar-compra'
import { restaurarCompra } from '../actions/restaurar-compra'

const MENSAJE_DE_VALIDACION = 'No se pudo leer la compra. Recarga y vuelve a intentar.'

// Eliminar una compra no pregunta (8.11-3, C14; D7): se hace y ofrece «Deshacer» 10 s, que la restaura con la versión que devolvió eliminar. La lista y el margen se
// actualizan por la revalidación de la action. Lo que la base rechaza (otra versión, el ítem eliminado al restaurar, el proyecto cerrado) se dice con su texto.
export function useEliminarCompra(proyectoId: string) {
  const [enCurso, setEnCurso] = useState(false)

  async function deshacer(eliminada: CompraVersionada) {
    const envio = await enviarAccion(
      restaurarCompra({
        id: eliminada.id,
        proyectoId,
        actualizadoEnEsperado: eliminada.actualizadoEn,
      }),
      MENSAJE_DE_VALIDACION,
    )
    if (envio.ok) {
      avisarExito('Compra restituida.')
    } else {
      avisarError(envio.error)
    }
  }

  async function eliminar(compra: FilaDeCompra) {
    if (enCurso) return
    setEnCurso(true)
    const envio = await enviarAccion(
      eliminarCompra({ id: compra.id, proyectoId, actualizadoEnEsperado: compra.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    const eliminada = envio.data
    avisarConDeshacer('Compra eliminada.', () => void deshacer(eliminada))
  }

  return { enCurso, eliminar }
}
