'use client'

import { useCallback, useMemo, useState } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { esquemaFormula, type Formula } from '../../../entities/formula'
import { compilarFila, type ErrorDeFila } from '../../../entities/formula/compilar-fila'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'
import { filasParaDibujar, paramsPlanos } from './use-editor-de-la-formula.soporte'
import { useSumarFila } from './use-sumar-fila'
import { useVistaPrevia } from './use-vista-previa'

// La fila abierta: su id y, tras «Aplicar», el error que la dejó abierta.
export type FilaAbierta = { id: string; error: ErrorDeFila | null }
// Lo que el último «Aplicar» que entró soltó de una fila (nombres de campo).
export type Aplicada = { id: string; soltados: string[] }
// El rechazo de `validarFormula()` sobre la fórmula de trabajo: en su fila o, si no nombra ninguna, arriba de la lista.
export type RechazoEnElEditor = { mensaje: string; filaId: string | null }

type Valores = { definicion: unknown; params: unknown }

const valoresDe = (formula: Formula): Valores => ({
  definicion: formula.definicion,
  params: paramsPlanos(formula),
})

// El editor de la fórmula en texto (4.21-3a-1): la fórmula de trabajo empieza en la leída y cambia sólo con un «Aplicar» que compila (`compilarFila()`, 4.21-1).
// No se compila al tipear: el texto de la fila abierta vive en su campo y llega aquí al aplicar. Un error (del compilador, del sitio, el de 2.001 caracteres, una
// auxiliar que otra fila nombra) deja la fila abierta y la fórmula igual; `pisa_un_valor` (4-5) espera «Pisar el valor». Tras cada cambio (y al leer) corre
// `validarFormula()`: lo que rechaza queda aplicado y se dice en su fila (un borrador inválido sólo vive aquí: la base valida al guardar). Lo aplicado se guarda en
// la pestaña con `useBorradorDeEstado`, por versión leída: otra versión (otro id u otra hora) no lo repone.
export function useEditorDeLaFormula({
  origenId,
  leida,
}: {
  origenId: string
  leida: FormulaParaEditar
}) {
  const [trabajo, setTrabajo] = useState<Formula>(leida.formula)
  const [abierta, setAbierta] = useState<FilaAbierta | null>(null)
  const [aplicada, setAplicada] = useState<Aplicada | null>(null)

  const filas = useMemo(() => filasParaDibujar(trabajo), [trabajo])
  const { rechazo, lectura, reintentarLaLectura, vista } = useVistaPrevia({
    origenId,
    trabajo,
    filas,
  })
  // «Sumar fila» (4.21-3a-2): una sola cosa abierta a la vez, esta fila en edición o el formulario.
  const nueva = useSumarFila({
    trabajo,
    hayAbierta: abierta !== null,
    alCrear: (formula, creada) => {
      setTrabajo(formula)
      setAplicada(creada)
    },
  })

  const valores = useMemo(() => valoresDe(trabajo), [trabajo])
  const guardado = useMemo(() => valoresDe(leida.formula), [leida.formula])
  useBorradorDeEstado<Valores>({
    clave: `formula-editor:${origenId}:${leida.id}:${leida.actualizadoEn}`,
    valores,
    guardado,
    alReponer: (cambios) => {
      const repuesta = esquemaFormula.safeParse({ ...valores, ...cambios })
      if (repuesta.success) {
        setTrabajo(repuesta.data)
        setAbierta(null)
        setAplicada(null)
        nueva.cancelarSumar()
      }
    },
  })

  const aplicar = useCallback(
    (texto: string, confirmaPisar = false) => {
      if (abierta === null) return
      const r = compilarFila(trabajo, {
        destino: { existente: abierta.id },
        texto,
        confirmaPisar,
      })
      if (!r.ok) {
        setAbierta({ id: abierta.id, error: r.error })
        return
      }
      setTrabajo(r.formula)
      setAbierta(null)
      setAplicada({ id: abierta.id, soltados: r.soltados })
    },
    [abierta, trabajo],
  )

  return {
    filas,
    rechazo,
    lectura,
    reintentarLaLectura,
    vista,
    abierta,
    aplicada,
    abrir: (id: string) => {
      if (abierta === null && nueva.sumando === null) {
        nueva.soltarLaCreada()
        setAbierta({ id, error: null })
      }
    },
    nueva,
    cancelar: () => {
      setAbierta(null)
    },
    aplicar,
  }
}

export type EditorDeLaFormula = ReturnType<typeof useEditorDeLaFormula>
