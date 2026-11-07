// Compilar el texto de UNA fila en su lugar (4.21-1, C3 a C6; docs/COTIZADOR.md › «El editor (4.21-1)»): lo puro de «escribo `=(remate+fees)*4%`
// en una fila y la fórmula se vuelve a armar». Usa `compilarExpresion()` (4.07, que no se toca) con el contexto de la fila: lo que está antes de su
// primera auxiliar. Puro, nunca lanza (errores como valores), no toca lo que recibe y lineal con el medidor. `compilar-fila.ts` suma la pregunta
// antes de pisar un ⚙ (C10); `texto-vigente.ts` compila con esto el texto guardado.
import { compilarExpresion, type ErrorDeCompilacion } from '../compilador'
import type { Formula } from '../formula'
import { inicioDeLineas, tramoDe, type Tramo } from '../motivos-del-compilador'
import { recorrer, type Medidor } from '../medidor'
import { MAXIMO_DE_TEXTO, referenciasDe, type Nodo } from '../nodos'
import { conservar } from './conservar-de-la-fila'
import { filasDe, type Fila } from './filas'
import { mismaEstructura } from './misma-estructura'
import { sitioDe, type DestinoDeLaFila, type ErrorDeSitio, type Sitio } from './sitio-de-la-fila'

export type { DestinoDeLaFila } from './sitio-de-la-fila'
export type PedidoBase = { destino: DestinoDeLaFila; texto: string }

export type CambioQueSePisa = { id: string; guardado: number; nuevo: number | null }
export type ErrorDeFila =
  | ErrorDeCompilacion
  | ErrorDeSitio
  | { codigo: 'texto_demasiado_largo'; mensaje: string; tramo: Tramo }
  | { codigo: 'auxiliar_nombrada'; mensaje: string; tramo: Tramo; nombre: string; fila: string }
  | { codigo: 'pisa_un_valor'; mensaje: string; cambios: CambioQueSePisa[] }

export type FilaCompilada = {
  ok: true
  formula: Formula
  // Los nodos que se compilaron (las auxiliares y, al final, la fila) y las constantes nuevas.
  nodos: Nodo[]
  params: Record<string, number>
  tramos: Record<string, Tramo>
  // Lo que la fila tenía y la nueva no lleva (nombres de campo).
  soltados: string[]
}
export type ResultadoDeFila = FilaCompilada | { ok: false; error: ErrorDeFila }
// `sinAuxiliarNombrada`: para el texto guardado (`texto-vigente.ts`): si el ⚙ cambió una auxiliar que otra fila nombra, reescribir el texto es justo lo que lo arregla.
export type Opciones = { sinAuxiliarNombrada?: boolean }

const fallo = (error: ErrorDeFila): ResultadoDeFila => ({ ok: false, error })

// El tope (4-6, C4): unidades UTF-16, como el Zod que valida (la base cuenta caracteres: éste es el más estricto). El tramo empieza en la
// unidad 2.000 (la 2.001.ª); si es la segunda de un par de sustitutos, en el par entero.
function errorDelTope(texto: string, m: Medidor): ErrorDeFila | undefined {
  if (texto.length <= MAXIMO_DE_TEXTO) return undefined
  const cae = texto.charCodeAt(MAXIMO_DE_TEXTO)
  const alto = texto.charCodeAt(MAXIMO_DE_TEXTO - 1)
  const dentroDeUnPar = cae >= 0xdc00 && cae <= 0xdfff && alto >= 0xd800 && alto <= 0xdbff
  const desde = dentroDeUnPar ? MAXIMO_DE_TEXTO - 1 : MAXIMO_DE_TEXTO
  return {
    codigo: 'texto_demasiado_largo',
    mensaje: `El texto de la fila pasa de ${MAXIMO_DE_TEXTO.toLocaleString('es-BO')} caracteres.`,
    tramo: tramoDe(inicioDeLineas(texto, m), desde, texto.length, m),
  }
}

type Compilado = { nodos: readonly Nodo[]; params: Record<string, number> }

// ¿El nodo nuevo de esa auxiliar es el mismo y vale lo mismo?
function sigueIgual(formula: Formula, vieja: Nodo, nuevo: Compilado): boolean {
  const igual = nuevo.nodos.find((x) => x.id === vieja.id)
  if (igual === undefined || !mismaEstructura(vieja, igual)) return false
  return (
    vieja.tipo !== 'constante' ||
    Object.is(formula.params.constantes[vieja.id], nuevo.params[vieja.id])
  )
}

type Pedido = {
  formula: Formula
  sitio: Sitio
  filas: readonly Fila[]
  nuevo: Compilado
  texto: string
}

// Las auxiliares viejas de la fila, por id.
function viejasDe(formula: Formula, fila: Fila): Map<string, Nodo> {
  const viejas = new Map<string, Nodo>()
  for (const [i, id] of fila.auxiliares.entries()) {
    const n = formula.definicion.nodos[fila.desde + i]
    if (n !== undefined) viejas.set(id, n)
  }
  return viejas
}

// C3 · una auxiliar nombrada desde afuera (otra fila con texto `=total__2*2`): si lo compilado no la deja igual, error y nada cambia. No se conserva la
// auxiliar vieja (quedaría suelta, sin la fila que la creó) ni se deja la referencia rota (`validarFormula()` la rechazaría lejos de donde se escribió).
function auxiliarNombrada(p: Pedido, m: Medidor): ErrorDeFila | undefined {
  const fila = p.sitio.fila
  if (fila === null || fila.auxiliares.length === 0) return undefined
  const viejas = viejasDe(p.formula, fila)
  for (const [pos, n] of recorrer(p.formula.definicion.nodos.entries(), m)) {
    if (pos >= fila.desde && pos <= fila.posicion) continue
    const cambiada = referenciasDe(n).find((r) => {
      const vieja = viejas.get(r.id)
      return vieja !== undefined && !sigueIgual(p.formula, vieja, p.nuevo)
    })
    if (cambiada === undefined) continue
    const dueno = p.filas.find((f) => pos >= f.desde && pos <= f.posicion)?.nodo.id ?? n.id
    return {
      codigo: 'auxiliar_nombrada',
      mensaje: `La fila «${dueno}» usa «${cambiada.id}», y este texto lo cambia o lo quita.`,
      tramo: tramoDe(inicioDeLineas(p.texto, m), 0, p.texto.length, m),
      nombre: cambiada.id,
      fila: dueno,
    }
  }
  return undefined
}

// El contexto de la fila: los nodos anteriores a su primera auxiliar, los posteriores, los grupos y las constantes sin las de la fila.
function contextoDe(formula: Formula, sitio: Sitio, m: Medidor) {
  const nodos = formula.definicion.nodos
  const propias = new Set([...(sitio.fila?.auxiliares ?? []), String(sitio.destino['id'])])
  const constantes: Record<string, number> = {}
  for (const [k, v] of recorrer(Object.entries(formula.params.constantes), m))
    if (!propias.has(k)) constantes[k] = v
  return {
    constantes,
    contexto: {
      nodos: nodos.slice(0, sitio.desde),
      posteriores: nodos.slice(sitio.hasta).map((n) => ({
        id: n.id,
        ...(n.grupo === undefined ? {} : { grupo: n.grupo }),
      })),
      grupos: (formula.definicion.grupos ?? []).map((g) => g.id),
      params: constantes,
      destino: sitio.destino as never,
    },
  }
}

export function compilarFilaBase(
  formula: Formula,
  pedido: PedidoBase,
  medidor?: Medidor,
  opciones: Opciones = {},
): ResultadoDeFila {
  const m = medidor ?? { visitas: 0 }
  const filas = filasDe(formula.definicion, m)
  const sitio = sitioDe(formula, filas, pedido.destino)
  if ('codigo' in sitio) return fallo(sitio)
  const tope = errorDelTope(pedido.texto, m)
  if (tope !== undefined) return fallo(tope)

  const { constantes, contexto } = contextoDe(formula, sitio, m)
  const compilado = compilarExpresion(pedido.texto, contexto, m)
  const raiz = compilado.ok ? compilado.nodos[compilado.nodos.length - 1] : undefined
  if (!compilado.ok) return fallo(compilado.error)
  if (raiz === undefined)
    return fallo({ codigo: 'fila_inexistente', mensaje: 'No se compiló la fila.' })

  const { nodo, soltados } = conservar(raiz, sitio.viejo, pedido.texto)
  const nuevos = [...compilado.nodos.slice(0, -1), nodo]
  const rechazo =
    opciones.sinAuxiliarNombrada === true
      ? undefined
      : auxiliarNombrada(
          {
            formula,
            sitio,
            filas,
            nuevo: { nodos: nuevos, params: compilado.params },
            texto: pedido.texto,
          },
          m,
        )
  if (rechazo !== undefined) return fallo(rechazo)
  const nodos = formula.definicion.nodos
  return {
    ok: true,
    formula: {
      ...formula,
      definicion: {
        ...formula.definicion,
        nodos: [...nodos.slice(0, sitio.desde), ...nuevos, ...nodos.slice(sitio.hasta)],
      },
      params: { ...formula.params, constantes: { ...constantes, ...compilado.params } },
    },
    nodos: nuevos,
    params: compilado.params,
    tramos: compilado.tramos,
    soltados,
  }
}
