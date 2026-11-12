'use client'

import { puede } from '@/shared/lib/permisos'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { usePermisosDeDinero } from '../hooks/use-permisos-de-dinero'
import { CuerpoDePagos } from './cuerpo-de-pagos'
import { VerTodosEnGastos } from './ver-todos-en-gastos'

// El hueco «Pagos» del panel de la unidad (6.11-2): la lista de sus pagos, «Registrar pago», la corrección y eliminación de los que no están confirmados, «Confirmar pago» con su sello y «Anular
// pago» de los confirmados. Sólo se dibuja con `logistica.pagos.ver` en el origen de la unidad y con la regla `pagos` del flujo activa (lo decide el panel). `logistica.pagos.editar` (del
// origen) enciende «Registrar», «Editar» y «Eliminar»; `logistica.pagos.confirmar` (global), «Confirmar» y «Anular»; la base lo vuelve a exigir. El cuerpo lo comparte con los pagos
// de un proyecto de repuestos (`CuerpoDePagos`, 8.13-5).
export function HuecoDePagos({ unidad }: { unidad: Unidad }) {
  const permisos = usePermisosDeDinero()
  const puedeEditar =
    permisos === null ? null : puede(permisos, 'logistica.pagos.editar', unidad.origenId)
  const puedeConfirmar = permisos === null ? null : puede(permisos, 'logistica.pagos.confirmar')

  return (
    <CuerpoDePagos
      unidadId={unidad.id}
      claves={{ puedeEditar, puedeConfirmar }}
      registrar={{ visible: puedeEditar === true, motivo: null }}
      vacio="Esta unidad no tiene pagos registrados."
      etiquetaDeLaLista="Pagos de la unidad"
      caminoDelTope={<VerTodosEnGastos vista="pagos" origenId={unidad.origenId} />}
    />
  )
}
