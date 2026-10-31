'use client'

import { useRef } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja } from '../../../entities/hoja'
import { hayDatosPorRevisar, titulosDeAvanzado } from '../../../entities/presentacion-de-la-hoja'
import type { AyudaDeLaHoja } from '../hooks/use-ayuda-de-la-hoja'
import { PANEL_DE_AVANZADO } from '../hooks/urls-de-la-hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { BotonDeAvanzado } from './boton-de-avanzado'
import { ModalDeAvanzadoDiferido } from './diferidos'

type Props = {
  secciones: SeccionDeHoja[]
  contexto: ContextoDeHoja
  acciones: AccionesDeHoja
  guardando: boolean
  ayuda: AyudaDeLaHoja
}

// «Avanzado» de la hoja: su botón y su modal con URL (`?panel=avanzado`). Recargar lo abre, «atrás» lo cierra; el código del modal se pide la primera vez que se abre.
export function AvanzadoDeLaHoja({ secciones, contexto, acciones, guardando, ayuda }: Props) {
  const boton = useRef<HTMLButtonElement>(null)
  const panel = usePanelPorUrl(PANEL_DE_AVANZADO)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      <BotonDeAvanzado
        boton={boton}
        titulos={titulosDeAvanzado(secciones)}
        porRevisar={hayDatosPorRevisar(secciones, contexto)}
        alAbrir={panel.abrir}
      />
      {montar ? (
        <ModalDeAvanzadoDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          secciones={secciones}
          contexto={contexto}
          acciones={acciones}
          guardando={guardando}
          ayuda={ayuda}
          botonDeAvanzado={boton}
        />
      ) : null}
    </>
  )
}
