'use client'

import { useMemo, useState } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoSinResultados } from '@/shared/ui/estados'
import { Input } from '@/shared/ui/input'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import { cifraDeLaFila, type CifraDeLaFila } from '../../../../entities/formula/vista-previa'
import { useEditorDeLaFormula } from '../../hooks/use-editor-de-la-formula'
import { filasVisibles } from '../../hooks/use-editor-de-la-formula.soporte'
import { FilaDelEditor } from './fila-del-editor'
import { VistaPreviaDeLaFormula } from './vista-previa-de-la-formula'

type Props = { origenId: string; nombreDelOrigen: string; leida: FormulaParaEditar }

const SIN_CIFRA: CifraDeLaFila = { tipo: 'nada' }

// Las filas de la versión leída, en su orden (C4–C8): hasta `TOPE_DE_LO_CARGADO`, con «Buscar fila» como camino a las demás. Un rechazo de `validarFormula()` que no
// nombra ninguna fila va arriba de la lista.
export function ListaDeFilas({ origenId, nombreDelOrigen, leida }: Props) {
  const editor = useEditorDeLaFormula({ origenId, leida })
  const [busqueda, setBusqueda] = useState('')
  const abierta = editor.abierta?.id ?? null
  const visibles = filasVisibles(editor.filas, busqueda, abierta)
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
  return (
    <div className="grid min-w-0 gap-3">
      {rechazo && rechazo.filaId === null ? (
        <p
          role="alert"
          className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(length:--text-sm) text-(--color-aviso-ink)"
        >
          {rechazo.mensaje}
        </p>
      ) : null}
      <VistaPreviaDeLaFormula
        lectura={editor.lectura}
        vista={editor.vista}
        rechazo={rechazo}
        nombreDelOrigen={nombreDelOrigen}
        alReintentar={editor.reintentarLaLectura}
      />
      <div className="max-w-sm">
        <label htmlFor="buscar-fila" className="sr-only">
          Buscar fila
        </label>
        <Input
          id="buscar-fila"
          type="search"
          placeholder="Buscar fila por nombre o etiqueta"
          className="min-h-11 md:min-h-9"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
          }}
        />
      </div>
      <ul aria-label="Filas de la fórmula" className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {visibles.filas.map((fila) => (
          <FilaDelEditor
            key={fila.id}
            fila={fila}
            cifra={cifras.get(fila.id) ?? SIN_CIFRA}
            abierta={editor.abierta?.id === fila.id ? editor.abierta : null}
            bloqueada={abierta !== null && abierta !== fila.id}
            rechazo={rechazo?.filaId === fila.id ? rechazo.mensaje : null}
            soltados={editor.aplicada?.id === fila.id ? editor.aplicada.soltados : []}
            alAbrir={editor.abrir}
            alCancelar={editor.cancelar}
            alAplicar={editor.aplicar}
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
