'use client'

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { accionesSobre, nombreDePersona, type PersonaDelEquipo } from '../../../entities/persona'
import { FilaPersona } from './fila-persona'
import { MenuPersona } from './menu-persona'

type Props = {
  personas: readonly PersonaDelEquipo[]
  yoId: string
  // Sin el permiso de gestionar no hay menú de acciones: sólo se lee.
  puedeGestionar: boolean
  deshabilitado: boolean
  alVerRoles: (persona: PersonaDelEquipo) => void
  alCambiarBloqueo: (persona: PersonaDelEquipo, bloquear: boolean) => void
  alDarDeBaja: (persona: PersonaDelEquipo) => void
  alGenerarEnlace: (persona: PersonaDelEquipo) => void
}

// La lista: una fila por persona, con su menú de acciones si quien mira gestiona el equipo.
export function TablaEquipo(props: Props) {
  const { personas, yoId, puedeGestionar, deshabilitado } = props
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Persona</TableHead>
            <TableHead className="hidden md:table-cell">Roles</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personas.map((persona) => (
            <FilaPersona
              key={persona.id}
              persona={persona}
              esPropia={persona.id === yoId}
              acciones={
                puedeGestionar && persona.estado !== 'baja' ? (
                  <MenuPersona
                    nombre={nombreDePersona(persona)}
                    acciones={accionesSobre(persona, yoId)}
                    deshabilitado={deshabilitado}
                    alVerRoles={() => {
                      props.alVerRoles(persona)
                    }}
                    alCambiarBloqueo={(bloquear) => {
                      props.alCambiarBloqueo(persona, bloquear)
                    }}
                    alDarDeBaja={() => {
                      props.alDarDeBaja(persona)
                    }}
                    alGenerarEnlace={() => {
                      props.alGenerarEnlace(persona)
                    }}
                  />
                ) : null
              }
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
