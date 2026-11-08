'use client'

import { ReceiptTextIcon } from 'lucide-react'
import { useRef } from 'react'
import { buttonVariants } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_EMITIR_COMPROBANTE } from '../../../entities/comprobantes/url'
import { ConfirmarEmitirComprobanteDiferido } from './diferidos'

type Props = {
  cotizacionId: string
  numero: number
  // La versión de la cotización que se ve (el texto de la base, tal cual).
  actualizadoEn: string
}

// El botón de «Emitir comprobante» (4.26-2), `outline` como «Marcar final», y su confirmación en `?panel=emitir-comprobante`: recargar lo abre, «atrás» lo
// cierra. Es un `<button>` con las clases de `<Button>` y el diálogo se pide al abrirse: el JS en frío de `/cotizaciones/[id]` está al tope.
export function BotonEmitirComprobante({ cotizacionId, numero, actualizadoEn }: Props) {
  const boton = useRef<HTMLButtonElement>(null)
  const url = usePanelPorUrl(PANEL_EMITIR_COMPROBANTE)
  const montar = useAbiertoAlgunaVez(url.abierto)
  return (
    <>
      <button
        ref={boton}
        type="button"
        className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
        onClick={() => {
          url.abrir()
        }}
      >
        <ReceiptTextIcon aria-hidden />
        Emitir comprobante
      </button>
      {montar ? (
        <ConfirmarEmitirComprobanteDiferido
          abierto={url.abierto}
          alCerrar={url.cerrar}
          cotizacionId={cotizacionId}
          numero={numero}
          actualizadoEn={actualizadoEn}
          focoAlCerrar={boton}
        />
      ) : null}
    </>
  )
}
