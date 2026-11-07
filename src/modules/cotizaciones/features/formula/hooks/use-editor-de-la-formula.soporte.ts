// Lo puro del editor de la fórmula en texto (4.21-3a-1): qué dibuja cada fila (su texto vigente tras un ⚙, el texto escrito desde el nodo, o sus campos), a qué
// fila va un rechazo de `validarFormula()`, y qué filas se dibujan con «Buscar fila» y el tope. Lo que decide el texto de una fila es del 4.21-1
// (`texto-vigente.ts`, `texto-de-nodo.ts`): aquí sólo se junta. Calcular las filas es O(filas × nodos) —cada fila compila contra la fórmula entera— y se hace
// una vez por fórmula de trabajo; filtrar corta la lista ya calculada.
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { Formula } from '../../../entities/formula'
import { filasDe } from '../../../entities/formula/filas'
import { textoDeNodo } from '../../../entities/formula/texto-de-nodo'
import {
  textoVigente,
  type CambioDeLiteral,
  type MotivoDeNoManda,
} from '../../../entities/formula/texto-vigente'
import type { Medidor } from '../../../entities/medidor'
import type { RechazoDeFormula } from '../../../entities/motivos-de-formula'
import type { Formato, Nodo } from '../../../entities/nodos'

// Un cambio del ⚙ con el formato de su constante (la auxiliar de un `4%` es un porcentaje), para decirlo con su formato.
export type CambioEnLaFila = CambioDeLiteral & { formato: Formato | undefined }

export type TextoDeLaFila =
  // Su texto guardado, al día; o el que se escribió desde el nodo (las sembradas no traen texto).
  | { modo: 'texto'; texto: string }
  // El ⚙ cambió un número que el texto dice: el texto ya dice el valor nuevo (sólo se muestra; guardarlo así es del 4.21-3b).
  | { modo: 'reescrito'; texto: string; cambios: CambioEnLaFila[] }
  | { modo: 'no_manda'; texto: string; motivo: MotivoDeNoManda; cambios: CambioEnLaFila[] }
  // Un cálculo o una constante que no se puede escribir como texto: se muestra por sus campos, y se puede escribir uno.
  | { modo: 'campos' }
  // Las demás filas (un dato, un tipo de cambio, una tabla…): sólo se leen.
  | { modo: 'solo_lectura' }

export type FilaParaDibujar = {
  id: string
  etiqueta: string
  nodo: Nodo
  // El valor de una constante (en `params`), para sus campos y los cambios del ⚙.
  valor: number | null
  // Los ids de sus auxiliares y los lugares que ocupa en la lista (de la primera auxiliar a la raíz).
  auxiliares: string[]
  desde: number
  posicion: number
  // El formato de la fila y de cada auxiliar, para decir con él lo que pisaría recompilarla.
  formatos: Record<string, Formato | undefined>
  texto: TextoDeLaFila
}

export const editable = (fila: FilaParaDibujar): boolean => fila.texto.modo !== 'solo_lectura'

type Formatos = ReadonlyMap<string, Formato | undefined>

const conFormato = (cambios: readonly CambioDeLiteral[], formatos: Formatos): CambioEnLaFila[] =>
  cambios.map((c) => ({ ...c, formato: formatos.get(c.id) }))

function textoDe(formula: Formula, nodo: Nodo, formatos: Formatos, m: Medidor): TextoDeLaFila {
  if (nodo.tipo !== 'calculo' && nodo.tipo !== 'constante') return { modo: 'solo_lectura' }
  const vigente = textoVigente(formula, nodo.id, m)
  switch (vigente.estado) {
    case 'al_dia':
      return { modo: 'texto', texto: vigente.texto }
    case 'reescrito':
      return {
        modo: 'reescrito',
        texto: vigente.texto,
        cambios: conFormato(vigente.cambios, formatos),
      }
    case 'no_manda':
      return {
        modo: 'no_manda',
        texto: vigente.texto,
        motivo: vigente.motivo,
        cambios: conFormato(vigente.cambios, formatos),
      }
    case 'sin_texto': {
      const desdeElNodo = textoDeNodo(formula, nodo.id, m)
      return desdeElNodo === null ? { modo: 'campos' } : { modo: 'texto', texto: desdeElNodo }
    }
    default: {
      const _: never = vigente
      return _
    }
  }
}

export function filasParaDibujar(formula: Formula, medidor?: Medidor): FilaParaDibujar[] {
  const m = medidor ?? { visitas: 0 }
  const formatos: Formatos = new Map(formula.definicion.nodos.map((n) => [n.id, n.formato]))
  return filasDe(formula.definicion, m).map((fila) => ({
    id: fila.nodo.id,
    etiqueta: fila.nodo.etiqueta,
    nodo: fila.nodo,
    valor: formula.params.constantes[fila.nodo.id] ?? null,
    auxiliares: fila.auxiliares,
    desde: fila.desde,
    posicion: fila.posicion,
    formatos: Object.fromEntries(
      [...fila.auxiliares, fila.nodo.id].map((id) => [id, formatos.get(id)]),
    ),
    texto: textoDe(formula, fila.nodo, formatos, m),
  }))
}

// `definicion.nodos.<i>.…`: el lugar `i` de la lista.
function lugarDelCampo(campo: string | undefined): number | null {
  const encontrado = campo === undefined ? null : /^definicion\.nodos\.(\d+)(\.|$)/.exec(campo)
  return encontrado?.[1] === undefined ? null : Number(encontrado[1])
}

// La fila que nombra un rechazo: `donde` es una fila o una auxiliar de una fila; `campo`, un lugar de la lista dentro de una fila. Un rechazo de la fórmula entera
// (`total_unico`…) o de un grupo no nombra ninguna: nulo, y va arriba de la lista.
export function filaDelRechazo(
  rechazo: RechazoDeFormula,
  filas: readonly FilaParaDibujar[],
): string | null {
  const { donde } = rechazo
  if (donde !== undefined) {
    const fila = filas.find((f) => f.id === donde || f.auxiliares.includes(donde))
    if (fila) return fila.id
  }
  const lugar = lugarDelCampo(rechazo.campo)
  if (lugar === null) return null
  return filas.find((f) => f.desde <= lugar && lugar <= f.posicion)?.id ?? null
}

export type FilasVisibles = {
  filas: FilaParaDibujar[]
  // Hay más que el tope: se dice con `<AvisoDeTope>` y el camino es «Buscar fila».
  hayMas: boolean
  // La búsqueda no encontró ninguna (sin contar la abierta, que se dibuja igual).
  sinCoincidencias: boolean
}

const coincide = (fila: FilaParaDibujar, busqueda: string) =>
  fila.id.toLowerCase().includes(busqueda) || fila.etiqueta.toLowerCase().includes(busqueda)

// Filtra por id o etiqueta (contiene, sin distinguir mayúsculas) y corta en el tope. La fila abierta se dibuja aunque el filtro no la nombre o quede después del
// tope, en su lugar.
export function filasVisibles(
  filas: readonly FilaParaDibujar[],
  busqueda: string,
  abierta: string | null,
  tope: number = TOPE_DE_LO_CARGADO,
): FilasVisibles {
  const buscada = busqueda.trim().toLowerCase()
  const encontradas = buscada === '' ? filas : filas.filter((f) => coincide(f, buscada))
  const cortadas = encontradas.slice(0, tope)
  const hayMas = encontradas.length > tope
  const fuera =
    abierta !== null && !cortadas.some((f) => f.id === abierta)
      ? filas.find((f) => f.id === abierta)
      : undefined
  const conLaAbierta = fuera
    ? [...cortadas, fuera].sort((a, b) => a.posicion - b.posicion)
    : cortadas
  return { filas: conLaAbierta, hayMas, sinCoincidencias: encontradas.length === 0 }
}

// Lo guardado es plano (`{flete: 900, tablas: {…}}`): así lo recibe `validarFormula()` y así va el borrador local.
export const paramsPlanos = (formula: Formula): Record<string, unknown> => ({
  ...formula.params.constantes,
  tablas: formula.params.tablas,
})
