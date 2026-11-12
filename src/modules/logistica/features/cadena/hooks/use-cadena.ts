'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'
import {
  agregarTarjetas,
  claveDeColumna,
  cursorDeLaColumna,
} from '../../../entities/cadena/columna'
import type { FiltrosDeLaCadena } from '../../../entities/cadena/filtros'
import type { CadenaLeida, ColumnaDeLaCadena } from '../../../entities/cadena/leer'
import { verMasDeLaColumna } from '../actions/ver-mas-de-la-columna'

const NO_SE_PUDO_CARGAR_MAS = 'No se pudo cargar más. Intenta de nuevo.'

type Contexto = { origenId: string; filtros: FiltrosDeLaCadena }

// Qué lectura es esta: el origen, los filtros y lo que trajo el servidor. Si cambia (otro origen, otro filtro, `router.refresh()` con otras tarjetas) el estado se vuelve a sembrar.
function firmaDeLaCadena(cadena: CadenaLeida, { origenId, filtros }: Contexto): string {
  const columnas = cadena.columnas
    .map(
      (c) =>
        `${claveDeColumna(c.faseId)}:${c.hayMas ? '+' : '='}:${c.tarjetas.map((t) => t.id).join(',')}`,
    )
    .join('|')
  return `${origenId}#${JSON.stringify(filtros)}#${columnas}`
}

// La cadena en la pantalla: se siembra con lo que trajo el servidor y «Ver más» agrega tarjetas a una columna sin repetir ni pasar del tope. Un pedido a la vez por columna; si la lectura
// cambia mientras llega una página, esa página es de otra cadena y se descarta. Si falla, la columna queda como estaba y se dice.
export function useCadena(inicial: CadenaLeida, contexto: Contexto) {
  const { origenId, filtros } = contexto
  const firma = useMemo(
    () => firmaDeLaCadena(inicial, { origenId, filtros }),
    [inicial, origenId, filtros],
  )
  const [vista, setVista] = useState(firma)
  const [columnas, setColumnas] = useState(inicial.columnas)
  if (vista !== firma) {
    setVista(firma)
    setColumnas(inicial.columnas)
  }
  const [cargando, setCargando] = useState<string | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const enVuelo = useRef(new Set<string>())
  const firmaVigente = useRef(firma)
  useEffect(() => {
    firmaVigente.current = firma
  }, [firma])

  async function verMas(columna: ColumnaDeLaCadena): Promise<void> {
    const clave = claveDeColumna(columna.faseId)
    const cursor = cursorDeLaColumna(columna)
    if (cursor === null || enVuelo.current.has(clave)) {
      return
    }
    enVuelo.current.add(clave)
    setCargando(clave)
    const desde = firma
    const envio = await enviarAccion(
      verMasDeLaColumna({
        origenId: contexto.origenId,
        faseId: columna.faseId,
        cursor,
        filtros: contexto.filtros,
      }),
      NO_SE_PUDO_CARGAR_MAS,
    )
    enVuelo.current.delete(clave)
    setCargando(null)
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    if (firmaVigente.current !== desde) {
      return
    }
    const { tarjetas, hayMas } = envio.data
    setColumnas((antes) =>
      antes.map((c) =>
        claveDeColumna(c.faseId) === clave ? agregarTarjetas(c, tarjetas, hayMas) : c,
      ),
    )
    const yaEstaban = new Set(columna.tarjetas.map((t) => t.id))
    const nuevas = tarjetas.filter((t) => !yaEstaban.has(t.id))
    setAnuncio(
      nuevas.length === 1 ? 'Se cargó 1 más.' : `Se cargaron ${String(nuevas.length)} más.`,
    )
    const primera = nuevas[0]
    if (primera) {
      // Tras pintar: el foco queda en la primera tarjeta nueva, así quien navega con teclado sigue donde estaba.
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-tarjeta="${primera.id}"]`)?.focus()
      })
    }
  }

  return { columnas, cargando, anuncio, verMas }
}

export type EstadoDeLaCadena = ReturnType<typeof useCadena>
