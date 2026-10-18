'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_TIPO,
  PANEL_ELIMINAR_TIPO,
  motivoParaNoEliminarPorUrl,
  type TipoDeLeadConUso,
} from '../../../entities/tipo-de-lead'

// La confirmación de «Eliminar» un tipo, en la URL (`?panel=eliminar-tipo&tipo=<id>`): se puede recargar y «atrás» la
// cierra. Se monta una vez en la lista, no una por fila. Un tipo que ya no está o que ya tiene leads no abre (se avisa y la URL
// se limpia, escrita a mano también); mientras se va, el diálogo conserva el último que vio.
export function useEliminarTipoPorUrl(tipos: readonly TipoDeLeadConUso[]) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_TIPO, [CLAVE_DE_TIPO])
  const id = url.valor(CLAVE_DE_TIPO)
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
      url.abrir({ [CLAVE_DE_TIPO]: tipoId })
    },
    cerrar: url.cerrar,
  }
}
