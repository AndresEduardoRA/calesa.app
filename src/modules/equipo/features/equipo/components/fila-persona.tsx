'use client'

import { CeldaPegada, FilaDeLista } from '@/shared/ui/lista'
import { TableCell } from '@/shared/ui/table'
import type { PersonaDelEquipo } from '../../../entities/persona'
import { EstadoDePersona } from './estado-persona'
import { IdentidadDePersona } from './identidad-de-persona'
import { MenuDePersona, type AccionesDeLaLista } from './menu-persona'
import { RolesDePersona } from './roles-de-persona'

type Props = { persona: PersonaDelEquipo; lista: AccionesDeLaLista }

// Una persona en la tabla (desde 768 px): el nombre pegado a la izquierda y el «⋯» pegado a la derecha. La fila no abre ningún resumen (la
// persona se gestiona desde su menú): sin `alAbrir`.
export function FilaPersona({ persona, lista }: Props) {
  return (
    <FilaDeLista>
      <CeldaPegada lado="nombre">
        <IdentidadDePersona
          persona={persona}
          esPropia={persona.id === lista.yoId}
          className="w-64"
        />
      </CeldaPegada>
      <TableCell className="whitespace-normal">
        <RolesDePersona persona={persona} className="w-[22rem] max-w-full" />
      </TableCell>
      <TableCell>
        <EstadoDePersona
          estado={persona.estado}
          motivoDeBloqueo={persona.bloqueoMotivo}
          bajaEnCurso={persona.bajaEnCurso}
        />
      </TableCell>
      {lista.puedeGestionar ? (
        <CeldaPegada lado="acciones" className="text-right">
          <MenuDePersona persona={persona} lista={lista} />
        </CeldaPegada>
      ) : null}
    </FilaDeLista>
  )
}
