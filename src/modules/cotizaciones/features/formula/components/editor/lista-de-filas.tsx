'use client'

import { useMemo, useState } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoSinResultados } from '@/shared/ui/estados'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import { cifraDeLaFila, type CifraDeLaFila } from '../../../../entities/formula/vista-previa'
import { useEditorDeLaFormula, type RechazoEnElEditor } from '../../hooks/use-editor-de-la-formula'
import { filasVisibles } from '../../hooks/use-editor-de-la-formula.soporte'
import { BuscarFila } from './buscar-fila'
import { FilaDelEditor } from './fila-del-editor'
import { GruposDeLaFormula } from './grupos-de-la-formula'
import { GuardarBorrador } from './guardar-borrador'
import { propsDeLaFila } from './props-de-la-fila'
import { VistaPreviaDeLaFormula } from './vista-previa-de-la-formula'

type Props = {
  origenId: string
  nombreDelOrigen: string
  leida: FormulaParaEditar
  // Tras un conflicto al guardar: trae la pestaña de nuevo y vuelve a montar el editor sobre lo que haya.
  recargando: boolean
  alRecargar: () => void
}

const SIN_CIFRA: CifraDeLaFila = { tipo: 'nada' }

// Un rechazo que no nombra una fila ni un grupo va arriba de la lista.
function RechazoDeArriba({ rechazo }: { rechazo: RechazoEnElEditor | null }) {
  if (rechazo === null || rechazo.filaId !== null || rechazo.grupoId !== null) return null
  return (
    <p
      role="alert"
      className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(length:--text-sm) text-(--color-aviso-ink)"
    >
      {rechazo.mensaje}
    </p>
  )
}

// Las filas de la versión leída, en su orden (C4–C8): hasta `TOPE_DE_LO_CARGADO`, con «Buscar fila» como camino a las demás. Un rechazo de `validarFormula()` que no
// nombra ninguna fila ni grupo va arriba de la lista. «Guardar el borrador» (4.21-3b-1) va arriba de todo; la sección «Grupos» (4.21-3c), tras la vista previa.
export function ListaDeFilas({ origenId, nombreDelOrigen, leida, recargando, alRecargar }: Props) {
  const editor = useEditorDeLaFormula({ origenId, leida })
  const [busqueda, setBusqueda] = useState('')
  const { nueva } = editor
  // Se dibuja aunque «Buscar fila» o el tope no la nombren: la que está en edición, aquella bajo la que se suma y la que acaba de crearse.
  const visibles = filasVisibles(
    editor.filas,
    busqueda,
    editor.abierta?.id ?? nueva.sumando?.tras ?? nueva.creada,
  )
  const rechazo = editor.rechazo
  // La cifra de cada fila, de un solo recorrido por cambio aplicado: filtrar o tipear no la recalcula y cada `FilaDelEditor` (memo) recibe su objeto ya hecho.
  const cifras = useMemo(
    () =>
      new Map(
        editor.filas.map((f) => [
          f.id,
          editor.vista ? cifraDeLaFila(editor.vista, f.nodo) : SIN_CIFRA,
        ]),
      ),
    [editor.filas, editor.vista],
  )
  const { guardado } = editor
  return (
    <div className="grid min-w-0 gap-3">
      <GuardarBorrador
        nombreDelOrigen={nombreDelOrigen}
        enCurso={guardado.enCurso}
        estado={guardado.estado}
        motivo={guardado.motivo}
        avisoDelDiseno={guardado.avisoDelDiseno}
        recargando={recargando}
        alGuardar={() => {
          void guardado.guardar()
        }}
        alRecargar={alRecargar}
      />
      <RechazoDeArriba rechazo={rechazo} />
      <VistaPreviaDeLaFormula
        lectura={editor.lectura}
        vista={editor.vista}
        rechazo={rechazo}
        nombreDelOrigen={nombreDelOrigen}
        alReintentar={editor.reintentarLaLectura}
      />
      <GruposDeLaFormula editor={editor} diseno={leida.diseno} />
      <BuscarFila valor={busqueda} alCambiar={setBusqueda} />
      <ul aria-label="Filas de la fórmula" className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {visibles.filas.map((fila) => (
          <FilaDelEditor
            key={fila.id}
            {...propsDeLaFila(editor, fila, cifras.get(fila.id) ?? SIN_CIFRA)}
          />
        ))}
      </ul>
      {visibles.sinCoincidencias ? (
        <EstadoSinResultados
          descripcion={`Ninguna fila tiene «${busqueda.trim()}» en el nombre ni en la etiqueta.`}
        />
      ) : null}
      {visibles.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_LO_CARGADO, { orden: 'primeras filas', articulo: 'las' })}
          camino="Busca una fila por su nombre o su etiqueta."
        />
      ) : null}
    </div>
  )
}
