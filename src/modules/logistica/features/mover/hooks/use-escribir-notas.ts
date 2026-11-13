'use client'

import { crearNota, editarNota } from '../../../areas/mover/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'

const NO_SE_GUARDO = 'No pudimos guardar la nota.'

// Escribir y corregir las notas de la unidad (6.04-2). Cada una devuelve el motivo si no se pudo (el campo lo dice y conserva lo escrito) o `null` si quedó. Al lograrlo se avisa a los demás
// huecos de la unidad (D24): «Notas» se relee y «Qué falta» también, que es barato.
export function useEscribirNotas(
  unidad: Pick<UnidadAbierta, 'id' | 'origenId'> & { tipo?: UnidadAbierta['tipo'] },
) {
  async function crear(cuerpo: string): Promise<ErrorApp | null> {
    const envio = await enviarAccion(
      crearNota(
        unidad.tipo === 'repuesto'
          ? { repuesto: unidad.id, cuerpo }
          : { vehiculo: unidad.id, origenId: unidad.origenId ?? undefined, cuerpo },
      ),
      NO_SE_GUARDO,
    )
    if (!envio.ok) return envio.error
    avisarExito('Nota guardada.')
    avisarCambioDeLaUnidad(unidad.id)
    return null
  }
  async function editar(id: string, cuerpo: string): Promise<ErrorApp | null> {
    const envio = await enviarAccion(
      editarNota({ id, origenId: unidad.origenId, tipo: unidad.tipo ?? 'vehiculo', cuerpo }),
      NO_SE_GUARDO,
    )
    if (!envio.ok) return envio.error
    avisarExito('Nota corregida.')
    avisarCambioDeLaUnidad(unidad.id)
    return null
  }
  return { crear, editar }
}
