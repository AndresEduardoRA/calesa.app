'use client'

import { Button } from '@/shared/ui/button'
import { formatearFecha } from '@/shared/lib/fechas'
import { AbrirResumen, MasAcciones, TarjetaDeLista, type AccionDeMenu } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { AccionesDelPago } from '../../../entities/dinero/acciones-del-pago'
import { textoDelSello, type Pago } from '../../../entities/dinero/pago'
import { verComprobante } from './ver-comprobante'

type Props = {
  pago: Pago
  // Lo decide `accionesDelPago`: un confirmado nunca ofrece editar ni eliminar.
  acciones: AccionesDelPago
  alEditar: () => void
  alEliminar: () => void
  alConfirmar: () => void
  alAnular: () => void
}

function accionesDeMenu({ acciones, alEditar, alEliminar, alAnular }: Props): AccionDeMenu[] {
  const menu: AccionDeMenu[] = []
  if (acciones.editar) {
    menu.push({
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      alElegir: alEditar,
      despuesDeCerrar: true,
    })
  }
  if (acciones.eliminar) {
    menu.push({
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      alElegir: alEliminar,
      despuesDeCerrar: true,
      destructiva: true,
    })
  }
  if (acciones.anular) {
    menu.push({
      tipo: 'accion',
      clave: 'anular',
      etiqueta: 'Anular pago',
      alElegir: alAnular,
      despuesDeCerrar: true,
      destructiva: true,
    })
  }
  return menu
}

// Un pago de la unidad: concepto, fecha, método, el monto en su moneda y, si no es la base, el equivalente que guardó la base (`monto_base`: acá nunca se calcula). Sin confirmar dice
// «Sin confirmar» y, con la clave, ofrece «Confirmar pago»; confirmado muestra el sello (quién y cuándo) y ningún control de edición.
export function FilaDePago(props: Props) {
  const { pago, acciones, alEditar, alConfirmar } = props
  const { monedaBase, zonaHoraria } = useRegional()
  const menu = accionesDeMenu(props)
  const nombre = `pago ${pago.concepto}`
  const sello = textoDelSello(pago, zonaHoraria)
  return (
    <TarjetaDeLista
      alAbrir={acciones.editar ? alEditar : undefined}
      acciones={
        menu.length > 0 ? (
          <MasAcciones nombre={nombre} acciones={menu} id={`pago-${pago.id}-mas`} />
        ) : null
      }
    >
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {acciones.editar ? (
          <AbrirResumen nombre={nombre} className="min-w-0 font-medium break-words">
            {pago.concepto}
          </AbrirResumen>
        ) : (
          <span className="min-w-0 font-medium break-words">{pago.concepto}</span>
        )}
        <span className="text-(length:--text-sm) text-(--color-ink-soft)">
          {formatearFecha(pago.fecha, { zona: zonaHoraria })}
        </span>
      </div>
      {pago.metodo ? (
        <p className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
          {pago.metodo}
        </p>
      ) : null}
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-(length:--text-sm)">
        <Monto valor={pago.monto} moneda={pago.moneda} className="font-medium" />
        {pago.moneda !== monedaBase ? (
          <span className="text-(--color-ink-soft)">
            Equivale a <Monto valor={pago.montoBase} />
          </span>
        ) : null}
      </p>
      <p
        className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)"
        data-sello={sello === null ? 'sin-confirmar' : 'confirmado'}
      >
        {sello ?? 'Sin confirmar'}
      </p>
      {acciones.confirmar || pago.comprobanteRuta ? (
        <div className="flex flex-wrap gap-2">
          {acciones.confirmar ? (
            <Button variant="outline" size="sm" data-no-abre="" onClick={alConfirmar}>
              Confirmar pago
            </Button>
          ) : null}
          {pago.comprobanteRuta ? (
            <Button
              variant="outline"
              size="sm"
              data-no-abre=""
              onClick={() => void verComprobante(pago.comprobanteRuta ?? '')}
            >
              Ver comprobante
            </Button>
          ) : null}
        </div>
      ) : null}
    </TarjetaDeLista>
  )
}
