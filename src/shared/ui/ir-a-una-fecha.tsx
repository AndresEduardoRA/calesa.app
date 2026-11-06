'use client'

import { useId, useState } from 'react'
import { diaEnZona } from '@/shared/lib/fechas'
import { Button } from './button'
import { Input } from './input'

type Props = {
  zona: string
  ocupado: boolean
  alIr: (dia: string) => void
}

// «Ir a una fecha»: el camino a lo antiguo de una lista con «Ver más», sin sumar páginas para siempre.
// Entrega el día del calendario (`YYYY-MM-DD`, en la zona de la empresa), no un instante: el borde lo
// arma quien lee, «ese día y lo anterior» = antes de `inicioDelDia(diaSiguiente(dia), { zona })`,
// exclusivo. No va a la URL (es una posición).
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
