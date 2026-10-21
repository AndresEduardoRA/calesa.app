'use client'

import { urlPublicaONull } from '@/shared/lib/almacen'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from 'cn'
import { nombreDePersona, type PersonaDelEquipo } from '../../../entities/persona'

type Props = {
  persona: PersonaDelEquipo
  esPropia: boolean
  // El ancho que le toca: la tabla le fija uno (el nombre pegado a la izquierda no puede crecer con lo que lleva), la tarjeta, el que sobra.
  className?: string
}

// Quién es: su foto, su nombre y su correo. El nombre y el correo se cortan con «…» (y dicen su texto entero al pasar el puntero): una
// persona con un nombre de 70 letras o un correo largo no ensancha la fila ni empuja el «⋯» fuera de la vista.
export function IdentidadDePersona({ persona, esPropia, className }: Props) {
  const nombre = nombreDePersona(persona)
  return (
    <div className={cn('flex min-w-0 items-center gap-3 py-1', className)}>
      {/* La miniatura de 96 px (cierre 1); mientras el relleno no la hizo, el avatar entero. */}
      <Avatar
        nombre={nombre}
        url={urlPublicaONull('avatares', persona.avatarMiniaturaRuta ?? persona.avatarRuta)}
        lado={32}
      />
      <div className="grid min-w-0 gap-0.5">
        <span
          title={nombre}
          data-nombre-de-persona
          className="truncate text-(length:--text-sm) font-medium text-(--color-ink)"
        >
          {nombre}
          {esPropia ? <span className="font-normal text-(--color-ink-faint)"> (tú)</span> : null}
        </span>
        <span
          title={persona.email}
          className="truncate text-(length:--text-xs) text-(--color-ink-soft)"
        >
          {persona.email}
        </span>
      </div>
    </div>
  )
}
