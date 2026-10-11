'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = { puedeGestionar: boolean; alCrearRol: () => void }

export function CabeceraMatriz({ puedeGestionar, alCrearRol }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">
          Roles y permisos
        </h1>
        <p className="max-w-2xl text-(length:--text-sm) text-(--color-ink-soft)">
          {puedeGestionar
            ? 'Cada cambio se guarda solo. Sólo puedes dar permisos que tú tienes: lo que no puedes cambiar aparece deshabilitado.'
            : 'Qué puede hacer cada rol. Para cambiarlo hace falta el permiso de gestionar roles.'}
        </p>
      </div>
      {puedeGestionar ? (
        <Button className="h-11 md:h-9" onClick={alCrearRol}>
          <PlusIcon aria-hidden />
          Nuevo rol
        </Button>
      ) : null}
    </div>
  )
}
