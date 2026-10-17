'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_VINCULADO,
  PANEL_DESVINCULAR,
  motivoParaNoDesvincular,
  type VehiculoVinculado,
} from '../../../entities/vehiculos-del-lead'

// La confirmación de desvincular en la ficha del lead (`?panel=desvincular&vinculado=<id>`): se puede recargar y «atrás» la
// cierra. Sólo la pide quien no podría volver a vincular (sin la cartera del lead): quien sí desvincula con «Deshacer» y, para
// él, la URL no abre nada. Un vehículo que ya no está vinculado no abre (se avisa y la URL se limpia, escrita a mano también);
// mientras se va, el diálogo conserva el último que vio.
export function useDesvincularPorUrl(
  vinculados: readonly VehiculoVinculado[],
  pideConfirmar: boolean,
) {
  const url = usePanelPorUrl(PANEL_DESVINCULAR, [CLAVE_DE_VINCULADO])
  const id = url.valor(CLAVE_DE_VINCULADO)
  const revisa = url.abierto && pideConfirmar
  const apertura = useApertura(revisa)
  const rechazada = useRevisionAlAbrir(
    revisa ? `${String(apertura)}:${id ?? ''}` : null,
    revisa ? motivoParaNoDesvincular(vinculados, id) : null,
    url.cerrar,
  )
  const vigente = revisa && !rechazada ? (vinculados.find((v) => v.id === id) ?? null) : null
  const vehiculo = useUltimo(vigente)
  return {
    abierto: vigente !== null,
    vehiculo,
    abrir: (vehiculoId: string) => {
      url.abrir({ [CLAVE_DE_VINCULADO]: vehiculoId })
    },
    cerrar: url.cerrar,
  }
}
