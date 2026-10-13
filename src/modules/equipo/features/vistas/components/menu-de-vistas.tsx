'use client'

import { BookmarkIcon, Trash2Icon } from 'lucide-react'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/shared/ui/popover'
import {
  LARGO_MAXIMO_DE_NOMBRE,
  esLaVistaActual,
  urlDeVista,
  type PantallaConVistas,
  type ParamsDeVista,
  type VistaGuardada,
} from '../../../entities/vista'
import { useVistas } from '../hooks/use-vistas'

type Props = {
  pantalla: PantallaConVistas
  vistas: readonly VistaGuardada[]
  // Lo que se está viendo, como parámetros de URL: es lo que se guarda.
  actuales: ParamsDeVista
  // Sin filtros puestos no hay nada que guardar.
  puedeGuardar: boolean
}

type PropsDeLista = {
  vistas: readonly VistaGuardada[]
  actuales: ParamsDeVista
  enCurso: boolean
  alAplicar: (vista: VistaGuardada) => void
  alEliminar: (vista: VistaGuardada) => void
}

function ListaDeVistas({ vistas, actuales, enCurso, alAplicar, alEliminar }: PropsDeLista) {
  if (vistas.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Todavía no guardaste ninguna. Pon los filtros que usas siempre y guárdalos con un nombre.
      </p>
    )
  }
  return (
    <ul className="grid max-h-64 gap-0.5 overflow-y-auto">
      {vistas.map((vista) => {
        const actual = esLaVistaActual(vista, actuales)
        return (
          <li key={vista.id} className="flex items-center gap-1">
            <button
              type="button"
              aria-current={actual ? 'true' : undefined}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-(--radius-sm) px-2 text-left text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus) aria-[current]:font-medium md:min-h-8"
              onClick={() => {
                alAplicar(vista)
              }}
            >
              <span className="min-w-0 truncate">{vista.nombre}</span>
              {actual ? (
                <span className="shrink-0 text-(length:--text-xs) text-(--color-ink-faint)">
                  la de ahora
                </span>
              ) : null}
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11 shrink-0 md:size-7"
              aria-label={`Eliminar la vista ${vista.nombre}`}
              disabled={enCurso}
              onClick={() => {
                alEliminar(vista)
              }}
            >
              <Trash2Icon aria-hidden />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

// Las vistas guardadas de un listado: aplicarlas (es navegar a su URL), guardar los filtros de
// ahora con un nombre, y eliminarlas con «Deshacer». Va en el hueco `vistas` de `<FilterShell>`.
export function MenuDeVistas({ pantalla, vistas, actuales, puedeGuardar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const ruta = usePathname()
  const router = useRouter()
  const estado = useVistas(pantalla)

  async function guardar() {
    if (await estado.guardar(nombre, actuales)) {
      setNombre('')
      setAbierto(false)
    }
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
        <BookmarkIcon aria-hidden />
        Vistas
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] gap-3 p-3">
        <PopoverTitle>Vistas guardadas</PopoverTitle>
        <ListaDeVistas
          vistas={vistas}
          actuales={actuales}
          enCurso={estado.enCurso}
          alAplicar={(vista) => {
            setAbierto(false)
            router.push(urlDeVista(ruta, vista.params) as Route)
          }}
          alEliminar={(vista) => void estado.eliminar(vista)}
        />
        <form
          noValidate
          className="grid gap-2 border-t border-(--color-line) pt-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            void guardar()
          }}
        >
          <Campo
            nombre="nombreDeVista"
            etiqueta="Guardar los filtros de ahora"
            placeholder="Nombre de la vista"
            autoComplete="off"
            maxLength={LARGO_MAXIMO_DE_NOMBRE}
            value={nombre}
            onChange={(evento) => {
              setNombre(evento.target.value)
            }}
            error={estado.errorDeNombre}
            ayuda={
              puedeGuardar
                ? 'Con un nombre que ya existe, la reemplaza.'
                : 'Pon algún filtro para poder guardarlo.'
            }
            disabled={!puedeGuardar}
          />
          <Button type="submit" disabled={!puedeGuardar || nombre.trim() === '' || estado.enCurso}>
            {estado.enCurso ? 'Guardando…' : 'Guardar vista'}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
