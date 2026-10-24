// El compilador de fórmulas como texto (docs/COTIZADOR.md › «Fórmulas como texto (4.07)»): `=(remate+fees)*4%` o `=SUMA(aduana)`
// se vuelve, al configurar, en nodos del mismo grafo que valida `validarFormula()`. Al cotizar no se evalúa texto. Puro, sin
// `eval` ni expresiones regulares, lineal en el texto y en el contexto (todo bucle pasa por el medidor), y nunca lanza: un
// texto que no compila devuelve un error con su código y su tramo.
import { esError } from './compilador-arbol'
import { emitir } from './compilador-emitir'
import { crearNombres, type ContextoDeCompilacion } from './compilador-nombres'
import { analizar } from './compilador-sintaxis'
import type { Medidor } from './medidor'
import {
  inicioDeLineas,
  mensajeDe,
  tramoDe,
  type ErrorDeCompilacion,
  type Tramo,
} from './motivos-del-compilador'
import type { Nodo } from './nodos'

export type { ContextoDeCompilacion, DestinoDeCompilacion } from './compilador-nombres'
export type { ErrorDeCompilacion, Tramo } from './motivos-del-compilador'

export type ResultadoDeCompilacion =
  | {
      ok: true
      // Los auxiliares en post-orden y, al final, la fila compilada.
      nodos: Nodo[]
      // Las constantes nuevas (cada número escrito).
      params: Record<string, number>
      // Dónde está en el texto cada nodo que se creó: para señalar un rechazo de `validarFormula()` que nombra un auxiliar.
      tramos: Record<string, Tramo>
    }
  | { ok: false; error: ErrorDeCompilacion }

export function compilarExpresion(
  texto: string,
  contexto: ContextoDeCompilacion,
  medidor?: Medidor,
): ResultadoDeCompilacion {
  const m = medidor ?? { visitas: 0 }
  const nombres = crearNombres(contexto, m)
  const lineas = () => inicioDeLineas(texto, m)
  const r = analizar(texto, nombres, m)
  const emitido = r.ok ? emitir(texto, r.raiz, nombres) : r.error
  if (esError(emitido)) {
    const tramo = tramoDe(lineas(), emitido.desde, emitido.hasta, m)
    return {
      ok: false,
      error: { codigo: emitido.codigo, mensaje: mensajeDe(emitido.codigo, emitido.datos), tramo },
    }
  }
  const inicios = lineas()
  const tramos: Record<string, Tramo> = {}
  for (const [id, rango] of emitido.rangos)
    tramos[id] = tramoDe(inicios, rango.desde, rango.hasta, m)
  return { ok: true, nodos: emitido.nodos, params: emitido.params, tramos }
}
