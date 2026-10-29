'use client'

import { useRef } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { referenciaDelVehiculo, type VehiculoElegido } from '../../../entities/panel-para-cotizar'
import { Miniatura } from '../../listado/components/miniatura'
import { CLAVE_DE_LISTA, PANEL_DEL_VEHICULO } from '../claves'
import { PanelDelVehiculoDiferido } from './diferidos'

type Props = {
  origenId: string
  // «Cierre subasta» sólo en un origen de subasta.
  esSubasta: boolean
  // El de la hoja; null = la hoja no tiene vehículo (o lo soltó: la hoja dice por qué).
  elegido: VehiculoElegido | null
  // `vehiculos.ver` del origen (lo decide la página con `puede()`); lo que protege es la base.
  puedeVer: boolean
  // La clave de la URL donde la hoja lleva su vehículo: este módulo no la conoce.
  claveDeLaUrl: string
}

// La barra del vehículo sobre la hoja de cotizar: una sola parada de Tab que abre el panel del vehículo (`?panel=vehiculo`). Va fuera de
// la hoja (`[data-hoja]`) y del componente que se vuelve a montar al cambiar de vehículo: elegir otro no la desmonta y el foco vuelve a ella.
export function BarraDelVehiculo({ origenId, esSubasta, elegido, puedeVer, claveDeLaUrl }: Props) {
  const panel = usePanelPorUrl(PANEL_DEL_VEHICULO, [CLAVE_DE_LISTA, CLAVE_DE_CURSOR])
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const boton = useRef<HTMLButtonElement>(null)
  if (!puedeVer) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        No puedes ver los vehículos de este origen.
      </p>
    )
  }
  return (
    <div className="min-w-0">
      <button
        ref={boton}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          panel.abrir()
        }}
        className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-2 text-left hover:bg-(--color-surface-3)"
      >
        <Miniatura ruta={elegido?.portadaRuta} className="w-12" />
        <span className="sr-only">Vehículo: </span>
        {elegido ? (
          <span className="grid min-w-0 flex-1">
            <span className="truncate font-medium text-(--color-ink)">{elegido.titulo}</span>
            <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
              {referenciaDelVehiculo(elegido)}
            </span>
          </span>
        ) : (
          <span className="flex-1 text-(--color-ink-soft)">Selecciona un vehículo</span>
        )}
      </button>
      {montado ? (
        <PanelDelVehiculoDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          origenId={origenId}
          esSubasta={esSubasta}
          elegido={elegido}
          claveDeLaUrl={claveDeLaUrl}
          focoAlCerrar={boton}
        />
      ) : null}
    </div>
  )
}
