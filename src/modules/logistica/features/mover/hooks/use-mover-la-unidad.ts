'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  cambiarFase,
  estadoDelBoton,
  motivoLegible,
  type DestinoConVista,
} from '@/modules/flujos/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { enfocarElTituloDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { unidadAMover } from './unidad-a-mover'
import type { BorradorDeMover } from './use-borrador-de-mover'

const NO_SE_MOVIO = 'No pudimos mover la unidad.'

// Mover la unidad al destino abierto (6.04): el botón y su motivo salen de la vista previa y la nota; al enviar va con la fase en que se veía la unidad. Un conflicto se dice dentro del formulario
// con el nombre de quien se adelantó (nada se movió); un rechazo de requisitos, rol o nota relee la vista y su motivo aparece junto al botón. Al lograrlo, la pantalla se repinta (`router.refresh()`).
export function useMoverLaUnidad(args: {
  unidad: Unidad
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

  const enviar = async () => {
    if (!estado.habilitado || enCurso) return
    setEnCurso(true)
    setRechazo(null)
    setFallo(null)
    const envio = await enviarAccion(
      cambiarFase({
        ...unidadAMover(unidad),
        faseDestino: destino.faseId,
        faseEsperada: unidad.faseId,
        nota: borrador.nota,
      }),
      NO_SE_MOVIO,
    )
    setEnCurso(false)
    if (envio.ok) {
      avisarExito(`${unidad.titulo} pasó a «${destino.nombre}».`)
      borrador.vaciar()
      router.refresh()
      enfocarElTituloDeLaUnidad()
      return
    }
    if ('sinRed' in envio) {
      avisarError(envio.error)
      return
    }
    const campos = envio.porCampo ?? {}
    const conflicto = campos['conflicto']
    if (envio.error.codigo === 'conflicto') {
      borrador.decirConflicto(conflicto ?? envio.error.mensaje)
      return
    }
    const codigo = Object.keys(campos)[0]
    if (codigo !== undefined && ['requisitos', 'rol', 'nota', 'transicion'].includes(codigo)) {
      setRechazo(
        motivoLegible(
          { codigo, motivo: campos[codigo] ?? null },
          { faltan: destino.vista?.faltan },
        ),
      )
      releer()
      return
    }
    setFallo(envio.error.mensaje)
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
