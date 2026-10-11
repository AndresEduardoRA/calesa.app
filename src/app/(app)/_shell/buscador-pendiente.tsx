import { SearchIcon } from 'lucide-react'

// El lugar del buscador global. Todavía no busca: está a la vista, deshabilitado y dice por qué.
// Cuando exista la paleta (módulo `buscador`), este botón la abre y registra
// `useAtajo('buscar', abrir)`; el atajo ya está en el catálogo (`src/shared/lib/atajos.ts`).
export function BuscadorPendiente() {
  return (
    <button
      type="button"
      aria-disabled="true"
      title="El buscador todavía no está disponible"
      className="flex h-9 min-w-0 flex-1 cursor-not-allowed items-center gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) px-2.5 text-(length:--text-sm) text-(--color-ink-faint) md:max-w-sm"
    >
      <SearchIcon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">Buscar</span>
      <kbd className="ml-auto hidden rounded-(--radius-sm) border border-(--color-line) px-1.5 font-mono text-(length:--text-xs) md:inline">
        Ctrl K
      </kbd>
    </button>
  )
}
