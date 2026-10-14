'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { camposDeTabla } from '../../../entities/listado'
import type { FilaDeLead } from '../../../entities/listado'
import { BadgeDeTipo } from './badge-de-tipo'
import { CeldaDeCampo } from './celda-de-campo'
import { telefonoDeLista } from './telefono-de-lista'
import { nombreDelOrigen, type DatosDeLaLista } from './tipos'

type Props = DatosDeLaLista & {
  leads: readonly FilaDeLead[]
  alAbrir: (id: string) => void
  // El lead abierto en el drawer, para marcarlo.
  abierto: string | null
}

const VACIO = <span className="text-(--color-ink-faint)">—</span>

// Los leads en escritorio: nombre, teléfono, tipo y origen, y una columna por cada campo «en la
// tabla» del layout. Elegir una fila abre el drawer rápido (`?lead=`); no hay ficha todavía.
export function TablaDeLeads({ leads, campos, origenes, codigoDePais, alAbrir, abierto }: Props) {
  const columnas = camposDeTabla(campos)
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-3">Nombre</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Origen del lead</TableHead>
            {columnas.map((campo) => (
              <TableHead key={campo.clave}>{campo.etiqueta}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              data-state={abierto === lead.id ? 'selected' : undefined}
              className="h-(--fila) cursor-pointer"
              onClick={() => {
                alAbrir(lead.id)
              }}
            >
              <TableCell className="py-1 pl-3">
                <div className="grid min-w-0">
                  <button
                    type="button"
                    className="max-w-72 truncate text-left font-medium text-(--color-ink) underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
                    onClick={(evento) => {
                      evento.stopPropagation()
                      alAbrir(lead.id)
                    }}
                  >
                    {lead.nombre}
                  </button>
                  <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
                    #{lead.numero}
                  </span>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {telefonoDeLista(lead.telefono, codigoDePais)}
              </TableCell>
              <TableCell>
                <BadgeDeTipo tipo={lead.tipo} />
              </TableCell>
              <TableCell className="max-w-48 truncate">
                {nombreDelOrigen(origenes, lead.origenId) ?? VACIO}
              </TableCell>
              {columnas.map((campo) => (
                <TableCell key={campo.clave} className="max-w-48 truncate">
                  <CeldaDeCampo campo={campo} fila={lead} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
