'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { avisar, avisarConDeshacer } from '@/shared/ui/toasts'
import type { ColumnaDeTabla } from '../../../entities/tabla-de-ayuda'
import { moverFila, sumarFila, type FilaEditable } from '../../../entities/tablas/edicion'
import {
  aplicarTexto,
  devolverFila,
  hayCambios,
  paginaDe,
  paginas,
  primerError,
  quitarConCrudos,
  type EstadoDelEditor,
  type PrimerError,
} from '../../../entities/tablas/vista-del-editor'

type Args = {
  columnas: readonly ColumnaDeTabla[]
  // Lo que se leyó de la base: «Descartar los cambios» vuelve a esto.
  leidas: readonly FilaEditable[]
  // Lo leído o el borrador repuesto.
  inicial: EstadoDelEditor
  locale: string
}

// El id del campo de una celda: «Ir a la celda» y «Sumar» ponen ahí el foco.
export const idDeCelda = (filaId: string, clave: string) => `celda-${filaId}-${clave}`

// Las filas de la tabla en memoria y la página que se dibuja (4.23-3, C5–C7). Todo cambio pasa por lo puro de `entities/tablas/`; el foco que pide un cambio (la fila
// nueva, «Ir a la celda») se pone después de dibujar.
export function useFilasDeTabla({ columnas, leidas, inicial, locale }: Args) {
  const [estado, setEstado] = useState<EstadoDelEditor>(inicial)
  const [pagina, setPagina] = useState(0)
  const [anuncio, setAnuncio] = useState('')
  const foco = useRef<string | null>(null)
  // Después del cuadro siguiente: un menú que se cierra («⋯» › «Sumar una fila debajo») devuelve el foco a su botón y lo pisaría.
  useEffect(() => {
    const id = foco.current
    if (id === null) return
    foco.current = null
    // Sin cancelar: otro dibujo en el medio (un anuncio) no tiene que perder el foco pedido.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.focus()
      })
    })
  })
  const listaDePaginas = useMemo(
    () => paginas(estado.filas.length, locale),
    [estado.filas.length, locale],
  )
  const error = useMemo(() => primerError(columnas, estado), [columnas, estado])
  const cambios = useMemo(() => hayCambios(leidas, estado), [leidas, estado])
  const primera = columnas[0]?.clave

  function sumar(indice: number) {
    const id = crypto.randomUUID()
    const hecho = sumarFila(estado.filas, indice, id)
    if (!hecho.ok) {
      avisar(hecho.error.mensaje)
      return
    }
    setEstado({ filas: hecho.data, crudos: estado.crudos })
    setPagina(paginaDe(Math.min(indice, estado.filas.length)))
    if (primera !== undefined) foco.current = idDeCelda(id, primera)
  }

  function quitar(filaId: string) {
    const { estado: sin, quitada } = quitarConCrudos(estado, filaId)
    if (!quitada) return
    setEstado(sin)
    avisarConDeshacer(`Quitaste la fila ${String(quitada.indice + 1)}.`, () => {
      setEstado((actual) => devolverFila(actual, quitada))
    })
  }

  function mover(filaId: string, destino: number) {
    const lugar = Math.min(Math.max(destino, 0), estado.filas.length - 1)
    setEstado({ filas: moverFila(estado.filas, filaId, lugar), crudos: estado.crudos })
    setAnuncio(`La fila quedó en el lugar ${String(lugar + 1)}.`)
  }

  return {
    estado,
    // Quitar filas puede dejar la página de más.
    pagina: Math.min(pagina, listaDePaginas.length - 1),
    paginas: listaDePaginas,
    error,
    cambios,
    anuncio,
    setPagina,
    editar: (columna: ColumnaDeTabla, filaId: string, texto: string) => {
      setEstado((actual) => aplicarTexto(actual, { columna, filaId }, texto, locale))
    },
    sumar,
    quitar,
    mover,
    reponer: setEstado,
    irA: (destino: PrimerError) => {
      if (!destino.conCelda || destino.filaId === null || destino.clave === null) return
      setPagina(destino.pagina)
      foco.current = idDeCelda(destino.filaId, destino.clave)
      setAnuncio(destino.mensaje)
    },
  }
}

export type FilasDeTabla = ReturnType<typeof useFilasDeTabla>
