'use client'

import { useRef, type ReactNode } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { referenciaDelVehiculo, type VehiculoElegido } from '../../../entities/panel-para-cotizar'
import { Miniatura } from '../../listado/components/miniatura'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_LISTA, PANEL_DEL_VEHICULO } from '../claves'
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
  // El «n» de «Cotizado (n)» («2», «20+»): cuántas cotizaciones del elegido ve quien mira, leído y escrito por la página al abrir la hoja (4.14-2b); null = no hay insignia.
  // Va como texto y no como `ConteoAcotado`: esta barra va en la carga en frío de la hoja y no importa `conteoCorto`. Sólo la insignia: no se mueve al guardar.
  cotizado: string | null
  // El historial del elegido, armado por la página (`src/app`): `vehiculos` no conoce `cotizaciones`. Va dentro del panel, en la región «Elegido».
  historial: ReactNode
}

// La barra del vehículo sobre la hoja de cotizar: una sola parada de Tab que abre el panel del vehículo (`?panel=vehiculo`). Va fuera de
// la hoja (`[data-hoja]`) y del componente que se vuelve a montar al cambiar de vehículo: elegir otro no la desmonta y el foco vuelve a ella.
export function BarraDelVehiculo(props: Props) {
  const { origenId, esSubasta, elegido, puedeVer, claveDeLaUrl, cotizado, historial } = props
  const panel = usePanelPorUrl(PANEL_DEL_VEHICULO, [
    CLAVE_DE_LISTA,
    CLAVE_DE_BUSQUEDA,
    CLAVE_DE_CURSOR,
  ])
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
          <>
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-medium text-(--color-ink)">{elegido.titulo}</span>
              <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
                {referenciaDelVehiculo(elegido)}
              </span>
            </span>
            {/* Una etiqueta propia y no `<Badge>`: éste arrastra Base UI a la carga en frío de la hoja (≈ 9 KB, medido en el 4.14-2b). */}
            {cotizado === null ? null : (
              <span className="inline-flex h-5 shrink-0 items-center rounded-4xl bg-(--color-surface-3) px-2 text-xs font-medium whitespace-nowrap text-(--color-ink)">
                Cotizado ({cotizado})
              </span>
            )}
          </>
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
          historial={historial}
          focoAlCerrar={boton}
        />
      ) : null}
    </div>
  )
}
