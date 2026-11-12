'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import { TarjetaDeLista } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { TOPE_DE_COMPRAS, type FilaDeCompra } from '../../../entities/compras/compra'

type Props = {
  filas: readonly FilaDeCompra[]
  hayMas: boolean
}

// Las compras de un proyecto (8.11-2, C7), de la más reciente a la más vieja: proveedor, ítem, el monto en su moneda y, si no es la base, el
// equivalente que guardó la base (`monto_base`: acá nunca se calcula), y la fecha. Sin suma: el resultado del proyecto es el margen, que da la base.
// Una columna `minmax(0, 1fr)`: con el texto al 200 % nada ensancha la página. Registrar, editar, eliminar y el comprobante llegan con 8.11-3.
export function ListaDeCompras({ filas, hayMas }: Props) {
  const { monedaBase, zonaHoraria } = useRegional()
  if (filas.length === 0) {
    return <EstadoVacio titulo="Todavía no hay compras en este proyecto." compacto />
  }
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Compras del proyecto">
        {filas.map((compra) => (
          <TarjetaDeLista key={compra.id}>
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="min-w-0 font-medium break-words">
                {compra.proveedor ?? 'Sin proveedor'}
              </span>
              <span className="text-(length:--text-sm) text-(--color-ink-soft)">
                {formatearFecha(compra.fecha, { zona: zonaHoraria })}
              </span>
            </div>
            <p className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
              {compra.itemDescripcion ?? 'Sin ítem'}
            </p>
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-(length:--text-sm)">
              <Monto valor={compra.monto} moneda={compra.moneda} className="font-medium" />
              {compra.moneda !== monedaBase && compra.montoBase !== null ? (
                <span className="text-(--color-ink-soft)">
                  Equivale a <Monto valor={compra.montoBase} />
                </span>
              ) : null}
            </p>
          </TarjetaDeLista>
        ))}
      </ul>
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_COMPRAS, { sustantivo: 'compras', articulo: 'las' })}
        />
      ) : null}
    </div>
  )
}
