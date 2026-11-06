'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError } from '@/shared/ui/toasts'
import type { Embudo, EtapaGuardada } from '../../../entities/embudo'
import type { Oportunidad, OportunidadDelLead } from '../../../entities/oportunidad'
import { estadoDeLaEtapa } from '../../../entities/tablero'
import { oportunidadDelLeadDesde } from '../../../entities/ventana-de-oportunidades'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { eliminarOportunidad } from '../actions/eliminar-oportunidad'
import { moverOportunidad } from '../actions/mover-oportunidad'
import { restaurarOportunidad } from '../actions/restaurar-oportunidad'
import {
  useVentanaDeOportunidades,
  type PaginaDeOportunidades,
} from './use-ventana-de-oportunidades'

// Las oportunidades de quien mira sobre el lead, en la pantalla. «Mover a…» se ve enseguida (vuelve si
// la base lo rechaza); eliminar las saca y ofrece «Deshacer» 10 s. Lo que trae el servidor manda. Lo que vuelve de una action
// se pone en su lugar con la respuesta, sin `router.refresh()`: releería la primera página y reiniciaría lo cargado.
export function useOportunidades(
  leadId: string,
  inicial: PaginaDeOportunidades,
  embudos: readonly Embudo[],
) {
  const router = useRouter()
  const ventana = useVentanaDeOportunidades(leadId, inicial)
  const mover = useAction(moverOportunidad)
  const eliminar = useAction(eliminarOportunidad)
  const restaurar = useAction(restaurarOportunidad)
  const [ocupada, setOcupada] = useState<string | null>(null)

  // La respuesta de una action, en su lugar. Si la sección no tiene su embudo, la única salida es leer de nuevo.
  function ponerRespuesta(oportunidad: Oportunidad) {
    const puesta = oportunidadDelLeadDesde(oportunidad, embudos)
    if (puesta) {
      ventana.poner(puesta)
    } else {
      router.refresh()
    }
  }

  async function moverA(o: OportunidadDelLead, etapa: EtapaGuardada, motivo: string | null) {
    setOcupada(o.id)
    ventana.cambiarEnSitio(o.id, (x) => ({
      ...x,
      etapaId: etapa.id,
      etapa,
      estado: estadoDeLaEtapa(etapa),
    }))
    const envio = await enviarAccion(
      mover.executeAsync({
        id: o.id,
        etapaEsperada: o.etapaId,
        etapa: etapa.id,
        motivoPerdida: motivo,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setOcupada(null)
    if (!envio.ok) {
      ventana.poner(o)
      avisarError(envio.error)
      return false
    }
    ponerRespuesta(envio.data.oportunidad)
    return true
  }

  async function quitar(o: OportunidadDelLead) {
    ventana.quitar(o.id)
    const envio = await enviarAccion(
      eliminar.executeAsync({ id: o.id, actualizadoEnEsperado: o.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      ventana.poner(o)
      avisarError(envio.error)
      return
    }
    const version = envio.data.oportunidad.actualizadoEn
    avisarConDeshacer(`Se eliminó «${o.titulo}».`, () => {
      void enviarAccion(
        restaurar.executeAsync({ id: o.id, actualizadoEnEsperado: version }),
        MENSAJE_DE_VALIDACION,
      ).then((vuelta) => {
        if (vuelta.ok) {
          ponerRespuesta(vuelta.data.oportunidad)
        } else {
          avisarError(vuelta.error)
        }
      })
    })
  }

  return { ...ventana, moverA, quitar, ocupada, alGuardar: ponerRespuesta }
}
