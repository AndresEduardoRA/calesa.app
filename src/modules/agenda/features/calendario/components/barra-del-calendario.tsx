'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Interruptor } from '@/shared/ui/interruptor'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import type { ClaveDeClase } from '../../../entities/agenda'
import { moverFecha, VISTAS, type Vista } from '../../../entities/calendario'
import { useParametrosDeAgenda } from '../hooks/use-parametros-de-agenda'
import { BotonesDeAlta } from './botones-de-alta'
import { FiltroDeClases } from './filtro-de-clases'

const NOMBRE_DE_VISTA: Record<Vista, string> = { mes: 'Mes', semana: 'Semana', dia: 'Día' }

type Props = {
  // Lo resuelto en el servidor (con sus valores por defecto): la barra sólo escribe la URL.
  vista: Vista
  fecha: string
  titulo: string
  clases: readonly ClaveDeClase[]
  // Sólo con `agenda.ver_todo` existe el interruptor (D5): es un filtro de lectura, no una acción deshabilitable.
  puedeVerTodo: boolean
  deTodos: boolean
}

// «‹ Hoy ›», el título del rango, Mes/Semana/Día, el filtro de clases y, con permiso, «Ver la de todos». Todo escribe en la URL.
export function BarraDelCalendario({ vista, fecha, titulo, clases, puedeVerTodo, deTodos }: Props) {
  const [, poner] = useParametrosDeAgenda()
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="max-md:size-11"
          aria-label="Anterior"
          onClick={() => void poner({ fecha: moverFecha(vista, fecha, -1) })}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          className="max-md:h-11"
          onClick={() => void poner({ fecha: null })}
        >
          Hoy
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="max-md:size-11"
          aria-label="Siguiente"
          onClick={() => void poner({ fecha: moverFecha(vista, fecha, 1) })}
        >
          <ChevronRightIcon />
        </Button>
        <h1 className="min-w-0 text-(length:--text-xl) font-semibold break-words text-(--color-ink) first-letter:uppercase">
          {titulo}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={vista} onValueChange={(elegida) => void poner({ vista: String(elegida) })}>
          <TabsList className="max-md:h-11">
            {VISTAS.map((clave) => (
              <TabsTrigger key={clave} value={clave} className="px-3">
                {NOMBRE_DE_VISTA[clave]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <FiltroDeClases clases={clases} />
      </div>
      <BotonesDeAlta />
      {puedeVerTodo ? (
        <Interruptor
          titulo="Ver la de todos"
          ayuda="Muestra los eventos y las tareas de todo el equipo, no sólo los tuyos."
          valor={deTodos}
          alCambiar={(valor) => void poner({ de: valor ? 'todos' : null })}
        />
      ) : null}
    </div>
  )
}
