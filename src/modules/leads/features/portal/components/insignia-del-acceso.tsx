import type { AccesoVigente } from '../../../entities/portal'

const TEXTO: Record<AccesoVigente['estado'], { texto: string; clases: string }> = {
  activo: { texto: 'Activo', clases: 'bg-(--color-positivo-soft) text-(--color-positivo-ink)' },
  bloqueado: { texto: 'Bloqueado', clases: 'bg-(--color-aviso-soft) text-(--color-aviso-ink)' },
  revocado: { texto: 'Revocado', clases: 'bg-(--color-surface-3) text-(--color-ink-soft)' },
}

// El estado del acceso: siempre con su nombre, nunca sólo el color.
export function InsigniaDelAcceso({ estado }: { estado: AccesoVigente['estado'] }) {
  const { texto, clases } = TEXTO[estado]
  return (
    <span
      className={`inline-flex h-5 items-center rounded-(--radius-pill) px-2 text-(length:--text-xs) font-medium whitespace-nowrap ${clases}`}
    >
      {texto}
    </span>
  )
}
