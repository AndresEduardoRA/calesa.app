'use client'

import { cn } from 'cn'
import type { PersonaDelEquipo } from '../../../entities/persona'
import { RoleBadge } from '../../roles/components/role-badge'

type Props = { persona: PersonaDelEquipo; className?: string }

// Los roles de una persona, uno al lado del otro y, si no caben, en otra línea: ocho roles de nombre largo no ensanchan nada.
export function RolesDePersona({ persona, className }: Props) {
  if (persona.roles.length === 0) {
    return <span className="text-(length:--text-sm) text-(--color-ink-faint)">Sin rol</span>
  }
  return (
    <span className={cn('flex min-w-0 flex-wrap gap-1', className)}>
      {persona.roles.map((rol) => (
        <RoleBadge key={rol.id} rol={rol} />
      ))}
    </span>
  )
}
