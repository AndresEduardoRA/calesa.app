'use client'

import { useRef } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { ClienteElegido } from '../../../entities/panel-para-cotizar'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_CLASE, PANEL_DEL_CLIENTE } from '../claves'
import { PanelDelClienteDiferido } from './diferidos'

type Props = {
  // El de la hoja; null = la hoja no tiene lead (o la página lo soltó porque no existe o no se ve).
  elegido: ClienteElegido | null
  // `leads.ver` (lo decide la página con `puede()`); lo que protege es la base.
  puedeVer: boolean
  // `leads.numero_global.ver`: con él «#n» busca el número global y el propio de cualquier creador.
  numeroGlobal: boolean
  // `leads.crear` (lo decide la página con `puede()`): el panel ofrece «+», que abre «Nuevo lead».
  puedeCrear: boolean
  // La clave de la URL donde la hoja lleva su lead: este módulo no la conoce.
  claveDeLaUrl: string
}

// La barra del cliente sobre la hoja de cotizar: una sola parada de Tab que abre el panel del cliente (`?panel=cliente`). Va fuera de la hoja (`[data-hoja]`) y del
// componente que se vuelve a montar al cambiar de lead: elegir otro no la desmonta y el foco vuelve a ella. Sin `<Badge>` (arrastra Base UI a la carga en frío de la hoja).
export function BarraDelCliente({
  elegido,
  puedeVer,
  numeroGlobal,
  puedeCrear,
  claveDeLaUrl,
}: Props) {
  const panel = usePanelPorUrl(PANEL_DEL_CLIENTE, [
    CLAVE_DE_CLASE,
    CLAVE_DE_BUSQUEDA,
    CLAVE_DE_CURSOR,
  ])
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const boton = useRef<HTMLButtonElement>(null)
  if (!puedeVer) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">No puedes ver los leads.</p>
    )
  }
  return (
    <div className="min-w-0">
      <button
        ref={boton}
        type="button"
        aria-haspopup="dialog"
        // A este botón vuelve el foco al cerrar «Nuevo lead» abierto desde el «+» del panel (`marco-del-alta.tsx`): quien lo abrió ya no existe.
        data-elige={claveDeLaUrl}
        onClick={() => {
          panel.abrir()
        }}
        className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-2 text-left hover:bg-(--color-surface-3)"
      >
        <span className="sr-only">Cliente: </span>
        {elegido ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium text-(--color-ink)">
              {elegido.nombre}
            </span>
            <NumeroDeLead
              numeros={elegido.numeros}
              className="shrink-0 text-(length:--text-xs) text-(--color-ink-soft) tabular-nums"
            />
          </>
        ) : (
          <span className="flex-1 text-(--color-ink-soft)">Selecciona un cliente</span>
        )}
      </button>
      {montado ? (
        <PanelDelClienteDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          elegido={elegido}
          claveDeLaUrl={claveDeLaUrl}
          numeroGlobal={numeroGlobal}
          puedeCrear={puedeCrear}
          focoAlCerrar={boton}
        />
      ) : null}
    </div>
  )
}
