'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { guardarBorradorDeEstado } from '@/shared/lib/borrador'
import type { RecalculoInicial } from '../../../entities/apertura'
import { claveDeLaHoja, claveDelBorrador } from '../../../entities/claves-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import { useGuardado } from '../hooks/use-guardado'
import { CotizacionGuardada } from './cotizacion-guardada'
import { HojaDeCotizar } from './hoja-de-cotizar'

type PropsDeLaHoja = {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  vehiculoSoltado: boolean
}

type Props = PropsDeLaHoja & { leadId: string | null }

// El marco de la hoja de cotizar (paso 4.13-3b): lleva lo que tiene que sobrevivir a que la hoja se vuelva a montar —el guardado con su pendiente y su aviso, y lo guardado—.
// Su `key` es la de la URL (origen, lead y vehículo); la de la hoja, la de la versión. **Mientras guarda congela las props de la hoja** (la instantánea entera): una action
// que renueva la cookie de la sesión vuelve a dibujar la página con otra hoja abierta, y la hoja no cambia a medio guardar. Al responder vuelve a seguirlas.
export function PantallaDeCotizar({ leadId, ...props }: Props) {
  const router = useRouter()
  const [vuelta, setVuelta] = useState(0)
  // Lo guardado ya está en la base: el borrador se va (también con «Cotizar otra»).
  const borrarElBorrador = () => {
    guardarBorradorDeEstado(
      window.sessionStorage,
      claveDelBorrador(props.hoja.origen.id, leadId, props.vehiculoId),
      {},
    )
  }
  const guardado = useGuardado({
    origenId: props.hoja.origen.id,
    leadId,
    vehiculoId: props.vehiculoId,
    alGuardar: borrarElBorrador,
  })
  const otraVuelta = () => {
    setVuelta((v) => v + 1)
  }
  const [vistas, setVistas] = useState<PropsDeLaHoja>(props)
  const congelada = guardado.estado.tipo === 'guardando'
  const cambiaron =
    vistas.hoja !== props.hoja ||
    vistas.inicial !== props.inicial ||
    vistas.vehiculoId !== props.vehiculoId ||
    vistas.vehiculoSoltado !== props.vehiculoSoltado
  if (!congelada && cambiaron) {
    setVistas(props)
  }
  const hoja = congelada ? vistas : props
  if (guardado.estado.tipo === 'guardada') {
    return (
      <CotizacionGuardada
        cotizacion={guardado.estado.cotizacion}
        fueReenvio={guardado.estado.fueReenvio}
        alCotizarOtra={() => {
          borrarElBorrador()
          guardado.reiniciar()
          router.refresh()
        }}
      />
    )
  }
  return (
    <HojaDeCotizar
      key={claveDeLaHoja({ formulaId: hoja.hoja.formula.id, vehiculoId: hoja.vehiculoId, vuelta })}
      {...hoja}
      leadId={leadId}
      guardado={guardado}
      alDescartar={otraVuelta}
    />
  )
}
