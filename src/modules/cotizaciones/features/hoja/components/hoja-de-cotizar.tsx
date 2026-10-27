'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EstiloDeTonos, SimbolosDeXCell } from '@/shared/ui/xcell'
import type { RecalculoInicial } from '../../../entities/apertura'
import { seccionSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import { FALTA_EL_VEHICULO } from '../../../entities/guardado'
import type { HojaLista } from '../../../entities/hoja'
import { claveDelBorrador } from '../../../entities/claves-de-la-hoja'
import type { Guardado } from '../hooks/use-guardado'
import { useGuardarLaHoja } from '../hooks/use-guardar-la-hoja'
import { useHoja } from '../hooks/use-hoja'
import { AvisoDeGuardado } from './aviso-de-guardado'
import { ResumenDeHoja } from './resumen-de-hoja'
import { SeccionDeHoja } from './seccion-de-hoja'

type Props = {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  // El vehículo de la URL que la base no dejó usar: se calculó sin él.
  vehiculoSoltado: boolean
  leadId: string | null
  guardado: Guardado
  // «Descartar» el borrador: el marco vuelve a montar la hoja vacía.
  alDescartar: () => void
}

function avisoDelVehiculo(vehiculoSoltado: boolean, faltaVehiculo: boolean) {
  if (vehiculoSoltado) {
    return 'No se puede usar ese vehículo.'
  }
  return faltaVehiculo ? FALTA_EL_VEHICULO : null
}

// La hoja de cotizar: las secciones del diseño en su orden, cada celda con su `XCell`, y el resumen. Recalcula en la base 150 ms después de la última confirmación.
// Guarda con `Ctrl/Cmd+S` o «Guardar» (el guardado vive en el marco, `useGuardado`): confirma la celda abierta, espera al total al día (P8) y arma el pedido con las
// entradas que ese recálculo calculó y la misma hoja abierta. Los iconos y los tonos se montan una sola vez por hoja.
export function HojaDeCotizar({
  hoja,
  inicial,
  vehiculoId,
  vehiculoSoltado,
  leadId,
  guardado,
  alDescartar,
}: Props) {
  const router = useRouter()
  const raiz = useRef<HTMLDivElement>(null)
  const h = useHoja({
    hoja,
    inicial,
    vehiculoId,
    alCambiar: guardado.olvidarAviso,
    borrador: { clave: claveDelBorrador(hoja.origen.id, leadId, vehiculoId), alDescartar },
  })
  const contexto = useMemo<ContextoDeHoja>(
    () => ({ indice: h.indice, entradas: h.entradas, respuesta: h.respuesta }),
    [h.indice, h.entradas, h.respuesta],
  )
  const faltaVehiculo = hoja.vehiculoObligatorio && vehiculoId === null
  const { boton, armar } = useGuardarLaHoja({
    h,
    contexto,
    hoja,
    leadId,
    vehiculoId,
    guardado,
    raiz,
  })
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
    <div ref={raiz} data-hoja="" className="@container grid min-w-0 gap-4">
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
        avisoDelVehiculo={avisoDelVehiculo(vehiculoSoltado, faltaVehiculo)}
        alReintentar={h.reintentar}
        alRecargar={router.refresh}
        guardar={boton}
        avisoDeGuardado={
          <AvisoDeGuardado
            estado={guardado.estado}
            hayPendiente={guardado.hayPendiente}
            enLinea={guardado.enLinea}
            alRecargar={router.refresh}
            alReintentar={() => {
              guardado.guardar(armar)
            }}
          />
        }
      />
    </div>
  )
}
