'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { CLAVE_DEL_TIPO, PANEL_ELIMINAR_TIPO } from '../../../entities/documentos/tipo-de-documento'
import {
  buscarTipo,
  motivoParaNoEliminarPorUrl,
  type VistasDeGrupos,
} from '../../../entities/documentos/vista-de-grupo'

// La confirmación de «Eliminar» un tipo de documento, en la URL (`?panel=eliminar-tipo&tipo=<id>`): se puede recargar y «atrás» la cierra. Se monta
// una vez en la pantalla, no una por fila. Un tipo que ya no está, que no se puede cambiar o que ya tiene uso no abre (se avisa y la URL se limpia,
// escrita a mano también); mientras se va, el diálogo conserva el último que vio.
export function useEliminarTipoPorUrl(vistas: VistasDeGrupos) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_TIPO, [CLAVE_DEL_TIPO])
  const id = url.valor(CLAVE_DEL_TIPO)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto ? motivoParaNoEliminarPorUrl(vistas, id) : null,
    url.cerrar,
  )
  const vigente = url.abierto && !rechazada ? (buscarTipo(vistas, id)?.tipo ?? null) : null
  const tipo = useUltimo(vigente)
  return {
    abierto: vigente !== null,
    tipo,
    abrir: (tipoId: string) => {
      url.abrir({ [CLAVE_DEL_TIPO]: tipoId })
    },
    cerrar: url.cerrar,
  }
}
