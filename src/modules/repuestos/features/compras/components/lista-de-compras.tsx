'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { AbrirResumen, MasAcciones, TarjetaDeLista, type AccionDeMenu } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { TOPE_DE_COMPRAS, type FilaDeCompra } from '../../../entities/compras/compra'
import { verComprobante } from './ver-comprobante'

type Props = {
  filas: readonly FilaDeCompra[]
  hayMas: boolean
  // Sin `repuestos.costos.editar` o con el proyecto cerrado, la fila no abre ni ofrece «⋯» (8.11-3, C13).
  alEditar?: ((compra: FilaDeCompra) => void) | null
  alEliminar?: ((compra: FilaDeCompra) => void) | null
}

function accionesDe(
  compra: FilaDeCompra,
  { alEditar, alEliminar }: Pick<Props, 'alEditar' | 'alEliminar'>,
): AccionDeMenu[] {
  const acciones: AccionDeMenu[] = []
  if (alEditar) {
    acciones.push({
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      alElegir: () => {
        alEditar(compra)
      },
      despuesDeCerrar: true,
    })
  }
  if (alEliminar) {
    acciones.push({
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      alElegir: () => {
        alEliminar(compra)
      },
      despuesDeCerrar: true,
      destructiva: true,
    })
  }
  return acciones
}

// Las compras de un proyecto (8.11-2, C7), de la más reciente a la más vieja: proveedor, ítem, el monto en su moneda y, si no es la base, el
// equivalente que guardó la base (`monto_base`: acá nunca se calcula), y la fecha. Sin suma: el resultado del proyecto es el margen, que da la base.
// Una columna `minmax(0, 1fr)`: con el texto al 200 % nada ensancha la página. «Ver comprobante» pide la URL al tocarlo, nunca al leer la lista (8.11-3, C9).
export function ListaDeCompras({ filas, hayMas, alEditar, alEliminar }: Props) {
  const { monedaBase, zonaHoraria } = useRegional()
  if (filas.length === 0) {
    return <EstadoVacio titulo="Todavía no hay compras en este proyecto." compacto />
  }
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Compras del proyecto">
        {filas.map((compra) => {
          const acciones = accionesDe(compra, { alEditar, alEliminar })
          const titulo = compra.proveedor ?? 'Sin proveedor'
          const nombre = `compra de ${titulo} del ${formatearFecha(compra.fecha, { zona: zonaHoraria })}`
          return (
            <TarjetaDeLista
              key={compra.id}
              alAbrir={
                alEditar
                  ? () => {
                      alEditar(compra)
                    }
                  : undefined
              }
              acciones={
                acciones.length > 0 ? (
                  <MasAcciones nombre={nombre} acciones={acciones} id={`compra-${compra.id}-mas`} />
                ) : null
              }
            >
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                {alEditar ? (
                  <AbrirResumen nombre={nombre} className="min-w-0 font-medium break-words">
                    {titulo}
                  </AbrirResumen>
                ) : (
                  <span className="min-w-0 font-medium break-words">{titulo}</span>
                )}
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
              {compra.comprobanteRuta ? (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-no-abre=""
                    onClick={() => void verComprobante(compra.comprobanteRuta ?? '')}
                  >
                    Ver comprobante
                  </Button>
                </div>
              ) : null}
            </TarjetaDeLista>
          )
        })}
      </ul>
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_COMPRAS, { sustantivo: 'compras', articulo: 'las' })}
        />
      ) : null}
    </div>
  )
}
