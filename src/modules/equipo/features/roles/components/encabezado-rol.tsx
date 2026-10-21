'use client'

import { LockIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { MOTIVO_ROL_NO_DOMINADO } from '../../../entities/dominancia'
import { motivoDeNoEliminar, personasConElRol, type RolConConcesiones } from '../../../entities/rol'
import { RoleBadge } from './role-badge'

type Props = {
  rol: RolConConcesiones
  // La persona gestiona roles (si no, no hay nada que ofrecerle).
  puedeGestionar: boolean
  // Domina este rol: cada permiso que el rol tiene, ella también.
  dominado: boolean
  alEliminar: () => void
}

// La cabecera de la columna de un rol: quién es, cuántas personas lo tienen y, si no se puede
// cambiar, por qué.
export function EncabezadoRol({ rol, puedeGestionar, dominado, alEliminar }: Props) {
  const motivo = motivoDeNoEliminar(rol, dominado)

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 py-1 font-normal md:min-w-36">
      <div className="flex items-center justify-between gap-2">
        <RoleBadge rol={rol} className="min-w-0" />
        {puedeGestionar ? (
          <span title={motivo ?? undefined} className="shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={
                motivo
                  ? `Eliminar el rol ${rol.nombre}. ${motivo}`
                  : `Eliminar el rol ${rol.nombre}`
              }
              disabled={motivo !== null}
              onClick={alEliminar}
            >
              <Trash2Icon aria-hidden />
            </Button>
          </span>
        ) : null}
      </div>
      <span className="text-(length:--text-xs) text-(--color-ink-faint)">
        {personasConElRol(rol.personas)}
      </span>
      {puedeGestionar && !dominado ? (
        <span className="flex items-start gap-1 text-(length:--text-xs) whitespace-normal text-(--color-ink-soft)">
          <LockIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
          {MOTIVO_ROL_NO_DOMINADO}
        </span>
      ) : null}
    </div>
  )
}
