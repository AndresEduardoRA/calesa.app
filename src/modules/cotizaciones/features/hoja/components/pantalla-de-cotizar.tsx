'use client'

import { useMemo, useState } from 'react'
import { guardarBorradorDeEstado } from '@/shared/lib/borrador'
import type { RecalculoInicial } from '../../../entities/apertura'
import { claveDeLaHoja, claveDelBorrador } from '../../../entities/claves-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import { useGuardado } from '../hooks/use-guardado'
import { useSoltarLoAbierto } from '../hooks/urls-de-la-hoja'
import { CotizacionGuardada } from './cotizacion-guardada'
import { HojaDeCotizar } from './hoja-de-cotizar'

type PropsDeLaHoja = {
  hoja: HojaLista
  inicial: RecalculoInicial
  vehiculoId: string | null
  vehiculoSoltado: boolean
}

type Props = PropsDeLaHoja & {
  leadId: string | null
  personaId: string
  // Los campos del vehículo que quien mira elige en el panel del vehículo (4.14-2c3), como lista: el documento no lleva un `Set`.
  seEligen?: readonly string[]
}

// El marco de la hoja de cotizar (paso 4.13-3b): lleva lo que tiene que sobrevivir a que la hoja se vuelva a montar —el guardado con su pendiente y su aviso, y lo guardado—.
// Su `key` es la de la URL (origen, lead y vehículo); la de la hoja, la de la versión. **Mientras guarda congela las props de la hoja** (la instantánea entera): una action
// que renueva la cookie de la sesión vuelve a dibujar la página con otra hoja abierta, y la hoja no cambia a medio guardar. Al responder vuelve a seguirlas.
export function PantallaDeCotizar({ leadId, personaId, seEligen, ...props }: Props) {
  const [vuelta, setVuelta] = useState(0)
  const clavesQueSeEligen = seEligen?.join('\u0000') ?? ''
  const elegibles = useMemo(
    () => (clavesQueSeEligen === '' ? undefined : new Set(clavesQueSeEligen.split('\u0000'))),
    [clavesQueSeEligen],
  )
  const deLaPestana = {
    personaId,
    origenId: props.hoja.origen.id,
    leadId,
    vehiculoId: props.vehiculoId,
  }
  const borrador = claveDelBorrador(deLaPestana)
  // Lo guardado ya está en la base: el borrador se va (también con «Cotizar otra»).
  const borrarElBorrador = () => {
    guardarBorradorDeEstado(window.sessionStorage, borrador, {})
  }
  const soltarLoAbierto = useSoltarLoAbierto()
  // Guardada, lo que la hoja tenía abierto (el modal «Avanzado», una ayuda) se va de la URL: «Cotizar otra» la vuelve a montar sin reabrirlo.
  const guardado = useGuardado({
    hoja: deLaPestana,
    alGuardar: () => {
      borrarElBorrador()
      soltarLoAbierto()
    },
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
  const clave = claveDeLaHoja({
    formulaId: hoja.hoja.formula.id,
    vehiculoId: hoja.vehiculoId,
    vuelta,
    abierta: hoja.hoja.abierta,
  })
  // Otra hoja (otra abierta, «Descartar»): el aviso del último guardado hablaba de la de antes. «Guardar con la N» nunca manda algo distinto de lo que se ve.
  const [claveVista, setClaveVista] = useState(clave)
  if (clave !== claveVista) {
    setClaveVista(clave)
    guardado.olvidarAviso()
  }
  if (guardado.estado.tipo === 'guardada') {
    return (
      <CotizacionGuardada
        cotizacion={guardado.estado.cotizacion}
        fueReenvio={guardado.estado.fueReenvio}
        // Sin pedir la página: la hoja vuelve vacía con la abierta que ya tiene. Pedirla traería otra y la volvería a montar a medio tipear.
        alCotizarOtra={() => {
          borrarElBorrador()
          guardado.reiniciar()
        }}
      />
    )
  }
  return (
    <HojaDeCotizar
      key={clave}
      {...hoja}
      leadId={leadId}
      seEligen={elegibles}
      borrador={{ clave: borrador, alDescartar: otraVuelta }}
      guardado={guardado}
    />
  )
}
