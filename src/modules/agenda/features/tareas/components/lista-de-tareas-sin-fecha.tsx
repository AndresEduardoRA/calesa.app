'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { enlaceDePanel, type BaseDeEnlace } from '../../calendario/enlace-de-panel'
import { useTareasSinFecha } from '../hooks/use-tareas-sin-fecha'

type Props = { base: BaseDeEnlace }

const FILAS_DEL_ESQUELETO = [0, 1, 2]

// Lo que se ve al abrir «Tareas sin fecha»: sus mías, de la más nueva a la más vieja, cada una un enlace a su panel. Los cinco estados: esqueleto mientras lee, vacío,
// error con «Reintentar» (sin perder lo ya cargado), «Ver más» y, en el tope, el aviso. Sin números exactos: «Ver más» o nada.
export function ListaDeTareasSinFecha({ base }: Props) {
  const lista = useTareasSinFecha()
  if (lista.tareas.length === 0) {
    if (lista.cargando) {
      return (
        <ul aria-label="Leyendo tus tareas sin fecha" className="grid gap-2" aria-busy="true">
          {FILAS_DEL_ESQUELETO.map((n) => (
            <li key={n} className="h-11 animate-pulse rounded-md bg-(--color-paper-dim)" />
          ))}
        </ul>
      )
    }
    if (lista.error) {
      return (
        <EstadoError
          titulo="No pudimos leer tus tareas sin fecha"
          descripcion={lista.error.mensaje}
          alReintentar={lista.reintentar}
        />
      )
    }
    return <EstadoVacio titulo="No tienes tareas sin fecha." />
  }
  return (
    <div className="grid gap-3">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {lista.tareas.map((tarea) => (
          <li key={tarea.id} className="min-w-0">
            <Link
              href={enlaceDePanel(base, 'tarea', tarea.id) as Route}
              className="flex min-h-11 flex-wrap items-center gap-x-2 rounded-md px-2 py-1 hover:bg-(--color-paper-dim) md:min-h-9"
            >
              <span
                className={`min-w-0 break-words ${tarea.hecha ? 'text-(--color-ink-soft) line-through' : ''}`}
              >
                {tarea.titulo}
              </span>
              <span className="text-(length:--text-sm) text-(--color-ink-soft)">
                {tarea.hecha ? '· Hecha' : '· Pendiente'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {lista.error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {lista.error.mensaje}
          </p>
          <Button variant="outline" className="min-h-11 md:min-h-9" onClick={lista.reintentar}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {lista.enElTope && lista.hayMas ? (
        <AvisoDeTope texto={`Mostrando las ${String(TOPE_DE_LO_CARGADO)} más recientes.`} />
      ) : lista.hayMas && !lista.error ? (
        <Button
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          disabled={lista.cargando}
          onClick={lista.verMas}
        >
          {lista.cargando ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
    </div>
  )
}
