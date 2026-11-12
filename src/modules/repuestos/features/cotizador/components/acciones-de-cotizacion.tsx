'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { Button } from '@/shared/ui/button'
import { avisarExito } from '@/shared/ui/toasts'
import { aceptarCotizacion } from '../actions/aceptar-cotizacion'
import { anularCotizacion } from '../actions/anular-cotizacion'
import { useAceptarPorUrl, useAnularPorUrl } from '../hooks/use-confirmacion-de-cotizacion-por-url'
import { ConfirmarAceptar } from './confirmar-aceptar'
import { ConfirmarAnular } from './confirmar-anular'

type Props = {
  cotizacion: {
    id: string
    numero: number
    total: string | null
    moneda: string
    actualizadoEn: string
  }
  proyectoId: string
  // `undefined`: sin «Aceptar» (la hoja de lectura). `null`: se puede. Un texto: apagado con ese motivo (D47).
  motivoParaNoAceptar?: string | null
  sinGuardar?: boolean
}

const MENSAJE_DE_VALIDACION = 'No se pudo leer la cotización. Recarga la página.'

// «Aceptar» y «Anular» de una cotización de repuestos (8.12-4, C13), cada uno con su confirmación en la URL. Tras la acción la página se relee (la
// action revalida la ruta): una aceptada o anulada se ve en sólo lectura.
export function AccionesDeCotizacion({
  cotizacion,
  proyectoId,
  motivoParaNoAceptar,
  sinGuardar = false,
}: Props) {
  const aceptar = useAceptarPorUrl(motivoParaNoAceptar ?? null)
  const anular = useAnularPorUrl()
  const pedido = { id: cotizacion.id, proyectoId, actualizadoEn: cotizacion.actualizadoEn }
  const numero = String(cotizacion.numero)

  async function alAceptar(): Promise<ErrorApp | null> {
    const envio = await enviarAccion(aceptarCotizacion(pedido), MENSAJE_DE_VALIDACION)
    if (!envio.ok) return envio.error
    avisarExito(`Cotización #${numero} aceptada.`)
    return null
  }

  async function alAnular(): Promise<ErrorApp | null> {
    const envio = await enviarAccion(anularCotizacion(pedido), MENSAJE_DE_VALIDACION)
    if (!envio.ok) return envio.error
    avisarExito(`Cotización #${numero} anulada.`)
    return null
  }

  return (
    <>
      {motivoParaNoAceptar === undefined ? null : (
        <div className="flex flex-wrap items-center gap-2">
          {motivoParaNoAceptar ? (
            <span className="text-(length:--text-sm) text-(--color-ink-soft)">
              {motivoParaNoAceptar}
            </span>
          ) : null}
          <Button type="button" disabled={motivoParaNoAceptar !== null} onClick={aceptar.abrir}>
            Aceptar
          </Button>
        </div>
      )}
      <Button type="button" variant="outline" onClick={anular.abrir}>
        Anular
      </Button>
      <ConfirmarAceptar
        abierto={aceptar.abierto}
        alCerrar={aceptar.cerrar}
        numero={cotizacion.numero}
        total={cotizacion.total}
        moneda={cotizacion.moneda}
        alAceptar={alAceptar}
      />
      <ConfirmarAnular
        abierto={anular.abierto}
        alCerrar={anular.cerrar}
        numero={cotizacion.numero}
        sinGuardar={sinGuardar}
        alAnular={alAnular}
      />
    </>
  )
}
