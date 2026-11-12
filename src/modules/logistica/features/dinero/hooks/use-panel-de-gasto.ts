'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { Gasto } from '../../../entities/dinero/gasto'
import {
  CLAVE_DE_GASTO,
  GASTO_NUEVO,
  gastoDeLaUrl,
  motivoParaNoAbrirGasto,
  PANEL_GASTO,
} from '../../../entities/dinero/paneles'

// El formulario de un gasto en la URL (`?panel=gasto&gasto=<id|nuevo>`): se puede recargar y «atrás» lo cierra. «Registrar» abre con `nuevo`; «Editar», con el id de uno de la lista. Un id que no está
// (se eliminó, o se escribió a mano) no abre: se avisa y la URL se limpia, una vez, con la lista ya leída. Sólo se abre si `puedeEditar`.
export function usePanelDeGasto(gastos: readonly Gasto[] | null, puedeEditar: boolean | null) {
  const url = usePanelPorUrl(PANEL_GASTO, [CLAVE_DE_GASTO])
  const valor = url.valor(CLAVE_DE_GASTO)
  const apertura = useApertura(url.abierto)
  const editado = gastoDeLaUrl(gastos, valor)
  const revisar = url.abierto && gastos !== null && puedeEditar !== null
  const rechazada = useRevisionAlAbrir(
    revisar ? `${String(apertura)}:${valor ?? ''}` : null,
    revisar
      ? motivoParaNoAbrirGasto({ valor, encontrado: editado, puedeEditar, admiteNuevo: true })
      : null,
    url.cerrar,
  )
  const abierto = revisar && !rechazada
  // Mientras se va, el panel conserva el último gasto que mostró.
  const ultimo = useUltimo(abierto ? editado : null)
  return {
    abierto,
    apertura,
    nuevo: valor === GASTO_NUEVO,
    original: abierto ? editado : ultimo,
    abrirNuevo: () => {
      url.abrir({ [CLAVE_DE_GASTO]: GASTO_NUEVO })
    },
    abrirEdicion: (id: string) => {
      url.abrir({ [CLAVE_DE_GASTO]: id })
    },
    cerrar: url.cerrar,
  }
}
