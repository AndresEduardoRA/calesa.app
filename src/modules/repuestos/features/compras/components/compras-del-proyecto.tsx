'use client'

import { Button } from '@/shared/ui/button'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import { motivoParaNoEscribirCompras } from '../../../entities/compras/acciones'
import { usePanelDeCompra } from '../hooks/use-panel-de-compra'
import type { ItemParaCompra, MonedaParaCompra } from './campos-de-compra'
import { ListaDeCompras } from './lista-de-compras'
import { PanelDeCompra } from './panel-de-compra'

type Props = {
  filas: readonly FilaDeCompra[]
  hayMas: boolean
  proyectoId: string
  items: readonly ItemParaCompra[]
  monedas: readonly MonedaParaCompra[]
  // Lo calcula el servidor con `puede()`; apagar es comodidad: la action y la base lo vuelven a exigir.
  puedeEditarCostos: boolean
  cerrado: boolean
}

const ID_DEL_MOTIVO = 'compras-motivo-apagado'

// Las compras de un proyecto con sus acciones (8.11-3, C13): un solo «Registrar compra» arriba de la lista (también vacía, D6), apagado con su motivo escrito al lado
// si no se puede escribir; «Editar» en la fila sólo si se puede. El formulario vive en la URL y su código se pide al abrirlo.
export function ComprasDelProyecto({
  filas,
  hayMas,
  proyectoId,
  items,
  monedas,
  puedeEditarCostos,
  cerrado,
}: Props) {
  const motivo = motivoParaNoEscribirCompras({ puedeEditarCostos, cerrado })
  const panel = usePanelDeCompra(filas, motivo)
  const puede = motivo === null
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          disabled={!puede}
          aria-describedby={puede ? undefined : ID_DEL_MOTIVO}
          onClick={panel.abrirNueva}
        >
          Registrar compra
        </Button>
        {motivo ? (
          <p id={ID_DEL_MOTIVO} className="text-(length:--text-sm) text-(--color-ink-soft)">
            {motivo}
          </p>
        ) : null}
      </div>
      <ListaDeCompras
        filas={filas}
        hayMas={hayMas}
        alEditar={
          puede
            ? (compra) => {
                panel.abrirEdicion(compra.id)
              }
            : null
        }
      />
      <PanelDeCompra panel={panel} proyectoId={proyectoId} items={items} monedas={monedas} />
    </div>
  )
}
