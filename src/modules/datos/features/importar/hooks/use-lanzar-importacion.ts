'use client'

import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { quitarArchivoDeImportacion, subirArchivoDeImportacion } from '../../../composicion.client'
import {
  armarArchivo,
  mapeoDeColumnas,
  type EtiquetaDe,
} from '../../../entities/archivo-de-importacion'
import type { EntidadImportable } from '../../../entities/plantillas'
import { crearImportacion } from '../actions/crear-importacion'
import { convertirPorTramos, type Tramo } from '../convertir-por-tramos'
import { siguienteIntento, type Intento } from '../intento'
import { lanzarImportacion } from '../lanzar'

export type FaseDeLanzar =
  | { tipo: 'quieta' }
  | { tipo: 'preparando'; hechas: number; total: number }
  | { tipo: 'subiendo' }
  | { tipo: 'lanzada'; id: string; repetido: boolean }
  | { tipo: 'error'; mensaje: string; reintentable: boolean }

export type PedidoDeLanzar = {
  entidad: EntidadImportable
  tramo: Tramo
  total: number
  encabezados: readonly string[]
  destinos: readonly (string | null)[]
  etiquetaDe: EtiquetaDe
  // «Yo» es `null`.
  asignarA: string | null
  origenId: string | null
}

// Dos clics antes de que React dibuje la fase nueva no mandan dos veces.
async function deUnaVez(corriendo: { current: boolean }, tarea: () => Promise<void>) {
  if (corriendo.current) {
    return
  }
  corriendo.current = true
  try {
    await tarea()
  } finally {
    corriendo.current = false
  }
}

// Convertir por tramos → armar el archivo → subir y crear (9.06-4b). Un intento a la vez: el botón se apaga mientras corre. «Reintentar»
// vuelve a mandar el **mismo** intento, sin volver a convertir (D46). Salir de la pantalla corta la conversión. `alLanzar` avisa a la lista
// «Importaciones» para que la siga (9.06-5).
export function useLanzarImportacion(
  usuarioId: string,
  { alLanzar }: { alLanzar?: (id: string) => void } = {},
) {
  const accion = useAction(crearImportacion)
  const [fase, setFase] = useState<FaseDeLanzar>({ tipo: 'quieta' })
  const intento = useRef<Intento | null>(null)
  const control = useRef<AbortController | null>(null)
  const corriendo = useRef(false)
  useEffect(() => () => control.current?.abort(), [])

  const unaVez = (tarea: () => Promise<void>) => deUnaVez(corriendo, tarea)

  async function enviar(actual: Intento) {
    setFase({ tipo: 'subiendo' })
    const lanzada = await lanzarImportacion(
      { usuarioId, pedido: actual.pedido, texto: actual.texto },
      {
        subir: subirArchivoDeImportacion,
        quitar: quitarArchivoDeImportacion,
        crear: (pedido) =>
          enviarAccion(accion.executeAsync(pedido), 'Revisa los datos de la importación.'),
      },
    )
    if (control.current?.signal.aborted) {
      return
    }
    if (lanzada.ok) alLanzar?.(lanzada.data.id)
    setFase(
      lanzada.ok
        ? { tipo: 'lanzada', id: lanzada.data.id, repetido: lanzada.data.repetido }
        : { tipo: 'error', mensaje: lanzada.error.mensaje, reintentable: true },
    )
  }

  async function importar(pedido: PedidoDeLanzar) {
    control.current?.abort()
    const senal = (control.current = new AbortController()).signal
    setFase({ tipo: 'preparando', hechas: 0, total: pedido.total })
    const filas = await convertirPorTramos({
      total: pedido.total,
      tramo: pedido.tramo,
      senal,
      alAvanzar: (hechas, total) => {
        setFase({ tipo: 'preparando', hechas, total })
      },
    })
    if (filas === null) {
      return
    }
    const armado = armarArchivo(pedido.entidad, filas, pedido.etiquetaDe)
    if (!armado.ok) {
      setFase({ tipo: 'error', mensaje: armado.motivo, reintentable: false })
      return
    }
    intento.current = siguienteIntento(intento.current, {
      texto: armado.texto,
      entidad: pedido.entidad,
      mapeo: mapeoDeColumnas(pedido.encabezados, pedido.destinos),
      asignarA: pedido.asignarA,
      origenId: pedido.origenId,
    })
    await enviar(intento.current)
  }

  const ocupado = fase.tipo === 'preparando' || fase.tipo === 'subiendo' || accion.isExecuting
  const reintentar = () => {
    const actual = intento.current
    if (actual) {
      void unaVez(() => enviar(actual))
    }
  }

  return {
    fase,
    ocupado,
    importar: (pedido: PedidoDeLanzar) => {
      void unaVez(() => importar(pedido))
    },
    reintentar,
    volver: () => {
      setFase({ tipo: 'quieta' })
    },
  }
}

export type LanzarImportacion = ReturnType<typeof useLanzarImportacion>
