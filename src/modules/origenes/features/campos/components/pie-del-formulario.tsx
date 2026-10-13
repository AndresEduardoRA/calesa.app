import { Button } from '@/shared/ui/button'
import type { ResumenDeImpacto } from '../../../entities/impacto'

type Props = {
  esNuevo: boolean
  puedeEliminar: boolean
  aviso: { modo: 'guardar' | 'eliminar'; resumen: ResumenDeImpacto } | null
  enCurso: boolean
  alCancelar: () => void
  alPedirEliminar: () => void
  alConfirmarEliminar: () => void
}

function etiquetaDeGuardar(esNuevo: boolean, enCurso: boolean, hayAviso: boolean): string {
  if (enCurso) {
    return 'Guardando…'
  }
  if (hayAviso) {
    return 'Confirmar y guardar'
  }
  return esNuevo ? 'Crear campo' : 'Guardar'
}

// Los botones del formulario de un campo. Eliminar pide primero contar: con datos no se puede y el
// aviso manda a desactivar; sin datos, una segunda pulsación lo confirma.
export function PieDelFormulario(props: Props) {
  const {
    esNuevo,
    puedeEliminar,
    aviso,
    enCurso,
    alCancelar,
    alPedirEliminar,
    alConfirmarEliminar,
  } = props
  const eliminando = aviso?.modo === 'eliminar'
  const bloqueado = enCurso || aviso?.resumen.bloquea === true
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {puedeEliminar && !eliminando ? (
        <Button
          variant="outline"
          className="mr-auto h-11 md:h-8"
          disabled={enCurso}
          onClick={alPedirEliminar}
        >
          Eliminar campo
        </Button>
      ) : null}
      <Button variant="outline" className="h-11 md:h-8" onClick={alCancelar} disabled={enCurso}>
        Cancelar
      </Button>
      {eliminando ? (
        <Button
          variant="destructive"
          className="h-11 md:h-8"
          disabled={bloqueado}
          onClick={alConfirmarEliminar}
        >
          Sí, eliminar el campo
        </Button>
      ) : (
        <Button type="submit" className="h-11 md:h-8" disabled={bloqueado}>
          {etiquetaDeGuardar(esNuevo, enCurso, aviso !== null)}
        </Button>
      )}
    </div>
  )
}
