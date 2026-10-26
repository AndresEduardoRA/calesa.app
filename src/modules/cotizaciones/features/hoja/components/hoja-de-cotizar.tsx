'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EstiloDeTonos, SimbolosDeXCell } from '@/shared/ui/xcell'
import type { RecalculoInicial } from '../../../entities/apertura'
import { seccionSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import { useHoja } from '../hooks/use-hoja'
import { ResumenDeHoja } from './resumen-de-hoja'
import { SeccionDeHoja } from './seccion-de-hoja'

type Props = {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  // El vehículo de la URL que la base no dejó usar: se calculó sin él.
  vehiculoSoltado: boolean
}

function avisoDelVehiculo(vehiculoSoltado: boolean, obligatorio: boolean, hay: boolean) {
  if (vehiculoSoltado) {
    return 'No se puede usar ese vehículo.'
  }
  return obligatorio && !hay ? 'Este origen pide un vehículo para guardar.' : null
}

// La hoja de cotizar: las secciones del diseño en su orden, cada celda con su `XCell`, y el resumen. Recalcula en la base 150 ms después de la última confirmación.
// No guarda: guardar es del 4.13-3. Los iconos y los tonos se montan una sola vez por hoja.
export function HojaDeCotizar({ hoja, inicial, vehiculoId, vehiculoSoltado }: Props) {
  const router = useRouter()
  const h = useHoja({ hoja, inicial, vehiculoId })
  const contexto = useMemo<ContextoDeHoja>(
    () => ({ indice: h.indice, entradas: h.entradas, respuesta: h.respuesta }),
    [h.indice, h.entradas, h.respuesta],
  )
  const dibujadas = hoja.secciones.filter((seccion) => seccionSeDibuja(seccion, contexto))
  // Puede cotizar en el origen pero su rol no ve ningún dato de la hoja (`cotizaciones.ver`): no hay nada que dibujar ni un total que dar.
  if (dibujadas.length === 0) {
    return (
      <EstadoSinPermiso
        titulo="No puedes ver esta hoja"
        descripcion="Tu rol puede cotizar en este origen, pero no ve los datos de su hoja. Pídeselo a quien administra los roles."
      />
    )
  }
  return (
    <div data-hoja="" className="@container grid min-w-0 gap-4">
      <SimbolosDeXCell />
      <EstiloDeTonos tonos={hoja.tonos} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 @5xl:grid-cols-2">
        {dibujadas.map((seccion) => (
          <SeccionDeHoja
            key={seccion.id}
            seccion={seccion}
            contexto={contexto}
            acciones={h.acciones}
          />
        ))}
      </div>
      <ResumenDeHoja
        tarjeta={hoja.tarjetaTotal}
        contexto={contexto}
        estado={h.estado}
        avisoDelVehiculo={avisoDelVehiculo(
          vehiculoSoltado,
          hoja.vehiculoObligatorio,
          vehiculoId !== null,
        )}
        alReintentar={h.reintentar}
        alRecargar={() => {
          router.refresh()
        }}
      />
    </div>
  )
}
