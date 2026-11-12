'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { rutaDelProyecto } from '../../../entities/proyectos/rutas'
import { eliminarProyecto } from '../actions/eliminar-proyecto'
import { restaurarProyecto } from '../actions/restaurar-proyecto'

type Args = { id: string; numero: number; actualizadoEn: string }

const MENSAJE_DE_VALIDACION = 'No se pudo cambiar el proyecto.'

// Eliminar un proyecto sin ítems (8.09-4, C9, D77): reversible, así que se hace de una vez y se avisa con «Deshacer» (no lleva `<Confirmar>`). Al eliminar el detalle ya no existe: se vuelve al
// listado. «Deshacer» lo restaura con el `eliminado_en` que devolvió la base y abre su detalle; si ya no se puede (otra persona lo cambió, o el vehículo tiene otro proyecto) dice el texto de la
// base. Si un ítem entró entretanto, la base lo rechaza con su texto («ciérralo en vez de eliminarlo»). Un solo envío a la vez.
export function useEliminarProyecto({ id, numero, actualizadoEn }: Args) {
  const { mandar, enCurso } = useUnEnvioALaVez()
  const router = useRouter()

  async function deshacer(eliminadoEn: string): Promise<void> {
    const envio = await enviarAccion(restaurarProyecto({ id, eliminadoEn }), MENSAJE_DE_VALIDACION)
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    avisarExito(`Proyecto #${String(numero)} restaurado.`)
    router.push(rutaDelProyecto(id) as Route)
  }

  async function eliminar(): Promise<void> {
    const envio = await mandar(() =>
      enviarAccion(eliminarProyecto({ id, actualizadoEn }), MENSAJE_DE_VALIDACION),
    )
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    avisarConDeshacer(`Proyecto #${String(numero)} eliminado.`, () => {
      void deshacer(envio.data.eliminadoEn)
    })
    router.push(RUTAS.repuestos as Route)
  }

  return { enCurso, eliminar }
}
