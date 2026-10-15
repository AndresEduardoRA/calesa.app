'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError } from '@/shared/ui/toasts'
import type { EtapaGuardada } from '../../../entities/embudo'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import { estadoDeLaEtapa } from '../../../entities/tablero'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { eliminarOportunidad } from '../actions/eliminar-oportunidad'
import { moverOportunidad } from '../actions/mover-oportunidad'
import { restaurarOportunidad } from '../actions/restaurar-oportunidad'

const firma = (lista: readonly OportunidadDelLead[]) =>
  lista.map((o) => `${o.id}:${o.actualizadoEn}`).join('|')

// Las oportunidades de quien mira sobre el lead, en la pantalla. «Mover a…» se ve enseguida (vuelve si
// la base lo rechaza); eliminar las saca y ofrece «Deshacer» 10 s. Lo que trae el servidor manda.
export function useOportunidades(inicial: readonly OportunidadDelLead[]) {
  const router = useRouter()
  const [vista, setVista] = useState(firma(inicial))
  const [lista, setLista] = useState<OportunidadDelLead[]>([...inicial])
  if (vista !== firma(inicial)) {
    setVista(firma(inicial))
    setLista([...inicial])
  }
  const mover = useAction(moverOportunidad)
  const eliminar = useAction(eliminarOportunidad)
  const restaurar = useAction(restaurarOportunidad)
  const [ocupada, setOcupada] = useState<string | null>(null)

  async function moverA(o: OportunidadDelLead, etapa: EtapaGuardada, motivo: string | null) {
    const antes = lista
    setOcupada(o.id)
    setLista((l) =>
      l.map((x) =>
        x.id === o.id ? { ...x, etapaId: etapa.id, etapa, estado: estadoDeLaEtapa(etapa) } : x,
      ),
    )
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
      setLista(antes)
      avisarError(envio.error)
      return false
    }
    router.refresh()
    return true
  }

  async function quitar(o: OportunidadDelLead) {
    const antes = lista
    setLista((l) => l.filter((x) => x.id !== o.id))
    const envio = await enviarAccion(
      eliminar.executeAsync({ id: o.id, actualizadoEnEsperado: o.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      setLista(antes)
      avisarError(envio.error)
      return
    }
    const version = envio.data.oportunidad.actualizadoEn
    avisarConDeshacer(`Se eliminó «${o.titulo}».`, () => {
      void enviarAccion(
        restaurar.executeAsync({ id: o.id, actualizadoEnEsperado: version }),
        MENSAJE_DE_VALIDACION,
      ).then((vuelta) => {
        if (!vuelta.ok) {
          avisarError(vuelta.error)
        }
        router.refresh()
      })
    })
    router.refresh()
  }

  return { lista, moverA, quitar, ocupada }
}
