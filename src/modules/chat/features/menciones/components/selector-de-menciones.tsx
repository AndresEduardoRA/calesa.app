'use client'

import { useEffect, useMemo } from 'react'
import { Button } from '@/shared/ui/button'
import { cn } from 'cn'
import type { OpcionDeMencion } from '../../../entities/menciones'
import { useBusquedaDeMenciones, type GrupoDeOpciones } from '../hooks/use-busqueda-de-menciones'

type Props = {
  // Lo escrito tras el `#`; nulo = cerrado (el panel no se desmonta: ya se pidió su código).
  consulta: string | null
  yo: string
  id: string
  idDeOpcion: (indice: number) => string
  activa: number
  alElegir: (opcion: OpcionDeMencion) => void
  // La lista plana, en el orden en que se ve, para que el teclado la maneje desde el campo.
  alCambiarOpciones: (opciones: OpcionDeMencion[]) => void
}

const AVISO = 'px-3 py-2 text-sm text-(--color-ink-soft)'

function GruposDelSelector({
  grupos,
  idDeOpcion,
  activa,
  alElegir,
}: Pick<Props, 'idDeOpcion' | 'activa' | 'alElegir'> & { grupos: GrupoDeOpciones[] }) {
  let indice = 0
  return grupos.map((grupo) => (
    <div key={grupo.clase} role="group" aria-label={grupo.titulo}>
      <p className="px-3 pt-2 text-xs font-medium text-(--color-ink-soft)">{grupo.titulo}</p>
      {grupo.opciones.map((opcion) => {
        const posicion = indice
        indice += 1
        return (
          <button
            key={`${opcion.clase}:${opcion.id}`}
            id={idDeOpcion(posicion)}
            type="button"
            role="option"
            aria-selected={posicion === activa}
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            onClick={() => {
              alElegir(opcion)
            }}
            className={cn(
              'flex min-h-11 w-full items-center justify-between gap-2 px-3 py-1 text-left text-sm md:min-h-8',
              posicion === activa ? 'bg-(--color-surface-2)' : 'hover:bg-(--color-surface-3)',
            )}
          >
            <span className="truncate">{opcion.etiqueta.slice(1)}</span>
            {opcion.detalle !== null ? (
              <span className="shrink-0 text-xs text-(--color-ink-soft)">{opcion.detalle}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  ))
}

// El selector del `#`: vehículos, leads, cotizaciones y personas con lo que la sesión de quien escribe puede ver (las lecturas de 7.12). Vive dentro del
// formulario, sobre el campo, y no roba el foco: elegir con el ratón no lo quita del campo (`onMouseDown`).
export function SelectorDeMenciones({
  consulta,
  yo,
  id,
  idDeOpcion,
  activa,
  alElegir,
  alCambiarOpciones,
}: Props) {
  const { estado, reintentar } = useBusquedaDeMenciones(consulta, yo)
  const opciones = useMemo(
    () => (estado.tipo === 'lista' ? estado.grupos.flatMap((g) => g.opciones) : []),
    [estado],
  )
  useEffect(() => {
    alCambiarOpciones(opciones)
  }, [opciones, alCambiarOpciones])

  if (consulta === null) {
    return null
  }
  return (
    <div
      id={id}
      role="listbox"
      aria-label="Menciones"
      className="max-h-56 overflow-auto rounded-(--radius-md) border border-(--color-line) bg-(--color-surface)"
    >
      {estado.tipo === 'minimo' ? (
        <p role="status" className={AVISO}>
          Escribe al menos 3 letras para buscar.
        </p>
      ) : null}
      {estado.tipo === 'cargando' ? (
        <p role="status" className={AVISO}>
          Buscando…
        </p>
      ) : null}
      {estado.tipo === 'vacia' ? <p className={AVISO}>No encontramos nada con ese texto.</p> : null}
      {estado.tipo === 'error' ? (
        <div className={cn(AVISO, 'flex items-center justify-between gap-2')}>
          <span>{estado.mensaje}</span>
          <Button type="button" variant="outline" size="sm" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {estado.tipo === 'lista' ? (
        <GruposDelSelector
          grupos={estado.grupos}
          idDeOpcion={idDeOpcion}
          activa={activa}
          alElegir={alElegir}
        />
      ) : null}
      {estado.tipo === 'lista' && estado.parcial ? (
        <p role="status" className={AVISO}>
          No se pudo buscar en todo.
        </p>
      ) : null}
    </div>
  )
}
