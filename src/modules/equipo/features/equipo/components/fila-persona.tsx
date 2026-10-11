'use client'

import type { ReactNode } from 'react'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { Avatar } from '@/shared/ui/avatar'
import { TableCell, TableRow } from '@/shared/ui/table'
import { nombreDePersona, type PersonaDelEquipo } from '../../../entities/persona'
import { RoleBadge } from '../../roles/components/role-badge'
import { EstadoDePersona } from './estado-persona'

type Props = {
  persona: PersonaDelEquipo
  esPropia: boolean
  // El menú de acciones, si quien mira gestiona el equipo.
  acciones: ReactNode
}

function Roles({ persona }: { persona: PersonaDelEquipo }) {
  if (persona.roles.length === 0) {
    return <span className="text-(length:--text-sm) text-(--color-ink-faint)">Sin rol</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {persona.roles.map((rol) => (
        <RoleBadge key={rol.id} rol={rol} />
      ))}
    </span>
  )
}

// Una persona del equipo: quién es, qué roles tiene y en qué estado está su cuenta.
export function FilaPersona({ persona, esPropia, acciones }: Props) {
  const nombre = nombreDePersona(persona)
  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-3 py-1">
          <Avatar nombre={nombre} url={urlPublicaONull('avatares', persona.avatarRuta)} lado={32} />
          <div className="grid min-w-0 gap-0.5">
            <span className="truncate text-(length:--text-sm) font-medium text-(--color-ink)">
              {nombre}
              {esPropia ? (
                <span className="font-normal text-(--color-ink-faint)"> (tú)</span>
              ) : null}
            </span>
            <span className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
              {persona.email}
            </span>
            {/* En móvil no hay columna de roles: van acá. */}
            <span className="md:hidden">
              <Roles persona={persona} />
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden whitespace-normal md:table-cell">
        <Roles persona={persona} />
      </TableCell>
      <TableCell>
        <EstadoDePersona estado={persona.estado} motivoDeBloqueo={persona.bloqueoMotivo} />
      </TableCell>
      <TableCell className="w-px text-right">{acciones}</TableCell>
    </TableRow>
  )
}
