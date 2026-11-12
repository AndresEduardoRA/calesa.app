'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVES_DEL_LOTE, PANEL_DEL_LOTE } from '../../../entities/mover/claves-del-lote'
import { useSeleccionDeLaCadena } from '../../nucleo/seleccion/use-seleccion-de-la-cadena'

function elegidos(n: number): string {
  return `${String(n)} ${n === 1 ? 'elegido' : 'elegidos'}`
}

// La barra del lote (6.04-3): fija abajo mientras haya elegidos. «N elegidos en «F»» (lo elige la persona, nunca un total de la base, y nunca más de 200), «Mover a…» abre el drawer del lote
// (`?panel=lote`; allí se elige el destino, D28) y «Limpiar» vacía la selección y devuelve el foco a las casillas. Anuncia el conteo con `aria-live`.
export function BarraDelLote() {
  const seleccion = useSeleccionDeLaCadena()
  const panel = usePanelPorUrl(PANEL_DEL_LOTE, CLAVES_DEL_LOTE)
  if (!seleccion) return null
  const { estado } = seleccion
  const n = estado.elegidos.size
  if (n === 0) return null
  return (
    <div
      data-barra-del-lote
      className="sticky bottom-2 z-10 grid gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 shadow-(--shadow-md)"
    >
      {estado.aviso ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {estado.aviso}
        </p>
      ) : null}
      {estado.recortada ? (
        <AvisoDeTope
          texto="Se eligieron las primeras 200."
          camino="Para mover el resto, repite con lo que queda."
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <p aria-live="polite" className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {elegidos(n)}
          {estado.fase ? ` en «${estado.fase.nombre}»` : ''}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 md:min-h-9"
            onClick={() => {
              seleccion.vaciar()
              requestAnimationFrame(() => {
                document.querySelector<HTMLElement>('[data-casilla]')?.focus()
              })
            }}
          >
            Limpiar
          </Button>
          <Button
            type="button"
            className="min-h-11 md:min-h-9"
            onClick={() => {
              panel.abrir()
            }}
          >
            Mover a…
          </Button>
        </div>
      </div>
    </div>
  )
}
