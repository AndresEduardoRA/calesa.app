'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { camposDeTabla } from '../../../entities/listado'
import type { FilaDeLead } from '../../../entities/listado'
import { MenuDeLead } from '../../marcas/components/menu-de-lead'
import { BadgeDeTipo } from './badge-de-tipo'
import { CeldaDeCampo } from './celda-de-campo'
import { NombreDeFila } from './nombre-de-fila'
import { telefonoDeLista } from './telefono-de-lista'
import { accionesDelMenu, type DatosDeLaLista, nombreDelOrigen, type ParaMarcar } from './tipos'

type Props = DatosDeLaLista & {
  leads: readonly FilaDeLead[]
  alAbrir: (id: string) => void
  // El lead abierto en el drawer, para marcarlo.
  abierto: string | null
  marcar: ParaMarcar
}

const VACIO = <span className="text-(--color-ink-faint)">—</span>

// La columna del nombre queda pegada a la izquierda mientras el resto se desplaza dentro de la tarjeta (cierre 2). Opaca, para que lo
// que pasa por debajo no se transparente, y con el color de la fila al pasar el puntero o al estar abierta en el drawer.
const NOMBRE_PEGADO =
  'sticky left-0 z-10 min-w-64 bg-(--color-surface) shadow-[inset_-1px_0_0_var(--color-line)]'
const NOMBRE_DE_FILA =
  'group-hover:bg-[color-mix(in_oklab,var(--color-surface-2)_50%,var(--color-surface))] group-data-[state=selected]:bg-(--color-surface-2)'

function EncabezadoDeLaTabla({ columnas }: { columnas: ReturnType<typeof camposDeTabla> }) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className={`pl-3 ${NOMBRE_PEGADO}`}>Nombre</TableHead>
        <TableHead>Teléfono</TableHead>
        <TableHead>Tipo</TableHead>
        <TableHead>Origen del lead</TableHead>
        {columnas.map((campo) => (
          <TableHead key={campo.clave}>{campo.etiqueta}</TableHead>
        ))}
        <TableHead className="w-12 pr-2">
          <span className="sr-only">Marcas</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

// Los leads en escritorio: nombre (con las marcas de quien mira), teléfono, tipo y origen, una
// columna por cada campo «en la tabla» del layout y el «⋯» de las marcas. Elegir una fila abre el
// drawer rápido (`?lead=`). La tabla es tan ancha como lo pidan sus columnas (el nombre nunca se achica para que quepan) y se
// desplaza dentro de la tarjeta, con la columna del nombre a la vista.
export function TablaDeLeads(props: Props) {
  const { leads, campos, origenes, codigoDePais, etiquetas, alAbrir, abierto, marcar } = props
  const columnas = camposDeTabla(campos)
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      <Table className="w-max min-w-full">
        <EncabezadoDeLaTabla columnas={columnas} />
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              data-state={abierto === lead.id ? 'selected' : undefined}
              className="group h-(--fila) cursor-pointer"
              onClick={() => {
                alAbrir(lead.id)
              }}
            >
              <TableCell className={`py-1 pl-3 ${NOMBRE_PEGADO} ${NOMBRE_DE_FILA}`}>
                <NombreDeFila
                  lead={lead}
                  etiquetas={etiquetas}
                  nombre={(clases) => (
                    <button
                      type="button"
                      title={lead.nombre}
                      className={`max-w-72 text-left underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus) ${clases}`}
                      onClick={(evento) => {
                        evento.stopPropagation()
                        alAbrir(lead.id)
                      }}
                    >
                      {lead.nombre}
                    </button>
                  )}
                />
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
              <TableCell className="py-1 pr-2">
                <MenuDeLead
                  leadId={lead.id}
                  nombre={lead.nombre}
                  marcas={lead.marcas}
                  etiquetas={marcar.etiquetas}
                  alGestionar={marcar.alGestionar}
                  puedeEnviar={marcar.eliminables.includes(lead.id)}
                  acciones={accionesDelMenu(marcar, lead)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
