'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_TIPO_DE_SEGUIMIENTO,
  PANEL_ELIMINAR_TIPO_DE_SEGUIMIENTO,
  motivoParaNoEliminarPorUrl,
  type TipoDeSeguimientoConUso,
} from '../../../entities/tipo-de-seguimiento'

// La confirmación de «Eliminar» un tipo de seguimiento, en la URL (`?panel=eliminar-tipo-de-seguimiento&tipo-de-seguimiento=<id>`): se puede recargar y «atrás» la
// cierra. Se monta una vez en la lista, no una por fila. Un tipo que ya no está o que ya tiene seguimientos no abre (se avisa y la URL
// se limpia, escrita a mano también); mientras se va, el diálogo conserva el último que vio.
export function useEliminarTipoDeSeguimientoPorUrl(tipos: readonly TipoDeSeguimientoConUso[]) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_TIPO_DE_SEGUIMIENTO, [CLAVE_DE_TIPO_DE_SEGUIMIENTO])
  const id = url.valor(CLAVE_DE_TIPO_DE_SEGUIMIENTO)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto ? motivoParaNoEliminarPorUrl(tipos, id) : null,
    url.cerrar,
  )
  const vigente = url.abierto && !rechazada ? (tipos.find((o) => o.id === id) ?? null) : null
  const tipo = useUltimo(vigente)
  return {
    abierto: vigente !== null,
    tipo,
    abrir: (tipoId: string) => {
      url.abrir({ [CLAVE_DE_TIPO_DE_SEGUIMIENTO]: tipoId })
    },
    cerrar: url.cerrar,
  }
}
