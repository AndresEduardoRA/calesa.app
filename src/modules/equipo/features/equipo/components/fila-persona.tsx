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
// persona se gestiona desde su menú): sin `alAbrir`. La columna de la persona crece con lo que sobra de la tabla (36 % de su caja, entre 16 y
// 26 rem) y la de los roles cede (28 %, entre 14 y 22 rem): un correo de 38 letras se ve entero al 100 % en escritorio. Los pisos son en rem:
// con el texto al 200 % ya no sobra nada y la persona mide lo de antes (16 rem); los roles bajan a su piso y se parten en más líneas.
export function FilaPersona({ persona, lista }: Props) {
  return (
    <FilaDeLista>
      <CeldaPegada lado="nombre">
        <IdentidadDePersona
          persona={persona}
          esPropia={persona.id === lista.yoId}
          className="w-[clamp(16rem,36cqw,26rem)]"
        />
      </CeldaPegada>
      <TableCell className="whitespace-normal">
        <RolesDePersona persona={persona} className="w-[clamp(14rem,28cqw,22rem)] max-w-full" />
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
