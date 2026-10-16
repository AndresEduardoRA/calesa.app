'use client'

import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { useFormularioDeRecordatorio } from '../hooks/use-formulario-de-recordatorio'
import { CamposDelRecordatorio } from './campos-del-recordatorio'

type Props = {
  abierto: boolean
  alCerrar: () => void
  leadId: string
  zona: string
  // Nulo = agendar. Al editar, el de la lista en su última versión.
  original: Recordatorio | null
  // Con el modal abierto se completó o se eliminó (otra pestaña): por qué ya no se guarda.
  noDisponible: string | null
  alGuardar: (recordatorio: ResultadoDeRecordatorio['recordatorio']) => void
  // A dónde vuelve el foco al cerrar (el botón que lo abrió).
  focoAlCerrar: () => HTMLElement | boolean
  // «Recargar» tras un conflicto, si quien lo monta no lee la página en el servidor (el drawer).
  alRecargar?: () => void
}

const ID = 'recordatorio'

// Agendar o editar un recordatorio (`?panel=agendar-recordatorio` y `?panel=editar-recordatorio&
// recordatorio=<id>`): de qué es, cuándo y el vehículo. El contrato del modal (guardar con los atajos,
// preguntar antes de cerrar con algo escrito, no cerrarse mientras guarda) es de `ModalDeFormulario`.
// Quien lo monta le da una `key` por apertura: cada una empieza de nuevo.
export function ModalDeRecordatorio({
  abierto,
  alCerrar,
  leadId,
  zona,
  original,
  noDisponible,
  alGuardar,
  focoAlCerrar,
  alRecargar,
}: Props) {
  const formulario = useFormularioDeRecordatorio({
    leadId,
    zona,
    original,
    abierto,
    alGuardar,
    alRecargar,
  })
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar recordatorio' : 'Agendar recordatorio'}
      descripcion="Sólo lo ves tú: un aviso para volver a este lead."
      focoInicial={() => document.getElementById(`${ID}-titulo`)}
      focoAlCerrar={focoAlCerrar}
      formulario={formulario}
      noDisponible={noDisponible}
      detalleDelConflicto="No se guardó nada. Recargar trae su versión de ahora y conserva lo que escribiste."
    >
      <CamposDelRecordatorio
        id={ID}
        zona={zona}
        valores={formulario}
        errores={formulario.errores}
        original={original}
        alCambiarTitulo={formulario.cambiarTitulo}
        alCambiarCuando={formulario.cambiarCuando}
        alCambiarVehiculo={formulario.cambiarVehiculo}
      />
    </ModalDeFormulario>
  )
}
