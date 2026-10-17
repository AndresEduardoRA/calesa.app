import { Button } from '@/shared/ui/button'
import { PieConSalida } from '@/shared/ui/pie-con-salida'

type Props = {
  esNueva: boolean
  puedeEliminar: boolean
  eliminando: boolean
  enCurso: boolean
  alCancelar: () => void
  alPedirEliminar: () => void
  alConfirmarEliminar: () => void
}

// Los botones del panel de una categoría. Eliminar pide una segunda pulsación: no hay otro modal.
export function PieDeCategoria(props: Props) {
  const { esNueva, puedeEliminar, eliminando, enCurso } = props
  return (
    <PieConSalida className="flex flex-wrap justify-end gap-2">
      {puedeEliminar && !eliminando ? (
        <Button
          variant="outline"
          className="mr-auto h-11 md:h-8"
          disabled={enCurso}
          onClick={props.alPedirEliminar}
        >
          Eliminar categoría
        </Button>
      ) : null}
      <Button
        variant="outline"
        className="h-11 md:h-8"
        onClick={props.alCancelar}
        disabled={enCurso}
      >
        Cancelar
      </Button>
      {eliminando ? (
        <Button
          variant="destructive"
          className="h-11 md:h-8"
          disabled={enCurso}
          onClick={props.alConfirmarEliminar}
        >
          Sí, eliminar
        </Button>
      ) : (
        <Button type="submit" className="h-11 md:h-8" disabled={enCurso}>
          {enCurso ? 'Guardando…' : esNueva ? 'Crear categoría' : 'Guardar'}
        </Button>
      )}
    </PieConSalida>
  )
}
