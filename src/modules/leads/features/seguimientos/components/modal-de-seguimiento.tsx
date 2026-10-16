'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { Recordatorio } from '../../../entities/recordatorios'
import { ETIQUETA_DE_VISIBLE, type Seguimiento } from '../../../entities/seguimiento'
import { useFormularioDeSeguimiento } from '../hooks/use-formulario-de-seguimiento'
import { CamposDelSeguimiento } from './campos-del-seguimiento'

type Props = {
  abierto: boolean
  alCerrar: () => void
  leadId: string
  // Los activos. Al editar, el tipo que ya tiene (aunque esté apagado) se ofrece igual.
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  // Nulo = anotar. Al editar, el de la lista en su última versión.
  original: Seguimiento | null
  // Con el modal abierto dejó de estar (otra pestaña lo eliminó): por qué ya no se guarda.
  noDisponible: string | null
  // Con el próximo contacto que entró junto, si se pidió uno.
  alGuardar: (seguimiento: Seguimiento, recordatorio: Recordatorio | null) => void
  // A dónde vuelve el foco al cerrar (el botón que lo abrió).
  focoAlCerrar: () => HTMLElement | boolean
  // «Recargar» tras un conflicto: vuelve a leer la línea de tiempo.
  recargar: () => void
  recargando: boolean
}

const ID = 'seguimiento'

// Anotar o editar un seguimiento (`?panel=anotar-seguimiento` y `?panel=editar-seguimiento&
// seguimiento=<id>`): tipo, cuándo fue, resumen, detalle con formato, si lo ve el cliente, el vehículo
// (si quien lo monta los provee) y, al anotar, el próximo contacto plegado. Lo sirve igual la ficha,
// la pestaña «Seguimientos» del drawer y la tabla. El contrato del modal (guardar con los atajos,
// preguntar antes de cerrar con algo escrito, no cerrarse mientras guarda) es de `ModalDeFormulario`.
// Quien lo monta le da una `key` por apertura: cada una empieza de nuevo, con un id de intento nuevo.
export function ModalDeSeguimiento({
  abierto,
  alCerrar,
  leadId,
  tipos,
  zona,
  original,
  noDisponible,
  alGuardar,
  focoAlCerrar,
  recargar,
  recargando,
}: Props) {
  const formulario = useFormularioDeSeguimiento({
    leadId,
    tipos,
    zona,
    original,
    abierto,
    alGuardar,
    recargar,
    recargando,
  })
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar seguimiento' : 'Anotar seguimiento'}
      descripcion={`Queda en la línea de tiempo de este lead. Sólo lo ves tú, salvo que lo marques «${ETIQUETA_DE_VISIBLE}».`}
      ancho="amplio"
      focoInicial={() => document.getElementById(`${ID}-titulo`)}
      focoAlCerrar={focoAlCerrar}
      formulario={formulario}
      noDisponible={noDisponible ?? formulario.noDisponible}
      detalleDelConflicto="No se guardó nada. Recargar trae la versión de ahora y conserva lo que escribiste."
    >
      <CamposDelSeguimiento
        id={ID}
        valores={formulario.valores}
        errores={formulario.errores}
        cambiar={formulario.cambiar}
        tipos={tipos}
        zona={zona}
        deshabilitado={formulario.enCurso}
        original={original}
        conVisible
        conVehiculo
      />
    </ModalDeFormulario>
  )
}
