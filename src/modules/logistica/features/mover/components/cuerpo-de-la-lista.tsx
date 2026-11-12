'use client'

import { Fragment, type ReactNode } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import type { ListaDeLaUnidad } from '../hooks/use-lista-de-la-unidad'
import { DesdeLaFecha, PieDeLaLista } from './pie-de-la-lista'

type Props<Fila extends { id: string | number }> = {
  lista: ListaDeLaUnidad<Fila>
  zona: string
  // «Cargando las notas»: lo que lee un lector de pantalla mientras llega la primera página.
  cargando: string
  vacio: string
  sustantivo: { plural: string; articulo: 'los' | 'las' }
  // Devuelve el `<li>` entero.
  fila: (fila: Fila) => ReactNode
}

// El cuerpo de una lista de un hueco (6.04-2): esqueleto, error con «Reintentar» (el del hueco, no el del panel), vacío, la lista (`<ul role="list">`, nada que abrir) y su pie. Lo comparten
// «Notas» e «Historial».
export function CuerpoDeLaLista<Fila extends { id: string | number }>({
  lista,
  zona,
  cargando,
  vacio,
  sustantivo,
  fila,
}: Props<Fila>) {
  const { filas, error } = lista
  if (filas === null && error === null) {
    return (
      <div aria-busy="true" aria-label={cargando} className="grid gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }
  if (filas === null) {
    return (
      <div className="grid gap-2">
        <Aviso tono="peligro">
          <p>{error?.mensaje}</p>
        </Aviso>
        <div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-9"
            onClick={lista.reintentar}
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      <DesdeLaFecha lista={lista} zona={zona} />
      {filas.length === 0 ? (
        <EstadoVacio
          compacto
          titulo={lista.desde === null ? vacio : 'No hay nada hasta esa fecha.'}
        />
      ) : (
        <ul role="list" className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {filas.map((una) => (
            <Fragment key={una.id}>{fila(una)}</Fragment>
          ))}
        </ul>
      )}
      <PieDeLaLista lista={lista} zona={zona} sustantivo={sustantivo} />
    </div>
  )
}
