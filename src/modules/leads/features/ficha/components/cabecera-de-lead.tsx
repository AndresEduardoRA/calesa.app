import type { ReactNode } from 'react'
import { telefonoDeFicha, type LeadDeFicha } from '../../../entities/ficha'
import { BadgeDeTipo } from '../../listado/components/badge-de-tipo'

type Props = {
  ficha: LeadDeFicha
  // El nombre del origen del lead; null si no tiene o ya no existe.
  origen: { nombre: string; activo: boolean } | null
  // «Lo tienes tú», «Lo tiene Rosa Mamani».
  quien: string | null
  // «Editar» y lo demás que la persona puede hacer.
  acciones?: ReactNode
}

// Lo que se ve de un lead arriba de todas sus secciones: su nombre, su número, su tipo, de dónde
// vino, su teléfono principal tal como lo entrega la base (completo sólo para la cartera) y quién
// lo tiene. En el celular son dos líneas: nombre y número, y el resto debajo.
export function CabeceraDeLead({ ficha, origen, quien, acciones }: Props) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 flex-1 gap-1.5">
        <h1 className="text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
          {ficha.nombre}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
          <span className="tabular-nums">#{ficha.numero}</span>
          <BadgeDeTipo tipo={ficha.tipo} />
          {origen ? (
            <span>
              {origen.nombre}
              {origen.activo ? '' : ' (inactivo)'}
            </span>
          ) : null}
          <span className="tabular-nums">{telefonoDeFicha(ficha.telefono, ficha.telefonoCc)}</span>
          {quien ? <span>{quien}</span> : null}
        </div>
      </div>
      {acciones ? <div className="flex flex-wrap items-start gap-2">{acciones}</div> : null}
    </header>
  )
}
