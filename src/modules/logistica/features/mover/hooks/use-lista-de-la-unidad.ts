'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { hastaDeUnDia } from '../../../entities/mover/hasta-de-un-dia'
import type { PaginaDeLaUnidad, PedidoDeLaLista } from '../../../entities/mover/pagina-de-la-unidad'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useAlCambiarLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'

// «Ir a una fecha»: el día elegido y su borde exclusivo.
type Ventana = { dia: string; hasta: string }
type Pedido = { cursor: string | null; ventana: Ventana | null }

// Sin cursor la página reemplaza lo leído; con cursor se suma sin repetir.
function juntar<Fila extends { id: string | number }>(
  previas: Fila[] | null,
  nuevas: Fila[],
  cursor: string | null,
) {
  if (cursor === null || previas === null) return nuevas
  const vistos = new Set(previas.map((fila) => fila.id))
  return [...previas, ...nuevas.filter((fila) => !vistos.has(fila.id))]
}

type UnidadDeLaLista = Pick<Unidad, 'id' | 'faseId'> & { tipo?: Unidad['tipo'] }

function aPedidoDeLaLista(unidadId: string, tipo: Unidad['tipo'] | undefined, pedido: Pedido) {
  return { unidadId, tipo, cursor: pedido.cursor, hasta: pedido.ventana?.hasta ?? null }
}

export type ListaDeLaUnidad<Fila> = {
  // Nulo mientras no llegó la primera lectura.
  filas: Fila[] | null
  hayMasParaPedir: boolean
  enElTope: boolean
  // El día desde el que se mira, o nulo si se miran los más recientes.
  desde: string | null
  error: ErrorApp | null
  pidiendo: boolean
  verMas: () => void
  irAUnaFecha: (dia: string) => void
  volverALosRecientes: () => void
  // Repite el último pedido; si nunca leyó, vuelve a leer desde cero.
  reintentar: () => void
}

// La lista paginada de un hueco del panel (6.04-2, D21, D23, D24): «Notas» e «Historial» la comparten. Lee la primera página al montarse y la relee, sin soltar lo que se ve, cuando cambia la
// fase de la unidad (pasó algo) o cuando otro hueco avisa. «Ver más» suma la página siguiente por cursor hasta `TOPE_DE_LO_CARGADO`; «Ir a una fecha» reemplaza lo leído. Un pedido a la vez:
// una respuesta que llega tarde se descarta. Releer conserva la ventana de «Ir a una fecha»; la fase cambia cuando la pantalla se repinta tras mover.
export function useListaDeLaUnidad<Fila extends { id: string | number }>(
  unidad: UnidadDeLaLista,
  leer: (pedido: PedidoDeLaLista) => Promise<Resultado<PaginaDeLaUnidad<Fila>>>,
  mensajeDeFallo: string,
  zona: string,
): ListaDeLaUnidad<Fila> {
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [siguiente, setSiguiente] = useState<string | null>(null)
  const [ventana, setVentana] = useState<Ventana | null>(null)
  const [error, setError] = useState<ErrorApp | null>(null)
  const [pidiendo, setPidiendo] = useState(false)
  const turno = useRef(0)
  const ultimo = useRef<Pedido>({ cursor: null, ventana: null })
  const ventanaVigente = useRef<Ventana | null>(null)
  const { id, tipo } = unidad

  useEffect(() => {
    ventanaVigente.current = ventana
  }, [ventana])

  const pedir = useCallback(
    async (pedido: Pedido) => {
      turno.current += 1
      const mio = turno.current
      ultimo.current = pedido
      setPidiendo(true)
      setError(null)
      const resultado = await leer(aPedidoDeLaLista(id, tipo, pedido)).catch(() =>
        fallo('inesperado', mensajeDeFallo),
      )
      if (mio !== turno.current) return
      setPidiendo(false)
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }
      const { filas: nuevas, siguiente: proxima } = resultado.data
      setVentana(pedido.ventana)
      setSiguiente(proxima)
      setFilas((previas) => juntar(previas, nuevas, pedido.cursor))
    },
    [id, tipo, leer, mensajeDeFallo],
  )

  const releer = useCallback(() => {
    void pedir({ cursor: null, ventana: ventanaVigente.current })
  }, [pedir])

  useEffect(() => {
    releer()
    return () => {
      turno.current += 1
    }
  }, [releer, unidad.faseId])

  useAlCambiarLaUnidad(id, releer)

  const cargadas = filas?.length ?? 0
  return {
    filas,
    hayMasParaPedir: siguiente !== null && cargadas < TOPE_DE_LO_CARGADO,
    enElTope: siguiente !== null && cargadas >= TOPE_DE_LO_CARGADO,
    desde: ventana?.dia ?? null,
    error,
    pidiendo,
    verMas: () => {
      if (pidiendo || siguiente === null || cargadas >= TOPE_DE_LO_CARGADO) return
      void pedir({ cursor: siguiente, ventana })
    },
    irAUnaFecha: (dia) => {
      const hasta = hastaDeUnDia(dia, zona)
      if (pidiendo || hasta === null) return
      void pedir({ cursor: null, ventana: { dia, hasta } })
    },
    volverALosRecientes: () => {
      if (pidiendo) return
      void pedir({ cursor: null, ventana: null })
    },
    reintentar: () => {
      if (pidiendo) return
      void pedir(filas === null ? { cursor: null, ventana } : ultimo.current)
    },
  }
}
