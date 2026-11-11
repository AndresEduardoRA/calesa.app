'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/button'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoVacio } from '@/shared/ui/estados'
import { ESTADO_DE_TAREA_HECHA } from '../../../entities/agenda'
import type { DetalleDeTarea } from '../../../entities/detalle'
import { useAccionesDeTarea } from '../hooks/use-acciones-de-tarea'
import { ConfirmarEliminarTarea } from './confirmar-eliminar-tarea'
import { VistaDeTarea } from './detalle-de-tarea'
import { ReasignarTarea } from './reasignar-tarea'

type Props = {
  // Nula: no existe, está eliminada o no se ve (el panel dice lo mismo en los tres casos).
  tarea: DetalleDeTarea | null
  zona: string
  puedeEditar: boolean
  puedeCompletar: boolean
  puedeReasignar: boolean
  alEditar: () => void
  alEliminar: () => void
  alCerrar: () => void
}

type PropsConTarea = Props & { tarea: DetalleDeTarea }

// El panel de una tarea con detalle: «Marcar como hecha» o «Reabrir» para su creador y su responsable, «Cambiar de responsable» para quien puede reasignar y
// «Editar» y «Eliminar» sólo para su creador. Lo que no corresponde no se dibuja.
function PanelConTarea({
  tarea,
  zona,
  puedeEditar,
  puedeCompletar,
  puedeReasignar,
  alEditar,
  alEliminar,
  alCerrar,
}: PropsConTarea) {
  const router = useRouter()
  const acciones = useAccionesDeTarea(tarea)
  const hecha = tarea.estado === ESTADO_DE_TAREA_HECHA
  const hayPie = puedeCompletar || puedeEditar
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo="Tarea"
      pie={
        hayPie ? (
          <div className="flex flex-wrap gap-2">
            {puedeCompletar ? (
              <Button
                variant={hecha ? 'outline' : 'default'}
                className="min-h-11 md:min-h-9"
                disabled={acciones.enCurso}
                onClick={() => {
                  void acciones.completar(!hecha)
                }}
              >
                {hecha ? 'Reabrir' : 'Marcar como hecha'}
              </Button>
            ) : null}
            {puedeEditar ? (
              <>
                <Button
                  variant="outline"
                  className="min-h-11 md:min-h-9"
                  disabled={acciones.enCurso}
                  onClick={alEditar}
                >
                  Editar
                </Button>
                <ConfirmarEliminarTarea tarea={tarea} alEliminar={alEliminar} />
              </>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="grid gap-4">
        <VistaDeTarea tarea={tarea} zona={zona} />
        {acciones.conflicto ? (
          <AvisoDeConflicto
            mensaje={acciones.conflicto}
            detalle="No se guardó nada. Recargar trae su versión de la tarea."
            alRecargar={() => {
              acciones.limpiarConflicto()
              router.refresh()
            }}
          />
        ) : null}
        {puedeReasignar ? (
          <ReasignarTarea
            key={tarea.actualizadoEn}
            enCurso={acciones.enCurso}
            error={acciones.errorDeResponsable}
            alReasignar={(persona) => {
              void acciones.reasignar(persona)
            }}
          />
        ) : null}
      </div>
    </Drawer>
  )
}

// El panel de una tarea (`?tarea=<id>`): su detalle y lo que quien mira puede hacer con ella.
export function PanelDeTarea(props: Props) {
  const { tarea, alCerrar } = props
  if (!tarea) {
    return (
      <Drawer abierto alCerrar={alCerrar} titulo="Tarea">
        <EstadoVacio
          titulo="No encontramos esta tarea."
          descripcion="Pudo haberse eliminado o ya no la ves."
        />
      </Drawer>
    )
  }
  return <PanelConTarea {...props} tarea={tarea} />
}
