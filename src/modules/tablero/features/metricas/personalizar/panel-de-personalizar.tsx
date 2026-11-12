'use client'

import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { BotonesDeOrden } from '@/shared/ui/lista-de-catalogo/botones-de-orden'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { Switch } from '@/shared/ui/switch'
import type { WidgetOfrecido } from './tipos'
import { useGuardarDisposicion } from './use-guardar-disposicion'

type Props = {
  abierto: boolean
  alCerrar: () => void
  ofrecidos: readonly WidgetOfrecido[]
  hayPreferencia: boolean
  // Las claves en el orden del catálogo: a lo que vuelve «Restablecer».
  ordenDeFabrica: readonly string[]
}

const PREFIJO = 'tablero-widget'

// Elegir qué widgets se ven y en qué orden. Guarda al cambiar (no hay «Guardar»): `useGuardarDisposicion`.
export function PanelDePersonalizar({
  abierto,
  alCerrar,
  ofrecidos,
  hayPreferencia,
  ordenDeFabrica,
}: Props) {
  const disposicion = useGuardarDisposicion(ofrecidos, hayPreferencia, ordenDeFabrica)
  const { filas, guardando } = disposicion
  useFocoTrasMover(PREFIJO, disposicion.movimiento)

  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Personalizar el tablero"
      descripcion="Elige qué widgets ves y en qué orden. Se guarda al cambiar."
      focoAlCerrar={focoDeQuienAbrio}
      pie={
        <Button
          variant="ghost"
          disabled={guardando || !disposicion.conPreferencia}
          title={
            disposicion.conPreferencia ? undefined : 'Ya ves el tablero como viene de fábrica.'
          }
          onClick={disposicion.restablecer}
        >
          Restablecer
        </Button>
      }
    >
      <ul className="grid gap-1">
        {filas.map((fila, indice) => (
          <li
            key={fila.clave}
            className="flex items-center gap-3 rounded-(--radius-control) border border-(--color-line) px-3 py-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-(length:--text-base) text-(--color-ink)">
                {fila.titulo}
              </span>
              <span className="text-(length:--text-sm) text-(--color-ink-soft)">
                {fila.oculto ? 'Oculto' : 'Visible'}
              </span>
            </span>
            <Switch
              aria-label={`Mostrar ${fila.titulo}`}
              checked={!fila.oculto}
              disabled={guardando}
              onCheckedChange={() => {
                disposicion.alternar(fila.clave)
              }}
            />
            <BotonesDeOrden
              prefijo={PREFIJO}
              id={fila.clave}
              nombre={fila.titulo}
              puedeSubir={!guardando && indice > 0}
              puedeBajar={!guardando && indice < filas.length - 1}
              alMover={(direccion) => {
                disposicion.mover(fila.clave, direccion)
              }}
            />
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {disposicion.aviso}
      </p>
    </Drawer>
  )
}
