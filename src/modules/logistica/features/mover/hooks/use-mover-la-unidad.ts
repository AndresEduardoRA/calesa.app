'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  cambiarFase,
  ganarLaSubasta,
  estadoDelBoton,
  motivoLegible,
  type DestinoConVista,
} from '@/modules/flujos/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { enfocarElTituloDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { unidadAMover } from './unidad-a-mover'
import type { BorradorDeMover } from './use-borrador-de-mover'
import type { ModoGanada } from './use-modo-ganada'

const NO_SE_MOVIO = 'No pudimos mover la unidad.'

type Pedido = { faseDestino: string; faseEsperada: string | null; nota: string }

// «La ganamos» (con su modo y un vehículo) o el mover de siempre.
function enviarElPedido(unidad: UnidadAbierta, ganada: ModoGanada | null, pedido: Pedido) {
  if (ganada && unidad.tipo === 'vehiculo' && unidad.origenId !== null) {
    return ganarLaSubasta({ vehiculo: unidad.id, origenId: unidad.origenId, ...pedido })
  }
  return cambiarFase({ ...unidadAMover(unidad), ...pedido })
}

// Un rechazo de la base: el conflicto va al borrador (conserva la nota); requisitos, rol, nota o transición, como motivo junto al botón; lo demás, como fallo.
function tratarElRechazo(
  envio: { error: { codigo: string; mensaje: string }; porCampo?: Record<string, string> },
  args: { borrador: BorradorDeMover; destino: DestinoConVista; releer: () => void },
): { rechazo: string | null; fallo: string | null } {
  const campos = envio.porCampo ?? {}
  if (envio.error.codigo === 'conflicto') {
    args.borrador.decirConflicto(campos['conflicto'] ?? envio.error.mensaje)
    return { rechazo: null, fallo: null }
  }
  const codigo = Object.keys(campos)[0]
  if (codigo !== undefined && ['requisitos', 'rol', 'nota', 'transicion'].includes(codigo)) {
    args.releer()
    const motivo = { codigo, motivo: campos[codigo] ?? null }
    return { rechazo: motivoLegible(motivo, { faltan: args.destino.vista?.faltan }), fallo: null }
  }
  return { rechazo: null, fallo: envio.error.mensaje }
}

// Mover la unidad al destino abierto (6.04): el botón y su motivo salen de la vista previa y la nota; al enviar va con la fase en que se veía la unidad. Un conflicto se dice dentro del formulario
// con el nombre de quien se adelantó (nada se movió); un rechazo de requisitos, rol o nota relee la vista y su motivo aparece junto al botón. Al lograrlo, la pantalla se repinta (`router.refresh()`;
// en «La ganamos», quitando `?ganada` con `shallow: false`, sin un `router.refresh()` en la misma pasada).
export function useMoverLaUnidad(args: {
  unidad: UnidadAbierta
  destino: DestinoConVista
  puedeMover: boolean
  borrador: BorradorDeMover
  releer: () => void
}) {
  const { unidad, destino, puedeMover, borrador, releer } = args
  const router = useRouter()
  const [enCurso, setEnCurso] = useState(false)
  const [rechazo, setRechazo] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const estado = estadoDelBoton({
    puedeMover,
    vista: destino.vista,
    nota: borrador.nota,
    tipo: unidad.tipo,
  })

  const alLograrlo = () => {
    const ganada = borrador.ganada
    borrador.vaciar()
    if (ganada) {
      avisarExito(`La ganamos: ${unidad.titulo} pasó a «${destino.nombre}».`)
      ganada.quitar()
    } else {
      avisarExito(`${unidad.titulo} pasó a «${destino.nombre}».`)
      router.refresh()
    }
    enfocarElTituloDeLaUnidad()
  }

  const enviar = async () => {
    if (!estado.habilitado || enCurso) return
    setEnCurso(true)
    setRechazo(null)
    setFallo(null)
    const pedido = { faseDestino: destino.faseId, faseEsperada: unidad.faseId, nota: borrador.nota }
    const envio = await enviarAccion(enviarElPedido(unidad, borrador.ganada, pedido), NO_SE_MOVIO)
    setEnCurso(false)
    if (envio.ok) {
      alLograrlo()
      return
    }
    if ('sinRed' in envio) {
      avisarError(envio.error)
      return
    }
    const tratado = tratarElRechazo(envio, { borrador, destino, releer })
    setRechazo(tratado.rechazo)
    setFallo(tratado.fallo)
  }

  return {
    estado,
    enCurso,
    rechazo,
    fallo,
    enviar,
    recargar: () => {
      borrador.quitarConflicto()
      router.refresh()
      releer()
    },
  }
}
