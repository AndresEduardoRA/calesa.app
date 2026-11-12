'use client'

import { useEffect, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { useLecturaAlMontar, type LecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import type { MovimientoDeStock, PaginaDeMovimientos } from '../../../entities/stock/movimientos'
import { leerMovimientosDeItem } from '../actions/leer-movimientos'

const NO_SE_LEYO = 'No se pudo cargar el historial.'

const leerPagina = (itemId: string, cursor: number | null) =>
  enviarAccion(leerMovimientosDeItem({ itemId, cursor }), NO_SE_LEYO)

// Las páginas que sumó «Ver más» sobre la primera lectura de una `clave`.
type Mas = {
  clave: string
  movimientos: MovimientoDeStock[]
  siguiente: number | null
  error: ErrorApp | null
  pidiendo: boolean
}

function juntar(previos: readonly MovimientoDeStock[], nuevos: readonly MovimientoDeStock[]) {
  const vistos = new Set(previos.map((m) => m.id))
  return [...previos, ...nuevos.filter((m) => !vistos.has(m.id))]
}

// Lo que se ve: la primera página más lo sumado, el cursor que sigue y el error vigente.
function lo(lectura: LecturaAlMontar<PaginaDeMovimientos>, vigente: Mas | null) {
  if (lectura.estado !== 'leido') {
    const error = lectura.estado === 'fallo' ? lectura.error : null
    return { movimientos: null, siguiente: null, error, cargados: 0 }
  }
  const movimientos = juntar(lectura.dato.movimientos, vigente?.movimientos ?? [])
  return {
    movimientos,
    siguiente: vigente ? vigente.siguiente : lectura.dato.siguiente,
    error: vigente?.error ?? null,
    cargados: movimientos.length,
  }
}

// El historial de stock del ítem (8.10-2, C12, D9): la primera página se lee al montarse y otra vez cuando cambia `revision` (se pasó a stock); «Ver más» suma la
// siguiente por cursor hasta `TOPE_DE_LO_CARGADO`. Releer olvida lo sumado; una respuesta de «Ver más» que llega tras releer se descarta.
export function useHistorialDeStock(itemId: string, revision: number) {
  const clave = `${itemId}:${String(revision)}`
  const { lectura, reintentar } = useLecturaAlMontar(() => leerPagina(itemId, null), clave)
  const [mas, setMas] = useState<Mas | null>(null)
  const claveVigente = useRef(clave)
  useEffect(() => {
    claveVigente.current = clave
  }, [clave])
  const vigente = mas?.clave === clave ? mas : null
  const { movimientos, siguiente, error, cargados } = lo(lectura, vigente)
  const pidiendo = vigente?.pidiendo ?? false
  const puedePedir = siguiente !== null && cargados < TOPE_DE_LO_CARGADO

  async function verMas() {
    if (pidiendo || !puedePedir) return
    const base: Mas = vigente ?? { clave, movimientos: [], siguiente, error: null, pidiendo: false }
    setMas({ ...base, error: null, pidiendo: true })
    const envio = await leerPagina(itemId, siguiente)
    if (claveVigente.current !== clave) return
    setMas(
      envio.ok
        ? {
            clave,
            movimientos: juntar(base.movimientos, envio.data.movimientos),
            siguiente: envio.data.siguiente,
            error: null,
            pidiendo: false,
          }
        : { ...base, error: envio.error, pidiendo: false },
    )
  }

  return {
    // Nulo mientras no llegó la primera página.
    movimientos,
    error,
    pidiendo,
    hayMasParaPedir: puedePedir,
    enElTope: siguiente !== null && !puedePedir,
    verMas: () => void verMas(),
    // La primera página que falló se vuelve a leer; «Ver más» que falló se repite.
    reintentar: lectura.estado === 'fallo' ? reintentar : () => void verMas(),
  }
}
