'use client'

import type { ReactNode } from 'react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

// El marco de la lista: las columnas. Las filas son <FilaPersona>.
export function TablaEquipo({ children }: { children: ReactNode }) {
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
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  )
}
