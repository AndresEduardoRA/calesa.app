'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_NIVEL,
  PANEL_ELIMINAR_NIVEL,
  MOTIVO_SIN_PERMISO_DE_NIVELES,
  motivoParaNoEliminarPorUrl,
  type NivelDeAcceso,
} from '../../../entities/nivel'

// La confirmación de «Eliminar» un nivel, en la URL (`?panel=eliminar-nivel&nivel=<id>`): se puede recargar y «atrás» la cierra. Se monta una vez
// en la lista, no una por fila. Un nivel que ya no está o que no se elimina (en uso, o de fábrica) no abre —se dice el motivo de la base y la URL
// se limpia, escrita a mano también—; mientras se va, el diálogo conserva el último que vio.
export function useEliminarNivelPorUrl(niveles: readonly NivelDeAcceso[], puedeGestionar: boolean) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_NIVEL, [CLAVE_DE_NIVEL])
  const id = url.valor(CLAVE_DE_NIVEL)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto
      ? puedeGestionar
        ? motivoParaNoEliminarPorUrl(niveles, id)
        : MOTIVO_SIN_PERMISO_DE_NIVELES
      : null,
    url.cerrar,
  )
  const vigente = url.abierto && !rechazada ? (niveles.find((n) => n.id === id) ?? null) : null
  const nivel = useUltimo(vigente)
  return {
    abierto: vigente !== null,
    nivel,
    abrir: (nivelId: string) => {
      url.abrir({ [CLAVE_DE_NIVEL]: nivelId })
    },
    cerrar: url.cerrar,
  }
}
