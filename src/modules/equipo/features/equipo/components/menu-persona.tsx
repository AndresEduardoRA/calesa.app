'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { MOTIVO_CUENTA_PROPIA, type AccionesSobrePersona } from '../../../entities/persona'

// Alto de un renglón del menú: cómodo para el dedo en móvil, compacto con mouse.
const RENGLON = 'min-h-11 md:min-h-8'

type Props = {
  nombre: string
  acciones: AccionesSobrePersona
  deshabilitado: boolean
  alVerRoles: () => void
  alCambiarBloqueo: (bloquear: boolean) => void
  alDarDeBaja: () => void
  // Sólo con una invitación pendiente; lo llena quien dibuja la lista.
  alGenerarEnlace?: () => void
}

// Lo que se puede hacer sobre una persona. Lo que no aplica a su estado no aparece; sobre la
// cuenta propia se dice por qué no se la puede bloquear ni dar de baja.
export function MenuPersona(props: Props) {
  const { nombre, acciones, deshabilitado, alVerRoles, alCambiarBloqueo, alDarDeBaja } = props
  const { alGenerarEnlace } = props
  const bloqueo = acciones.bloqueo

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Acciones sobre ${nombre}`}
        disabled={deshabilitado}
        className="flex size-11 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:size-8"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {acciones.roles ? (
          <DropdownMenuItem className={RENGLON} onClick={alVerRoles}>
            Cambiar sus roles
          </DropdownMenuItem>
        ) : null}
        {acciones.enlace && alGenerarEnlace ? (
          <DropdownMenuItem className={RENGLON} onClick={alGenerarEnlace}>
            Generar otro enlace de invitación
          </DropdownMenuItem>
        ) : null}
        {bloqueo ? (
          <DropdownMenuItem
            className={RENGLON}
            onClick={() => {
              alCambiarBloqueo(bloqueo === 'bloquear')
            }}
          >
            {bloqueo === 'bloquear' ? 'Bloquear' : 'Desbloquear'}
          </DropdownMenuItem>
        ) : null}
        {acciones.baja ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={RENGLON} variant="destructive" onClick={alDarDeBaja}>
              Dar de baja
            </DropdownMenuItem>
          </>
        ) : null}
        {acciones.esPropia ? (
          // Un párrafo y no una etiqueta de menú: esas sólo valen dentro de un grupo.
          <p className="px-1.5 py-1.5 text-(length:--text-xs) text-(--color-ink-faint)">
            {MOTIVO_CUENTA_PROPIA}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
