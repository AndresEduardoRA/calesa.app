'use client'

import { useId, useState } from 'react'
import { diaEnZona, formatearFecha, inicioDelDia } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { Seguimientos } from '../hooks/use-seguimientos'

// Lo de una línea de tiempo larga, que casi nunca hace falta: «Ir a una fecha», desde cuándo se está
// mirando y el aviso del tope. Se pide al dibujarse (`diferidos.tsx`): la línea de tiempo viaja en el
// JS de todas las pantallas por la entrada del módulo.

const fechaDe = (dia: string, zona: string) => formatearFecha(inicioDelDia(dia, { zona }), { zona })

type PropsDeLaVentana = { seguimientos: Seguimientos; zona: string }

// Arriba de la lista, cuando lo cargado empieza en una fecha: desde cuándo, y volver a lo más nuevo.
export function DesdeUnaFecha({ seguimientos, zona }: PropsDeLaVentana) {
  if (seguimientos.desde === null) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Desde el {fechaDe(seguimientos.desde, zona)}
      </p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-8"
        onClick={() => void seguimientos.volverAlPrincipio()}
        disabled={seguimientos.cargando}
      >
        Volver a los más recientes
      </Button>
    </div>
  )
}

// En el tope de lo cargado, en lugar de «Ver más»: cuántos se muestran y por dónde seguir.
export function AvisoDelTope({ seguimientos, zona }: PropsDeLaVentana) {
  const { desde } = seguimientos
  return (
    <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
      {desde === null
        ? `Mostrando los ${String(TOPE_DE_LO_CARGADO)} más recientes.`
        : `Mostrando ${String(TOPE_DE_LO_CARGADO)} desde el ${fechaDe(desde, zona)}.`}{' '}
      Para ver anteriores, ve a una fecha.
    </p>
  )
}

type Props = {
  zona: string
  ocupado: boolean
  alIr: (dia: string) => void
}

// «Ir a una fecha»: el camino a lo antiguo sin sumar páginas para siempre. Lee una página desde ese día
// (en la zona de la empresa) con el mismo cursor de «Ver más»; no va a la URL (es una posición).
export function IrAUnaFecha({ zona, ocupado, alIr }: Props) {
  const id = useId()
  const [dia, setDia] = useState('')
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(evento) => {
        evento.preventDefault()
        if (dia !== '') {
          alIr(dia)
        }
      }}
    >
      <div className="grid gap-1">
        <label htmlFor={id} className="text-(length:--text-xs) text-(--color-ink-soft)">
          Ir a una fecha
        </label>
        <Input
          id={id}
          type="date"
          value={dia}
          max={diaEnZona(new Date().toISOString(), { zona })}
          onChange={(evento) => {
            setDia(evento.target.value)
          }}
          className="min-h-11 w-fit md:min-h-9"
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={dia === '' || ocupado}
      >
        Ir
      </Button>
    </form>
  )
}
