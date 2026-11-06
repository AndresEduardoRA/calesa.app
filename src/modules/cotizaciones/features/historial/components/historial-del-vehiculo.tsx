'use client'

import { ChevronDownIcon } from 'lucide-react'
import { useId } from 'react'
import { conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'
import { Button } from '@/shared/ui/button'
import { useHistorialDelVehiculo } from '../hooks/use-historial-del-vehiculo'
import { ListaDelHistorial } from './lista-del-historial'

type Props = {
  vehiculoId: string
  // «Cotizado (n)», leído por el servidor al abrir la hoja: sólo le pone la etiqueta al botón. Puede estar viejo (guardar no vuelve a pedir la página), así que no
  // decide si hay historial: el botón está siempre y lo que muestra lo dice la lectura al desplegarlo.
  conteo: ConteoAcotado | null
}

// El historial de cotizaciones del vehículo elegido, dentro de su panel: plegado, y se lee al desplegarlo. «Ver más» agrega de a 20 hasta el tope.
export function HistorialDelVehiculo({ vehiculoId, conteo }: Props) {
  const historial = useHistorialDelVehiculo(vehiculoId)
  const id = useId()
  const etiqueta =
    conteo !== null && conteo.n > 0
      ? `Historial de cotizaciones (${conteoCorto(conteo)})`
      : 'Historial de cotizaciones'
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <Button
        type="button"
        variant="outline"
        aria-expanded={historial.abierto}
        aria-controls={id}
        onClick={historial.alternar}
        className="h-11 min-w-0 justify-between md:h-9"
      >
        <span className="truncate">{etiqueta}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className={historial.abierto ? 'size-4 shrink-0 rotate-180' : 'size-4 shrink-0'}
        />
      </Button>
      <div id={id} hidden={!historial.abierto} className="min-w-0">
        {historial.abierto ? (
          <ListaDelHistorial
            historial={historial}
            de={{ vehiculo: vehiculoId }}
            etiqueta="Historial de cotizaciones"
          />
        ) : null}
      </div>
    </div>
  )
}
