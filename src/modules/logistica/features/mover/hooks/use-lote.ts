'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  cambiarFaseLote,
  LARGO_MAXIMO_DE_LA_NOTA,
  MOTIVO_DE_NOTA_OBLIGATORIA,
  type FilaDelLote,
  type VistaPreviaDeUnaUnidad,
} from '@/modules/flujos/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  filasDelLoteCompleto,
  idsParaReintentar,
  resumenDelLote,
  type ResumenDelLote,
} from '../lote/resultado-del-lote'
import { notaObligatoriaDelLote, puedenDelLote, type FaseDelLote } from '../lote/vista-del-lote'
import { useVistaDelLote } from './use-vista-del-lote'

const NO_SE_MOVIO_EL_LOTE = 'No pudimos mover el lote.'
const MOTIVO_SIN_UNIDADES = 'Ninguna unidad puede entrar a esa fase.'
const MOTIVO_DE_NOTA_LARGA = `La nota admite hasta ${String(LARGO_MAXIMO_DE_LA_NOTA)} caracteres.`

export type UnidadDelLote = { id: string; nombre: string }

export type ResultadoDeEnviar = ResumenDelLote & {
  filas: FilaDelLote[]
  vistas: VistaPreviaDeUnaUnidad[]
}

// El lote de un drawer (6.04-3): lo que se ve (la vista previa del destino elegido, de las unidades que se miran), la nota común, el envío con `cambiarFaseLote` (resultado parcial: una fila por
// unidad) y «Reintentar», que vuelve a la vista previa con sólo las que fallaron, con la misma nota y la misma fase de origen esperada (D33). Un solo envío a la vez.
export function useLote(args: {
  origenId: string
  fase: FaseDelLote
  unidades: readonly UnidadDelLote[]
  destinoId: string | null
  alHaberResultado: () => void
}) {
  const { origenId, fase, unidades, destinoId, alHaberResultado } = args
  const router = useRouter()
  const [aMirar, setAMirar] = useState<readonly string[]>(() => unidades.map((u) => u.id))
  const [nota, setNota] = useState('')
  const [enCurso, setEnCurso] = useState(false)
  const [resultado, setResultado] = useState<ResultadoDeEnviar | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const enviando = useRef(false)
  const { lectura, reintentar: releer } = useVistaDelLote(resultado ? null : destinoId, aMirar)
  const nombres = new Map(unidades.map((u) => [u.id, u.nombre]))
  const vistas = lectura.tipo === 'listo' ? lectura.vistas : []
  const pueden = lectura.tipo === 'listo' ? puedenDelLote(vistas, fase.id) : []
  const pideNota = notaObligatoriaDelLote(vistas)

  function motivoDeApagado(): string | null {
    if (lectura.tipo !== 'listo') return 'Todavía no sabemos qué unidades pueden entrar.'
    if (pueden.length === 0) return MOTIVO_SIN_UNIDADES
    if (pideNota && nota.trim() === '') return MOTIVO_DE_NOTA_OBLIGATORIA
    if (nota.trim().length > LARGO_MAXIMO_DE_LA_NOTA) return MOTIVO_DE_NOTA_LARGA
    return null
  }
  const motivo = motivoDeApagado()

  async function enviar() {
    if (motivo !== null || enviando.current || destinoId === null) return
    enviando.current = true
    setEnCurso(true)
    setFallo(null)
    const envio = await enviarAccion<FilaDelLote[]>(
      cambiarFaseLote({
        origenId,
        faseDestino: destinoId,
        nota: nota.trim() === '' ? undefined : nota,
        unidades: pueden.map((vehiculo) => ({ vehiculo, faseEsperada: fase.id })),
      }),
      NO_SE_MOVIO_EL_LOTE,
    )
    enviando.current = false
    setEnCurso(false)
    if (!envio.ok) {
      if ('sinRed' in envio) avisarError(envio.error)
      else setFallo(envio.error.mensaje)
      return
    }
    // El resultado es el de todo el lote: las que no se enviaron (su vista decía que no podían) cuentan como no movidas, con su motivo.
    const filas = filasDelLoteCompleto(envio.data, vistas, aMirar, fase)
    const resumen = resumenDelLote(filas, nombres, vistas)
    setResultado({ ...resumen, filas, vistas })
    alHaberResultado()
    if (envio.data.some((f) => f.ok)) avisarExito(resumen.titular)
    router.refresh()
  }

  return {
    lectura,
    vistas,
    pueden,
    nota,
    escribirNota: setNota,
    pideNota,
    motivo,
    enCurso,
    fallo,
    resultado,
    nombres,
    enviar,
    releer,
    reintentar: () => {
      if (!resultado) return
      setAMirar(idsParaReintentar(resultado.filas))
      setResultado(null)
    },
  }
}
