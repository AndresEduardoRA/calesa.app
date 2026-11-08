'use client'

import type { Diseno } from '../../../entities/diseno'
import type { DisenoParaEditar, NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import { useEditorDelDiseno } from '../hooks/use-editor-del-diseno'
import { AvisosDelDiseno } from './avisos-del-diseno'
import { BarraDeGuardado } from './barra-de-guardado'
import { SeccionEditable } from './seccion-editable'

type Props = {
  origen: { id: string; nombre: string }
  leida: DisenoParaEditar
  disenoLeido: Diseno
  niveles: readonly NivelDelDiseno[]
  recargando: boolean
  alRecargar: () => void
}

// El diseño de un origen en edición (4.22-2): «Guardar el borrador», el aviso y las secciones con sus celdas. Los ítems que no son celdas se dibujan de sólo lectura
// (4.22-3 los edita). Cada cambio se aplica en el acto y `validarDiseno()` lo revisa; mientras guarda, todo espera.
export function EditorDelDiseno({
  origen,
  leida,
  disenoLeido,
  niveles,
  recargando,
  alRecargar,
}: Props) {
  const editor = useEditorDelDiseno({ origenId: origen.id, leida, disenoLeido, niveles })
  const { guardado } = editor
  return (
    <div className="grid min-w-0 gap-3">
      <BarraDeGuardado
        nombreDelOrigen={origen.nombre}
        enCurso={guardado.enCurso}
        estado={guardado.estado}
        motivo={guardado.motivo}
        recargando={recargando}
        alGuardar={() => void guardado.guardar()}
        alRecargar={alRecargar}
      />
      <AvisosDelDiseno rechazo={editor.rechazo} avisos={editor.avisos} />
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {editor.trabajo.secciones.map((seccion) => (
          <SeccionEditable
            key={seccion.id}
            seccion={seccion}
            nodos={editor.nodos}
            etiquetas={editor.nombresDeNodos}
            niveles={niveles}
            ocupado={editor.ocupado}
            alPonerSeccion={(cambios) => {
              editor.ponerSeccion(seccion.id, cambios)
            }}
            alPonerAncho={(nodo, ancho) => {
              editor.ponerAncho(seccion.id, nodo, ancho)
            }}
            alPonerNiveles={(nodo, cambios) => {
              editor.ponerNiveles(seccion.id, nodo, cambios)
            }}
          />
        ))}
      </ul>
    </div>
  )
}
