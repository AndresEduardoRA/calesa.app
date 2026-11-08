'use client'

import { useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_ANULAR_COMPROBANTE } from '../../../entities/comprobantes/url'
import { ModalDeAnularDiferido } from './diferidos'

// «Anular» en la fila del comprobante vigente (4.26-2), para quien tiene la clave, y su modal en `?panel=anular-comprobante`. La URL no lleva el id: hay a lo
// sumo un vigente (P2 a) y esta isla lo recibe del servidor. Sin vigente, la isla no se dibuja y el panel no abre nada.
export function AnularElVigente({
  comprobanteId,
  numero,
}: {
  comprobanteId: string
  numero: string
}) {
  const boton = useRef<HTMLButtonElement>(null)
  const url = usePanelPorUrl(PANEL_ANULAR_COMPROBANTE)
  const montar = useAbiertoAlgunaVez(url.abierto)
  return (
    <>
      <Button
        ref={boton}
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 md:min-h-8"
        onClick={() => {
          url.abrir()
        }}
      >
        Anular
      </Button>
      {montar ? (
        <ModalDeAnularDiferido
          abierto={url.abierto}
          alCerrar={url.cerrar}
          comprobanteId={comprobanteId}
          numero={numero}
          focoAlCerrar={() => boton.current ?? false}
        />
      ) : null}
    </>
  )
}
