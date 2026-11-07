// El texto vigente de una fila (4.21-1, C7 a C9; cierra la regla de 4-5 en lo puro): el ⚙ de una constante que nació de un número del texto publica N+1 con
// `params || {nodo: valor}` y no toca `texto`, así que el texto guardado dice lo de antes. Al abrir la fila, el texto se compila y se compara con lo guardado:
// si sólo cambió el valor de una constante, el valor vuelve a escribirse en su tramo del texto y la fila manda otra vez. Si no se puede, el texto «ya no manda»
// y recompilar pregunta antes de pisar el ⚙ (`compilar-fila.ts`). Puro, nunca lanza, no toca lo que recibe.
import type { Formula } from '../formula'
import type { Medidor } from '../medidor'
import type { Nodo } from '../nodos'
import { compilarFilaBase, type FilaCompilada } from './compilar-fila-base'
import { filasDe } from './filas'
import { escribirLiteral } from './literal'
import { mismaEstructura } from './misma-estructura'

export type CambioDeLiteral = { id: string; enElTexto: number; guardado: number }
export type MotivoDeNoManda = 'no_compila' | 'otra_estructura' | 'valor_no_escribible'
export type TextoVigente =
  | { estado: 'sin_texto' }
  | { estado: 'al_dia'; texto: string; cambios: [] }
  | { estado: 'reescrito'; texto: string; cambios: CambioDeLiteral[] }
  | { estado: 'no_manda'; texto: string; motivo: MotivoDeNoManda; cambios: CambioDeLiteral[] }

const sinTexto = (n: Nodo): Nodo => ({ ...n, texto: undefined }) as Nodo

// ¿Lo compilado es lo guardado (los mismos nodos, en el orden, salvo etiquetas y `texto`)?
const mismosNodos = (a: readonly Nodo[], b: readonly Nodo[]): boolean =>
  a.length === b.length &&
  a.every((n, i) => {
    const otro = b[i]
    return otro !== undefined && n.id === otro.id && mismaEstructura(sinTexto(n), sinTexto(otro))
  })

// El número dentro de un tramo: el tramo de un literal entre paréntesis (`(4%)`) los trae pegados.
function interior(tramo: string): { desde: number; hasta: number } {
  let desde = 0
  let hasta = tramo.length
  while (desde < hasta && (tramo[desde] === '(' || tramo[desde] === ' ')) desde += 1
  while (hasta > desde && (tramo[hasta - 1] === ')' || tramo[hasta - 1] === ' ')) hasta -= 1
  return { desde, hasta }
}

function reescribir(
  texto: string,
  cambios: readonly CambioDeLiteral[],
  tramos: FilaCompilada['tramos'],
): string | null {
  const reemplazos: { desde: number; hasta: number; nuevo: string }[] = []
  for (const c of cambios) {
    const t = tramos[c.id]
    if (t === undefined) return null
    const dentro = interior(texto.slice(t.desde, t.desde + t.largo))
    const escrito = escribirLiteral(
      c.guardado,
      texto.slice(t.desde + dentro.desde, t.desde + dentro.hasta).endsWith('%'),
    )
    if (escrito === null) return null
    reemplazos.push({
      desde: t.desde + dentro.desde,
      hasta: t.desde + dentro.hasta,
      nuevo: escrito,
    })
  }
  // De derecha a izquierda: un reemplazo no mueve los tramos de los que faltan.
  let s = texto
  for (const r of reemplazos.sort((a, b) => b.desde - a.desde))
    s = s.slice(0, r.desde) + r.nuevo + s.slice(r.hasta)
  return s
}

// Las constantes del texto cuyo valor guardado es otro (nulo si falta una: no es la misma fila).
function cambiosDeValor(
  formula: Formula,
  enElTexto: Record<string, number>,
): CambioDeLiteral[] | null {
  const cambios: CambioDeLiteral[] = []
  for (const [id, valor] of Object.entries(enElTexto)) {
    const guardado = formula.params.constantes[id]
    if (guardado === undefined) return null
    if (!Object.is(guardado, valor)) cambios.push({ id, enElTexto: valor, guardado })
  }
  return cambios
}

export function textoVigente(formula: Formula, filaId: string, medidor?: Medidor): TextoVigente {
  const m = medidor ?? { visitas: 0 }
  const fila = filasDe(formula.definicion, m).find((f) => f.nodo.id === filaId)
  if (fila?.texto === undefined) return { estado: 'sin_texto' }
  const texto = fila.texto
  const noManda = (motivo: MotivoDeNoManda, cambios: CambioDeLiteral[] = []): TextoVigente => ({
    estado: 'no_manda',
    texto,
    motivo,
    cambios,
  })
  // Sin mirar las auxiliares que otra fila nombra: si el ⚙ las cambió, reescribir el texto es justo lo que lo arregla.
  const r = compilarFilaBase(formula, { destino: { existente: filaId }, texto }, m, {
    sinAuxiliarNombrada: true,
  })
  if (!r.ok) return noManda('no_compila')
  const guardados = formula.definicion.nodos.slice(fila.desde, fila.posicion + 1)
  if (!mismosNodos(r.nodos, guardados)) return noManda('otra_estructura')
  const cambios = cambiosDeValor(formula, r.params)
  if (cambios === null) return noManda('otra_estructura')
  if (cambios.length === 0) return { estado: 'al_dia', texto, cambios: [] }

  const nuevo = reescribir(texto, cambios, r.tramos)
  if (nuevo === null) return noManda('valor_no_escribible', cambios)
  // La verificación no es decorativa: `-0` pasa el «no negativo» y `String(-0)` es «0»; sólo `Object.is` ve que recompilar da otro valor.
  const otra = compilarFilaBase(formula, { destino: { existente: filaId }, texto: nuevo }, m, {
    sinAuxiliarNombrada: true,
  })
  const igual =
    otra.ok &&
    mismosNodos(otra.nodos, r.nodos) &&
    Object.entries(r.params).every(([id]) =>
      Object.is(otra.params[id], formula.params.constantes[id]),
    )
  if (!igual) return noManda('valor_no_escribible', cambios)
  return { estado: 'reescrito', texto: nuevo, cambios }
}
