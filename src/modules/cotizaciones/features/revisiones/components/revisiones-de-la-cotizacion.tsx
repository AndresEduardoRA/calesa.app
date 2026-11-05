'use client'

import { HistoryIcon } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_DE_REVISIONES } from '../hooks/urls-de-revisiones'
import { PanelDeRevisionesDiferido } from './diferidos'

type Props = {
  cotizacionId: string
  numero: number
  // La versión de la cotización (`actualizadoEn`).
  version: string
}

// «Revisiones» de la cabecera de una guardada: su botón y su panel con URL (`?panel=revisiones`). Recargar lo abre, «atrás» lo cierra; el código del panel se pide la primera vez.
export function RevisionesDeLaCotizacion({ cotizacionId, numero, version }: Props) {
  const boton = useRef<HTMLButtonElement>(null)
  const panel = usePanelPorUrl(PANEL_DE_REVISIONES)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      <Button
        ref={boton}
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={() => {
          panel.abrir()
        }}
      >
        <HistoryIcon aria-hidden="true" className="size-4" />
        Revisiones
      </Button>
      {montar ? (
        <PanelDeRevisionesDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          cotizacionId={cotizacionId}
          numero={numero}
          version={version}
          botonDeRevisiones={boton}
        />
      ) : null}
    </>
  )
}
