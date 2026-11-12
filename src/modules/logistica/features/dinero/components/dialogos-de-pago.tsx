'use client'

import type { PanelesDePago } from '../hooks/use-paneles-de-pago'
import { ConfirmarEliminarPago } from './confirmar-eliminar-pago'
import { ConfirmarPago } from './confirmar-pago'
import { DrawerDeAnulacion } from './drawer-de-anulacion'
import { DrawerDePago } from './drawer-de-pago'

// Los cuatro paneles del hueco «Pagos»: el formulario, «Confirmar pago», «Eliminar» y «Anular pago». Cada uno vive en su URL (`?panel=…&pago=<id>`) y sólo abre si el estado del pago y el
// permiso lo dejan.
export function DialogosDePago({
  unidadId,
  paneles: p,
}: {
  unidadId: string
  paneles: PanelesDePago
}) {
  return (
    <>
      <DrawerDePago
        abierto={p.formulario.abierto}
        alCerrar={p.formulario.cerrar}
        unidadId={unidadId}
        original={p.formulario.nuevo ? null : p.formulario.original}
        apertura={p.formulario.apertura}
      />
      <ConfirmarPago
        abierto={p.confirmar.abierto}
        pago={p.confirmar.pago}
        alCerrar={p.confirmar.cerrar}
        confirmar={p.confirmarElPago}
      />
      <ConfirmarEliminarPago
        abierto={p.eliminar.abierto}
        pago={p.eliminar.pago}
        alCerrar={p.eliminar.cerrar}
        eliminar={p.eliminarElPago}
      />
      <DrawerDeAnulacion
        abierto={p.anular.abierto}
        alCerrar={p.anular.cerrar}
        unidadId={unidadId}
        pago={p.anular.pago}
        apertura={p.anular.apertura}
      />
    </>
  )
}
