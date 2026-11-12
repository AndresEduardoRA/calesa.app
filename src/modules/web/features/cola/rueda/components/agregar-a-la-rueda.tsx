'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { MOTIVO_SIN_EQUIPO, type PersonaParaLaRueda } from '../../../../entities/cola/rueda'
import { usePanelAgregarALaRueda } from '../hooks/use-panel-agregar-a-la-rueda'
import { PanelAgregarALaRuedaDiferido } from './diferidos'

type Props = {
  // La página del equipo que se leyó con el panel abierto; nula si no se leyó.
  personas: readonly PersonaParaLaRueda[] | null
  hayMas: boolean
  errorDelEquipo: string | null
  // Buscar en el equipo pide `equipo.usuarios.ver` o `.gestionar`: sin eso, el botón va apagado y dice por qué.
  puedeVerEquipo: boolean
  puedeVerRoles: boolean
  hayMasEnElTablero: boolean
}

// «Agregar a la rueda» (8.04-3): el botón y su panel, que viaja diferido.
export function AgregarALaRueda({ puedeVerEquipo, ...resto }: Props) {
  const panel = usePanelAgregarALaRueda()
  const montar = useAbiertoAlgunaVez(panel.abierto)
  const apertura = useApertura(panel.abierto)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button className="h-11 md:h-8" disabled={!puedeVerEquipo} onClick={panel.abrir}>
        <PlusIcon aria-hidden />
        Agregar a la rueda
      </Button>
      {puedeVerEquipo ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{MOTIVO_SIN_EQUIPO}</p>
      )}
      {montar ? (
        <PanelAgregarALaRuedaDiferido
          key={apertura}
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          busqueda={panel.busqueda}
          buscando={panel.buscando}
          alBuscar={panel.buscar}
          {...resto}
        />
      ) : null}
    </div>
  )
}
