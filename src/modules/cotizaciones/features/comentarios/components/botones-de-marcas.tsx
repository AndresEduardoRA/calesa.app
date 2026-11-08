'use client'

import { FlagIcon } from 'lucide-react'
import { buttonVariants } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { PANEL_REPORTAR } from '../../../entities/comentarios/marcas-url'
import type { AccionDeModerar } from '../../../entities/comentarios/moderacion'
import { useModeracionPorUrl } from '../hooks/use-moderacion-por-url'
import { ConfirmarModeracionDiferido, ModalDeReportarDiferido } from './diferidos-de-marcas'

const ETIQUETA_DE_LA_ACCION: Record<AccionDeModerar, string> = {
  invalidar: 'Invalidar…',
  descartar: 'Descartar los reportes…',
  reactivar: 'Reactivar…',
}

const BOTON = buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })

type Props = {
  cotizacionId: string
  numero: number
  // La versión de la página (el texto de la base): moderar la manda tal cual.
  actualizadoEn: string
  // El motivo del reporte de quien mira; nulo si no la reportó.
  miMotivo: string | null
  // Lo que quien mira puede moderar (vacío si no modera), calculado en el servidor.
  acciones: readonly AccionDeModerar[]
}

// «Reportar…» y las acciones de moderar de la guardada (4.27-4). Cada una abre su diálogo por la URL (`?panel=reportar`, `?panel=moderar&accion=…`); el modal y el
// Confirmar se cargan la primera vez que se abren.
export function BotonesDeMarcas({
  cotizacionId,
  numero,
  actualizadoEn,
  miMotivo,
  acciones,
}: Props) {
  const reportar = usePanelPorUrl(PANEL_REPORTAR)
  const moderacion = useModeracionPorUrl(acciones)
  const reportarMontado = useAbiertoAlgunaVez(reportar.abierto)
  const moderarMontado = useAbiertoAlgunaVez(moderacion.accion !== null)
  return (
    <>
      <button
        type="button"
        className={BOTON}
        onClick={() => {
          reportar.abrir()
        }}
      >
        <FlagIcon aria-hidden />
        {miMotivo === null ? 'Reportar…' : 'Reportaste esta cotización…'}
      </button>
      {acciones.map((accion) => (
        <button
          key={accion}
          type="button"
          className={BOTON}
          onClick={() => {
            moderacion.abrir(accion)
          }}
        >
          {ETIQUETA_DE_LA_ACCION[accion]}
        </button>
      ))}
      {reportarMontado ? (
        <ModalDeReportarDiferido
          abierto={reportar.abierto}
          alCerrar={reportar.cerrar}
          cotizacionId={cotizacionId}
          numero={numero}
          miMotivo={miMotivo}
        />
      ) : null}
      {moderarMontado ? (
        <ConfirmarModeracionDiferido
          accion={moderacion.accion}
          alCerrar={moderacion.cerrar}
          cotizacionId={cotizacionId}
          numero={numero}
          actualizadoEn={actualizadoEn}
        />
      ) : null}
    </>
  )
}
