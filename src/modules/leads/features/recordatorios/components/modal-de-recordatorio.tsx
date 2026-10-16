'use client'

import { useAtajo } from '@/shared/ui/atajos'
import { Aviso } from '@/shared/ui/aviso'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Button } from '@/shared/ui/button'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import { Modal } from '@/shared/ui/modal'
import { useCierreConCambios } from '@/shared/ui/use-cierre-con-cambios'
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
}

const ID = 'recordatorio'

type Formulario = ReturnType<typeof useFormularioDeRecordatorio>

// Lo que pasa con el guardado, arriba de los campos. Si el recordatorio ya no se puede guardar (otra
// pestaña lo completó o lo eliminó), sólo eso.
function Avisos({
  noDisponible,
  formulario,
}: {
  noDisponible: string | null
  formulario: Formulario
}) {
  if (noDisponible) {
    return <Aviso tono="peligro">{noDisponible} Lo que escribiste no se guardó.</Aviso>
  }
  return (
    <AvisosDelFormulario
      enLinea={formulario.enLinea}
      esperandoConexion={formulario.esperandoConexion}
      enCurso={formulario.enCurso || formulario.recargando}
      conflicto={formulario.conflicto}
      aviso={formulario.aviso}
      detalleDelConflicto="No se guardó nada. Recargar trae su versión de ahora y conserva lo que escribiste."
      alReintentar={formulario.reintentar}
      alRecargar={formulario.recargar}
    />
  )
}

// Agendar o editar un recordatorio (`?panel=agendar-recordatorio` y `?panel=editar-recordatorio&
// recordatorio=<id>`): de qué es, cuándo y el vehículo. `Ctrl/Cmd+Enter` o `Ctrl/Cmd+S` guarda; Esc o
// «Cancelar» cierran y, con algo escrito, preguntan antes en el pie. Mientras guarda, nada se toca y
// el modal no se cierra. Quien lo monta le da una `key` por apertura: cada una empieza de nuevo.
export function ModalDeRecordatorio({
  abierto,
  alCerrar,
  leadId,
  zona,
  original,
  noDisponible,
  alGuardar,
  focoAlCerrar,
}: Props) {
  const formulario = useFormularioDeRecordatorio({ leadId, zona, original, abierto, alGuardar })
  const cierre = useCierreConCambios({
    hayCambios: formulario.hayCambios,
    alCerrar,
    alDescartar: formulario.descartarBorrador,
  })
  const { enCurso } = formulario
  // `Ctrl/Cmd+S` y `Ctrl/Cmd+Enter`: sólo abierto, sin guardar en curso, sin estar preguntando por
  // descartar y con algo que se pueda guardar.
  const conAtajos = abierto && !enCurso && !cierre.confirmando && noDisponible === null
  useAtajo('guardar', () => void formulario.enviar(), conAtajos)
  useAtajo('guardarYSeguir', () => void formulario.enviar(), conAtajos)
  const titulo = original ? 'Editar recordatorio' : 'Agendar recordatorio'

  return (
    <Modal
      abierto={abierto}
      alCerrar={cierre.intentarCerrar}
      titulo={titulo}
      descripcion="Sólo lo ves tú: un aviso para volver a este lead."
      bloqueado={enCurso}
      focoInicial={() => document.getElementById(`${ID}-titulo`)}
      focoAlCerrar={focoAlCerrar}
      pie={
        cierre.confirmando ? (
          <ConfirmarDescarte alSeguir={cierre.seguir} alDescartar={cierre.descartar} />
        ) : (
          <>
            <Button variant="ghost" onClick={cierre.intentarCerrar} disabled={enCurso}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID}
              disabled={enCurso || noDisponible !== null || formulario.conflicto !== null}
            >
              {enCurso ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        )
      }
    >
      <Avisos noDisponible={noDisponible} formulario={formulario} />
      <form
        id={ID}
        noValidate
        aria-label={titulo}
        onSubmit={(evento) => {
          evento.preventDefault()
          void formulario.enviar()
        }}
      >
        <fieldset disabled={enCurso} className="grid min-w-0 gap-3">
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
        </fieldset>
      </form>
    </Modal>
  )
}
