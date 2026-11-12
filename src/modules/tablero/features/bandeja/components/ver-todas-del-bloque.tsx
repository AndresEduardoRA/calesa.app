import type { Route } from 'next'
import Link from 'next/link'

// «Ver todas»: un enlace bajo la lista de un bloque, con el área táctil del resto de la bandeja. El bloque dice a dónde lleva.
export function VerTodasDelBloque({ ruta }: { ruta: string }) {
  return (
    <Link
      href={ruta as Route}
      className="flex min-h-11 items-center border-t border-(--color-line) px-4 text-(length:--text-sm) text-(--color-primario) underline underline-offset-2 hover:bg-(--color-surface-muted) focus-visible:bg-(--color-surface-muted) md:min-h-9"
    >
      Ver todas
    </Link>
  )
}
