'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_ORIGEN,
  PANEL_ELIMINAR_ORIGEN,
  motivoParaNoEliminarPorUrl,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'

// La confirmación de «Eliminar» un origen, en la URL (`?panel=eliminar-origen&origen=<id>`): se puede recargar y «atrás» la
// cierra. Se monta una vez en la lista, no una por fila. Un origen que ya no está o que ya tiene leads no abre (se avisa y la URL
// se limpia, escrita a mano también); mientras se va, el diálogo conserva el último que vio.
export function useEliminarOrigenPorUrl(origenes: readonly OrigenDeLeadConUso[]) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_ORIGEN, [CLAVE_DE_ORIGEN])
  const id = url.valor(CLAVE_DE_ORIGEN)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto ? motivoParaNoEliminarPorUrl(origenes, id) : null,
    url.cerrar,
  )
  const vigente = url.abierto && !rechazada ? (origenes.find((o) => o.id === id) ?? null) : null
  const origen = useUltimo(vigente)
  return {
    abierto: vigente !== null,
    origen,
    abrir: (origenId: string) => {
      url.abrir({ [CLAVE_DE_ORIGEN]: origenId })
    },
    cerrar: url.cerrar,
  }
}
