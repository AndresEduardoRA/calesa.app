import { SearchIcon } from 'lucide-react'

// El lugar del buscador global. Todavía no busca: está a la vista, deshabilitado y dice por qué.
// Cuando exista la paleta (módulo `buscador`), este botón la abre y registra
// `useAtajo('buscar', abrir)`; el atajo ya está en el catálogo (`src/shared/lib/atajos.ts`).
//
// Es opcional en la barra del celular (`.claude/rules/ui.md`): con la barra de menos de 24 rem (el celular con el texto al 200 %) queda
// sólo el icono, en un blanco de 44 px (en px, no en rem: en rem se duplicaba con el texto) y con su nombre; desde 24 rem, el icono y
// «Buscar» entero. La barra es el `@container` (`marco.tsx`), no la ventana. El buscador de la Fase 7 hereda la regla.
export function BuscadorPendiente() {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label="Buscar"
      title="El buscador todavía no está disponible"
      className="flex h-[44px] w-[44px] shrink-0 cursor-not-allowed items-center justify-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) text-(length:--text-sm) text-(--color-ink-faint) md:h-9 md:max-w-none @min-[24rem]:w-auto @min-[24rem]:min-w-0 @min-[24rem]:flex-1 @min-[24rem]:justify-start @min-[24rem]:gap-2 @min-[24rem]:px-2.5 md:@min-[24rem]:max-w-sm"
    >
      <SearchIcon aria-hidden className="size-4 shrink-0" />
      <span aria-hidden className="hidden @min-[24rem]:inline">
        Buscar
      </span>
      <kbd
        aria-hidden
        className="ml-auto hidden rounded-(--radius-sm) border border-(--color-line) px-1.5 font-mono text-(length:--text-xs) md:@min-[24rem]:inline"
      >
        Ctrl K
      </kbd>
    </button>
  )
}
