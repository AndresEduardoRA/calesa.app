'use client'

import { TarjetaDeLista } from '@/shared/ui/lista'
import type { PersonaDelEquipo } from '../../../entities/persona'
import { EstadoDePersona } from './estado-persona'
import { IdentidadDePersona } from './identidad-de-persona'
import { MenuDePersona, type AccionesDeLaLista } from './menu-persona'
import { RolesDePersona } from './roles-de-persona'

type Props = { personas: readonly PersonaDelEquipo[]; lista: AccionesDeLaLista }

// La lista por debajo de 768 px: una tarjeta por persona. Una columna `minmax(0, 1fr)` (una `auto` toma el ancho de lo que no se parte y
// empuja el «⋯» fuera de la vista con el texto al 200 %); el nombre y el correo se cortan con «…», los roles envuelven, el «⋯» no se achica.
export function TarjetasEquipo({ personas, lista }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {personas.map((persona) => (
        <TarjetaDeLista
          key={persona.id}
          acciones={<MenuDePersona persona={persona} lista={lista} />}
        >
          <IdentidadDePersona persona={persona} esPropia={persona.id === lista.yoId} />
          <RolesDePersona persona={persona} />
          <EstadoDePersona
            estado={persona.estado}
            motivoDeBloqueo={persona.bloqueoMotivo}
            bajaEnCurso={persona.bajaEnCurso}
          />
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
