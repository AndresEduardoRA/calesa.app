'use client'

import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { CierreDeProyecto } from '../../../entities/proyectos/repositorio'
import { cerrarProyecto } from '../actions/cerrar-proyecto'
import { reabrirProyecto } from '../actions/reabrir-proyecto'

type Args = { id: string; numero: number; actualizadoEn: string }

const MENSAJE_DE_VALIDACION = 'No se pudo cambiar el proyecto.'

// Cerrar y reabrir un proyecto (8.09-2, C3, D56): reversible, así que se hace de una vez y se avisa con «Deshacer», que llama a la acción contraria con la versión que devolvió la
// primera. Un solo envío a la vez. Un conflicto (otra persona lo cambió) o «ya está cerrado» se dicen con el texto de la base y la pantalla se renueva con la versión nueva.
export function useCierreDeProyecto({ id, numero, actualizadoEn }: Args) {
  const { mandar, enCurso } = useUnEnvioALaVez()
  const [version, setVersion] = useState(actualizadoEn)
  const [versionDelServidor, setVersionDelServidor] = useState(actualizadoEn)
  // La pantalla se renovó con otra versión (recargar, otra persona): vale la nueva.
  if (versionDelServidor !== actualizadoEn) {
    setVersionDelServidor(actualizadoEn)
    setVersion(actualizadoEn)
  }

  async function cambiar(
    cerrar: boolean,
    versionVista: string,
    esDeshacer: boolean,
  ): Promise<void> {
    const envio: Envio<CierreDeProyecto> | null = await mandar(() =>
      enviarAccion(
        (cerrar ? cerrarProyecto : reabrirProyecto)({ id, actualizadoEn: versionVista }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    setVersion(envio.data.actualizadoEn)
    if (esDeshacer) {
      avisarExito(
        cerrar ? `Proyecto #${String(numero)} cerrado.` : `Proyecto #${String(numero)} abierto.`,
      )
      return
    }
    if (cerrar) {
      avisarConDeshacer(`Proyecto #${String(numero)} cerrado.`, () => {
        void cambiar(false, envio.data.actualizadoEn, true)
      })
    } else {
      avisarConDeshacer(`Proyecto #${String(numero)} abierto.`, () => {
        void cambiar(true, envio.data.actualizadoEn, true)
      })
    }
  }

  return {
    enCurso,
    cerrar: () => cambiar(true, version, false),
    reabrir: () => cambiar(false, version, false),
  }
}
