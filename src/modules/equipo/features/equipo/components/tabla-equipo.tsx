'use client'

import { CabeceraPegada, TablaDeLista } from '@/shared/ui/lista'
import { TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { PersonaDelEquipo } from '../../../entities/persona'
import { FilaPersona } from './fila-persona'
import type { AccionesDeLaLista } from './menu-persona'

type Props = { personas: readonly PersonaDelEquipo[]; lista: AccionesDeLaLista }

// La lista desde 768 px: una fila por persona, con su «⋯» si quien mira gestiona el equipo. Por debajo, `tarjetas-equipo.tsx`.
export function TablaEquipo({ personas, lista }: Props) {
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Persona</CabeceraPegada>
          <TableHead>Roles</TableHead>
          <TableHead>Estado</TableHead>
          {lista.puedeGestionar ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {personas.map((persona) => (
          <FilaPersona key={persona.id} persona={persona} lista={lista} />
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
