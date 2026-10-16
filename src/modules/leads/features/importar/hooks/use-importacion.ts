'use client'

import { useAction } from 'next-safe-action/hooks'
import { useMemo, useRef, useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { PedidoDeFila } from '../../../entities/importacion/filas'
import { FILAS_POR_LOTE } from '../../../entities/importacion/limites'
import {
  avanceDeImportacion,
  lotesDeImportacion,
  resumirImportacion,
  type ResultadoDeFila,
} from '../../../entities/importacion/lotes'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { importarLoteDeLeads } from '../actions/importar-lote'
import { terminarImportacionDeLeads } from '../actions/terminar-importacion'
import { ejecutarImportacion } from './ejecutar-importacion'

// En qué queda la importación después de intentar cerrarla en la base.
function faseTrasCerrar(
  envio: Envio<{ creadas: number }>,
  como: 'terminada' | 'cancelada',
): FaseDeImportacion {
  if (envio.ok) {
    return como
  }
  return 'sinRed' in envio ? 'pausada' : 'fallida'
}

export type FaseDeImportacion =
  | 'reposo'
  | 'importando'
  // No llegó al servidor: se reanuda sola al volver la red, o con «Reintentar».
  | 'pausada'
  | 'terminada'
  | 'cancelada'
  | 'fallida'

type Entrada = {
  // Las filas que pasaron la vista previa.
  validas: readonly PedidoDeFila[]
  rechazadasEnLaVistaPrevia: number
  origenId: string | null
}

// Los lotes de la importación y cuánto llevan hechos.
function useAvance(
  validas: readonly PedidoDeFila[],
  rechazadasEnLaVistaPrevia: number,
  resultados: ReadonlyMap<string, ResultadoDeFila>,
) {
  const lotes = useMemo(() => lotesDeImportacion(validas, FILAS_POR_LOTE), [validas])
  return { lotes, ...avanceDeImportacion(lotes, rechazadasEnLaVistaPrevia, resultados) }
}

// Importa las filas válidas por lotes: de a uno, con barra de avance, cancelable entre lotes y
// reanudable sin duplicar (cada fila lleva su id de intento). Cuando todo tiene respuesta, cierra la
// importación en la base (la constancia, con números). Los datos del archivo no salen de la memoria.
export function useImportacion({ validas, rechazadasEnLaVistaPrevia, origenId }: Entrada) {
  const importar = useAction(importarLoteDeLeads)
  const terminar = useAction(terminarImportacionDeLeads)
  const [fase, setFase] = useState<FaseDeImportacion>('reposo')
  const [error, setError] = useState<ErrorApp | null>(null)
  // Lo que ya tiene respuesta, por id de fila. `mapa` es el que va completando la pasada (sólo se toca
  // en eventos y efectos); `resultados` es su copia para dibujar.
  const [resultados, setResultados] = useState<ReadonlyMap<string, ResultadoDeFila>>(new Map())
  const mapa = useRef(new Map<string, ResultadoDeFila>())
  const cancelada = useRef(false)
  const faltaCerrar = useRef<'terminada' | 'cancelada' | null>(null)
  // El id de la importación es de esta pasada entera: una reanudación retoma la misma.
  const importacionId = useRef<string | null>(null)
  // La importación ya cerrada en la base, y cuándo: desde ahí corren las 24 h para deshacerla.
  const [cierre, setCierre] = useState<{ importacionId: string; en: string } | null>(null)
  const { lotes, resumen, lotesHechos } = useAvance(validas, rechazadasEnLaVistaPrevia, resultados)

  async function cerrar(como: 'terminada' | 'cancelada') {
    const parcial = resumirImportacion(validas, rechazadasEnLaVistaPrevia, mapa.current)
    const envio = await enviarAccion<{ creadas: number }>(
      terminar.executeAsync({
        importacionId: importacionId.current ?? crypto.randomUUID(),
        yaExistian: parcial.yaExistian,
        rechazadas: parcial.rechazadas,
        origenId,
      }),
      MENSAJE_DE_VALIDACION,
    )
    const sinRed = !envio.ok && 'sinRed' in envio
    faltaCerrar.current = sinRed ? como : null
    if (envio.ok && importacionId.current) {
      setCierre({ importacionId: importacionId.current, en: new Date().toISOString() })
    }
    setError(envio.ok || sinRed ? null : envio.error)
    setFase(faseTrasCerrar(envio, como))
  }

  async function correr(): Promise<boolean> {
    importacionId.current ??= crypto.randomUUID()
    const id = importacionId.current
    cancelada.current = false
    setError(null)
    setFase('importando')
    if (faltaCerrar.current) {
      await cerrar(faltaCerrar.current)
      return true
    }
    const fin = await ejecutarImportacion({
      lotes,
      resultados: mapa.current,
      cancelado: () => cancelada.current,
      alAvanzar: () => {
        setResultados(new Map(mapa.current))
      },
      enviar: (lote) =>
        enviarAccion<ResultadoDeFila[]>(
          importar.executeAsync({ importacionId: id, total: validas.length, filas: [...lote] }),
          MENSAJE_DE_VALIDACION,
        ),
    })
    if (fin.tipo === 'sin_red') {
      setFase('pausada')
    } else if (fin.tipo === 'rechazada') {
      setError(fin.error)
      setFase('fallida')
    } else {
      await cerrar(fin.tipo === 'cancelada' ? 'cancelada' : 'terminada')
    }
    return true
  }

  // Al volver la red, la pasada que quedó esperando sale sola, una vez. Si la red estaba y el servidor
  // no contestó, no se insiste solo: «Reintentar» (un servidor caído no se martilla). Lo distingue
  // `useReintentoAlVolver`, que sólo sale al pasar de sin conexión a con conexión.
  const pendiente = fase === 'pausada' ? 'reanudar' : null
  const enLinea = useReintentoAlVolver(pendiente, correr)

  return {
    fase,
    error,
    enLinea,
    resumen,
    lotesHechos,
    totalDeLotes: lotes.length,
    resultados,
    cierre,
    empezar: () => void correr(),
    reanudar: () => void correr(),
    cancelar: () => void (cancelada.current = true),
  }
}
