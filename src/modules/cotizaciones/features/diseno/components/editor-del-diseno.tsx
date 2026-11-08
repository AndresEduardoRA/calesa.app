'use client'

import { useMemo } from 'react'
import type { Tono } from '@/shared/ui/xcell'
import type { Diseno } from '../../../entities/diseno'
import { apartesPosibles, totalesPosibles } from '../../../entities/diseno/edicion-de-la-tarjeta'
import { tiposDeCambio } from '../../../entities/diseno/edicion-de-la-cabecera'
import { tablasParaAyuda } from '../../../entities/diseno/edicion-de-items'
import type { DisenoParaEditar, NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import { useEdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'
import { useEditorDelDiseno } from '../hooks/use-editor-del-diseno'
import { AvisosDelDiseno } from './avisos-del-diseno'
import { BarraDeGuardado } from './barra-de-guardado'
import { CabeceraDelDiseno } from './cabecera-del-diseno'
import { PanelDeLaVistaPrevia } from './panel-de-la-vista-previa'
import { SeccionEditable } from './seccion-editable'
import { TarjetaDelDiseno } from './tarjeta-del-diseno'

type Props = {
  origen: { id: string; nombre: string }
  leida: DisenoParaEditar
  disenoLeido: Diseno
  niveles: readonly NivelDelDiseno[]
  // Los tonos del catálogo, para pintar las celdas de la vista previa.
  tonos: readonly Tono[]
  recargando: boolean
  alRecargar: () => void
}

// El diseño de un origen en edición (4.22-2 y 4.22-3): «Guardar el borrador», el aviso y las secciones con sus ítems. Cada cambio se aplica en el acto y `validarDiseno()` lo revisa; mientras guarda, todo espera.
export function EditorDelDiseno({
  origen,
  leida,
  disenoLeido,
  niveles,
  tonos,
  recargando,
  alRecargar,
}: Props) {
  const editor = useEditorDelDiseno({ origenId: origen.id, leida, disenoLeido, niveles })
  const { guardado } = editor
  const ediciones = useEdicionesDelDiseno(editor.aplicar, leida.definicion)
  const tablas = useMemo(() => tablasParaAyuda(leida.definicion), [leida.definicion])
  const totales = useMemo(() => totalesPosibles(leida.definicion), [leida.definicion])
  const apartes = useMemo(() => apartesPosibles(leida.definicion), [leida.definicion])
  const tipos = useMemo(() => tiposDeCambio(leida.definicion), [leida.definicion])
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
      <PanelDeLaVistaPrevia origen={origen} trabajo={editor.trabajo} leida={leida} tonos={tonos} />
      <AvisosDelDiseno rechazo={editor.rechazo} avisos={editor.avisos} />
      <CabeceraDelDiseno
        cabecera={editor.trabajo.cabecera}
        tieneTotalEn={leida.definicion.total_en !== undefined}
        nBuckets={Object.keys(leida.definicion.buckets ?? {}).length}
        tipos={tipos}
        ediciones={ediciones}
        ocupado={editor.ocupado}
      />
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {editor.trabajo.secciones.map((seccion) => (
          <SeccionEditable
            key={seccion.id}
            seccion={seccion}
            nodos={editor.nodos}
            etiquetas={editor.nombresDeNodos}
            niveles={niveles}
            tablas={tablas}
            ediciones={ediciones}
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
      <TarjetaDelDiseno
        tarjeta={editor.trabajo.tarjeta_total}
        totales={totales}
        apartes={apartes}
        etiquetas={editor.nombresDeNodos}
        ediciones={ediciones}
        ocupado={editor.ocupado}
      />
    </div>
  )
}
