'use client'

import { useMemo, type ComponentProps } from 'react'
import { useLectorDeOpciones } from '@/modules/cotizaciones/client'
import { BarraDelVehiculo, type ParaElegir } from '@/modules/vehiculos/pantallas/cotizar'

type Props = Omit<ComponentProps<typeof BarraDelVehiculo>, 'paraElegir'> & {
  // El dato del elegido que se elige entre las filas de una tabla de la hoja (4.14-2c3), sin el lector; null = ninguno.
  paraElegir: ParaElegir | null
  // La hoja abierta: las opciones se leen con ella (`cotizacion_tabla`), de la versión que se dibuja.
  abierta: string
}

// La barra del vehículo de la hoja con el lector de las opciones del dato del vehículo: `vehiculos` no conoce `cotizaciones` y una función no viaja del servidor al
// navegador, así que este componente de la página la arma con el hook de `cotizaciones/client` y se la pasa a la barra.
export function BarraDeLaHoja({ paraElegir, abierta, ...props }: Props) {
  const leerOpciones = useLectorDeOpciones({ origenId: props.origenId, abierta })
  const conLector = useMemo(
    () => (paraElegir === null ? null : { ...paraElegir, leerOpciones }),
    [paraElegir, leerOpciones],
  )
  return <BarraDelVehiculo {...props} paraElegir={conLector} />
}
