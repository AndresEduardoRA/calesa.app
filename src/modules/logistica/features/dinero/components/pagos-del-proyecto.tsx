'use client'

import { AmbitoDePagoContext } from '../hooks/ambito-de-pago'
import { CuerpoDePagos } from './cuerpo-de-pagos'

type Props = {
  proyectoId: string
  cerrado: boolean
  // Los da la página (D7): `repuestos.costos.editar` y `logistica.pagos.confirmar`. La base vuelve a exigirlos.
  puedeEditar: boolean
  puedeConfirmar: boolean
}

export const MOTIVO_SIN_PERMISO_DE_PAGOS =
  'Necesitas el permiso de editar costos para registrar pagos.'
export const MOTIVO_PROYECTO_CERRADO = 'El proyecto está cerrado: reábrelo para registrar pagos.'

// Los pagos del cliente de un proyecto de repuestos (8.13-5): la pestaña «Pagos» de `/repuestos/[id]`. El mismo cuerpo que el hueco del vehículo, en el ámbito `proyecto`:
// «Registrar pago» siempre a la vista (apagado con su motivo sin permiso o con el proyecto cerrado), sin «Anular» (8-13d) y sin «Ver todos» (no hay lista global de proyectos).
export function PagosDelProyecto({ proyectoId, cerrado, puedeEditar, puedeConfirmar }: Props) {
  const motivo = !puedeEditar
    ? MOTIVO_SIN_PERMISO_DE_PAGOS
    : cerrado
      ? MOTIVO_PROYECTO_CERRADO
      : null
  return (
    <AmbitoDePagoContext value="proyecto">
      <CuerpoDePagos
        unidadId={proyectoId}
        claves={{ puedeEditar, puedeConfirmar, puedeAnular: false }}
        registrar={{ visible: true, motivo }}
        vacio="Este proyecto no tiene pagos registrados."
        etiquetaDeLaLista="Pagos del proyecto"
        caminoDelTope={null}
      />
    </AmbitoDePagoContext>
  )
}
