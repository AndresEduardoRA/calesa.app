// El motor del cotizador (docs/COTIZADOR.md › «El motor»): evalúa una fórmula ya validada en una sola pasada, en
// el orden de la lista, después de decidir la variante y el estado de cada nodo. Es puro: sin I/O, sin fecha, sin
// azar, sin leer la base. `evaluar_formula()` (4.06) es su espejo en la base, y `casos-del-motor.json` el juego que
// comparten.
import type { Formula, ModoDeCambio } from './formula'
import { recorrer, type Medidor } from './medidor'
import {
  prepararEvaluacion,
  type Estado,
  type Faltante,
  type ValorGuardado,
} from './motor-contexto'
import { revisarEntrada, type Entrada } from './motor-entrada'
import { revisarRasgos } from './motor-errores'
import { decidirEstados, resolverVariante } from './motor-estados'
import { evaluarNodo } from './motor-nodos'
import { cambioDe, totalesDe, type TotalesDelMotor } from './motor-totales'

// De dónde salió el valor de un nodo que acepta uno de la persona (docs/COTIZADOR.md › «Lo que se guarda»).
export type Fuente = 'default' | 'sugerido' | 'override' | 'input'

export type Resultado = {
  // Todos los nodos, en el orden de la lista: null cuando falta algo que lo alcanza; el `opcion`, su clave.
  valores: Record<string, ValorGuardado>
  // Lo llena el commit siguiente (sugerido, override); hasta entonces, vacío.
  fuentes: Record<string, Fuente>
  // Todos los nodos, en el orden de la lista: activo, fuera de la variante o con la condición apagada.
  estados: Record<string, Estado>
  totales: TotalesDelMotor
  // Por qué quedó null cada valor que nació null, en el orden en que nació.
  faltantes: Faltante[]
}

// `formula` es la salida de `validarFormula()`. Un modo reemplaza `buckets` y `total_en`; sin modo, los de la
// fórmula. Lanza `ErrorDelMotor` ante un error de llamada o un rasgo que todavía no evalúa; lo que falta en los
// datos no lanza: queda null y se dice en `faltantes`.
export function evaluar(
  formula: Formula,
  entrada: Entrada,
  modo?: ModoDeCambio,
  medidor?: Medidor,
): Resultado {
  const m = medidor ?? { visitas: 0 }
  const ev = prepararEvaluacion(formula, entrada, m)
  revisarRasgos(formula.definicion.nodos, ev.entrada.inputs, m)
  revisarEntrada(ev.nodos, ev.entrada, m)
  ev.variante = resolverVariante(ev.opcion, entrada.variante, m)
  decidirEstados(ev)
  const cambio = cambioDe(ev, modo)
  for (const n of recorrer(formula.definicion.nodos, m)) evaluarNodo(ev, n)
  const totales = totalesDe(ev, cambio)
  return {
    valores: Object.fromEntries(recorrer(ev.valores, m)),
    fuentes: {},
    estados: Object.fromEntries(recorrer(ev.estados, m)),
    totales,
    faltantes: ev.faltantes,
  }
}
