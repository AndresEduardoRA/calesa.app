'use client'

import { useMemo, useState } from 'react'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { Formula } from '../../../entities/formula'
import type { ErrorDeFila } from '../../../entities/formula/compilar-fila'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'
import { useAplicarFila } from './use-aplicar-fila'
import { filasParaDibujar } from './use-editor-de-la-formula.soporte'
import { useGuardadoDelEditor } from './use-guardar-borrador'
import { useGruposDelEditor } from './use-grupos-del-editor'
import { useSumarFila } from './use-sumar-fila'
import { useVistaPrevia } from './use-vista-previa'

// La fila abierta: su id y, tras «Aplicar», el error que la dejó abierta.
export type FilaAbierta = { id: string; error: ErrorDeFila | null }
// Lo que el último «Aplicar» que entró soltó de una fila (nombres de campo).
export type Aplicada = { id: string; soltados: string[] }
// El rechazo de `validarFormula()` sobre la fórmula de trabajo: en su fila, en la tarjeta de su grupo (4.21-3c) o, si no nombra ninguno, arriba de la lista.
export type RechazoEnElEditor = { mensaje: string; filaId: string | null; grupoId: string | null }

// El editor de la fórmula en texto (4.21-3a-1): la fórmula de trabajo empieza en la leída y cambia sólo con un «Aplicar» que compila (`compilarFila()`, 4.21-1).
// No se compila al tipear: el texto de la fila abierta vive en su campo y llega aquí al aplicar. Un error (del compilador, del sitio, el de 2.001 caracteres, una
// auxiliar que otra fila nombra) deja la fila abierta y la fórmula igual; `pisa_un_valor` (4-5) espera «Pisar el valor». Tras cada cambio (y al leer) corre
// `validarFormula()`: lo que rechaza queda aplicado y se dice en su fila (un borrador inválido sólo vive aquí: la base valida al guardar). Guardar el borrador
// (4.21-3b-1) y lo aplicado en la pestaña son de `useGuardadoDelEditor`; mientras guarda, nada se abre, se aplica ni se suma.
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
  const envio = useUnEnvioALaVez()

  const filas = useMemo(() => filasParaDibujar(trabajo), [trabajo])
  const previa = useVistaPrevia({ origenId, trabajo, filas })
  // Los grupos (4.21-3c): lo aplicado cambia la fórmula de trabajo como el «Aplicar» de una fila.
  const grupos = useGruposDelEditor({ trabajo, enCurso: envio.enCurso, alAplicar: setTrabajo })
  // «Sumar fila» (4.21-3a-2): una sola cosa abierta a la vez, esta fila en edición, un grupo o el formulario.
  const nueva = useSumarFila({
    trabajo,
    hayAbierta: abierta !== null || grupos.abierto !== null || envio.enCurso,
    alCrear: (formula, creada) => {
      setTrabajo(formula)
      setAplicada(creada)
    },
  })

  const guardado = useGuardadoDelEditor({
    origenId,
    leida,
    trabajo,
    filas,
    hayAbierta: abierta !== null || nueva.sumando !== null || grupos.abierto !== null,
    hayRechazo: previa.rechazo !== null,
    envio,
    alReemplazar: (formula) => {
      setTrabajo(formula)
      setAbierta(null)
      setAplicada(null)
      nueva.cancelarSumar()
      grupos.cancelar()
    },
  })

  const aplicar = useAplicarFila({
    trabajo,
    abierta,
    enCurso: envio.enCurso,
    setTrabajo,
    setAbierta,
    setAplicada,
  })

  // Nada más abierto ni guardándose: se abre una fila o un grupo.
  const libre =
    abierta === null && nueva.sumando === null && grupos.abierto === null && !envio.enCurso

  return {
    trabajo,
    libre,
    filas,
    ...previa,
    abierta,
    aplicada,
    guardado,
    abrir: (id: string) => {
      if (!libre) return
      nueva.soltarLaCreada()
      setAbierta({ id, error: null })
    },
    grupos,
    abrirGrupo: (id: string) => {
      if (!libre) return
      nueva.soltarLaCreada()
      grupos.abrir(id)
    },
    nueva,
    cancelar: () => {
      setAbierta(null)
    },
    aplicar,
  }
}

export type EditorDeLaFormula = ReturnType<typeof useEditorDeLaFormula>
