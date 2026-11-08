import type { CifraDeLaFila } from '../../../../entities/formula/vista-previa'
import type { EditorDeLaFormula } from '../../hooks/use-editor-de-la-formula'
import type { FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import type { FilaDelEditorProps } from './fila-del-editor'

// Lo que el último «Aplicar» y el rechazo de la fórmula dejaron dicho en la fila.
const delTexto = (editor: EditorDeLaFormula, fila: FilaParaDibujar) => ({
  rechazo: editor.rechazo?.filaId === fila.id ? editor.rechazo.mensaje : null,
  soltados: editor.aplicada?.id === fila.id ? editor.aplicada.soltados : [],
})

// Lo que cada fila sabe del editor (C4 a C6): su cifra, si está abierta, si espera a otra cosa abierta (una fila en edición, el formulario de «Sumar fila» o un guardado) y lo que
// el último intento dejó dicho en ella. Una función aparte para que la lista no cargue con tantas condiciones.
export function propsDeLaFila(
  editor: EditorDeLaFormula,
  fila: FilaParaDibujar,
  cifra: CifraDeLaFila,
): FilaDelEditorProps {
  const { abierta, nueva } = editor
  const sumandoTras = nueva.sumando?.tras ?? null
  // Mientras se guarda el borrador, nada se abre ni se suma (4.21-3b-1, C3).
  const otraCosa = sumandoTras !== null || editor.guardado.enCurso
  return {
    ...delTexto(editor, fila),
    fila,
    cifra,
    abierta: abierta?.id === fila.id ? abierta : null,
    bloqueada: (abierta !== null && abierta.id !== fila.id) || otraCosa,
    alAbrir: editor.abrir,
    alCancelar: editor.cancelar,
    alAplicar: editor.aplicar,
    sumando: sumandoTras === fila.id ? { error: nueva.sumando?.error ?? null } : null,
    sumarBloqueado: abierta !== null || otraCosa,
    enfocar: nueva.creada === fila.id,
    ocupados: nueva.ocupados,
    alSumar: nueva.sumar,
    alCancelarSumar: nueva.cancelarSumar,
    alCrear: nueva.crear,
  }
}
