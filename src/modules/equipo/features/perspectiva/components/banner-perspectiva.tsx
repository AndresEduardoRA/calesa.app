'use client'

import { EyeIcon } from 'lucide-react'
import { usePerspectiva } from '../hooks/use-perspectiva'

// Mientras se mira la app como otro rol, esto queda fijo arriba de todo: nadie se olvida de que
// lo que ve no es lo suyo, y «Salir» está siempre a mano.
export function BannerPerspectiva() {
  const { rol, salir, enCurso } = usePerspectiva()
  if (!rol) {
    return null
  }
  return (
    <div
      role="status"
      title="Sólo cambia lo que ves. Tus permisos reales siguen siendo los tuyos."
      className="sticky top-(--topbar) z-20 flex min-h-11 flex-wrap items-center justify-center gap-x-2 border-b border-(--color-line) bg-(--color-aviso-soft) px-4 text-(length:--text-sm) text-(--color-aviso-ink) md:min-h-9"
    >
      <EyeIcon aria-hidden className="size-4 shrink-0" />
      <span>
        Viendo como <strong className="font-semibold">{rol.nombre}</strong>
      </span>
      <span aria-hidden>·</span>
      <button
        type="button"
        className="min-h-11 font-medium underline underline-offset-2 outline-none focus-visible:shadow-(--shadow-focus) disabled:opacity-60 md:min-h-0"
        disabled={enCurso}
        onClick={() => void salir()}
      >
        Salir
      </button>
    </div>
  )
}
