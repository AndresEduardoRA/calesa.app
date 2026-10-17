'use client'

import { useState } from 'react'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import type { EtapaGuardada } from '../../../entities/embudo'
import {
  MENSAJE_DE_OPORTUNIDAD_A_MOVER_NO_DISPONIBLE,
  motivoParaNoMover,
} from '../../../entities/oportunidad'
import type { PanelDeMovida } from './use-panel-de-movida'

// Lo que el modal necesita saber de la oportunidad que se mueve.
export type OportunidadAMover = {
  id: string
  titulo: string
  etapaId: string
  // Las etapas de su embudo, en orden.
  etapas: readonly EtapaGuardada[]
}

// Por qué la URL no se puede abrir (nulo = se puede), mientras está abierta.
function motivoDeLaUrl(panel: PanelDeMovida, encontrada: OportunidadAMover | null): string | null {
  return panel.abierto ? motivoParaNoMover(encontrada, encontrada?.etapas ?? [], panel.etapa) : null
}

// La última oportunidad que se vio, para que el modal no se vacíe mientras se va o si la eliminan con él abierto. `buscar()` arma
// un objeto nuevo en cada render (`useUltimo()` pide uno estable y entraría en un bucle): se compara por lo que dice, no por identidad.
function useUltima(encontrada: OportunidadAMover | null): OportunidadAMover | null {
  const firma = encontrada ? `${encontrada.id}|${encontrada.titulo}|${encontrada.etapaId}` : null
  const [ultima, setUltima] = useState<{ firma: string; valor: OportunidadAMover } | null>(null)
  if (encontrada !== null && firma !== null && firma !== ultima?.firma) {
    setUltima({ firma, valor: encontrada })
  }
  return encontrada ?? ultima?.valor ?? null
}

// Qué apertura es esta (nula = no hay nada que revisar).
function aperturaDeLaUrl(panel: PanelDeMovida, apertura: number): string | null {
  return panel.abierto
    ? `${String(apertura)}:${panel.oportunidad ?? ''}:${panel.etapa ?? ''}`
    : null
}

// Qué muestra el modal según la URL. Se revisa una vez, al llegar: una oportunidad que no está entre las cargadas, una etapa
// que no existe, en la que ya está o que no pide motivo no abren (se avisa y la URL se limpia, escrita a mano también). Si la
// oportunidad desaparece con el modal abierto (otra persona la eliminó), el modal sigue a la vista y dice por qué ya no mueve.
export function useModalDeMovida(
  panel: PanelDeMovida,
  buscar: (id: string) => OportunidadAMover | null,
) {
  const encontrada = panel.oportunidad === null ? null : buscar(panel.oportunidad)
  const apertura = useApertura(panel.abierto)
  const rechazada = useRevisionAlAbrir(
    aperturaDeLaUrl(panel, apertura),
    motivoDeLaUrl(panel, encontrada),
    panel.cerrar,
  )
  const oportunidad = useUltima(encontrada)
  const destino = oportunidad?.etapas.find((etapa) => etapa.id === panel.etapa) ?? null
  const quedoAtras = encontrada === null && oportunidad !== null
  return {
    abierto: panel.abierto && !rechazada && destino !== null,
    apertura,
    oportunidad,
    destino,
    noDisponible: panel.abierto && quedoAtras ? MENSAJE_DE_OPORTUNIDAD_A_MOVER_NO_DISPONIBLE : null,
    alCerrar: panel.cerrar,
  }
}
