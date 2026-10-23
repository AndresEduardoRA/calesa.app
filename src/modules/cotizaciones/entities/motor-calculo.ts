// Las operaciones cerradas de `calculo` (docs/COTIZADOR.md › «El motor»). Todo va de izquierda a derecha en el
// orden de `de`, en dobles, para que `evaluar_formula()` (float8) dé lo mismo bit a bit. Un null en un término
// vuelve null el resultado, sin faltante nuevo: el faltante es de donde nació.
import { recorrer } from './medidor'
import { anotar, leer, type Evaluacion, type Valor } from './motor-contexto'
import { valorDeTramo } from './motor-tablas'
import type { NodoCalculo } from './nodos'
import { redondear } from './redondeo'

// La condición apagada (también la del `si`) ya la resolvió `valorDeNodo`: acá llega encendida o sin condición.
export function valorDeCalculo(ev: Evaluacion, n: NodoCalculo): Valor {
  switch (n.op) {
    case 'suma':
      return sumar(ev, n.id, n.de)
    case 'porcentaje_de':
      return porDos(sumar(ev, n.id, n.de), leer(ev, n.pct, n.id))
    case 'multiplicar':
      return multiplicar(ev, n.id, n.de)
    case 'restar':
      return restar(ev, n.id, n.de)
    case 'dividir':
      return dividir(ev, n.id, leer(ev, n.de[0], n.id), leer(ev, n.de[1], n.id))
    case 'si':
      return leer(ev, n.de[0], n.id)
    case 'depreciar':
      return porDos(leer(ev, n.de[0], n.id), valorDeTramo(ev, n, leer(ev, n.sobre, n.id)))
    case 'redondear':
      return redondearValor(leer(ev, n.de[0], n.id), n.n)
    default: {
      const _: never = n
      return _
    }
  }
}

// ((d0 + d1) + d2)…: se leen todos los términos aunque uno sea null.
export function sumar(ev: Evaluacion, quien: string, de: readonly string[]): Valor {
  let total = 0
  let nulo = false
  for (const id of recorrer(de, ev.m)) {
    const v = leer(ev, id, quien)
    if (v === null) nulo = true
    else total += v
  }
  return nulo ? null : total
}

// ((d0 × d1) × d2)…
function multiplicar(ev: Evaluacion, quien: string, de: readonly string[]): Valor {
  let total = 1
  let nulo = false
  for (const id of recorrer(de, ev.m)) {
    const v = leer(ev, id, quien)
    if (v === null) nulo = true
    else total *= v
  }
  return nulo ? null : total
}

// ((d0 − d1) − d2)…, nunca d0 − (d1 + d2): en dobles no es lo mismo.
function restar(ev: Evaluacion, quien: string, de: readonly string[]): Valor {
  let total = 0
  let primero = true
  let nulo = false
  for (const id of recorrer(de, ev.m)) {
    const v = leer(ev, id, quien)
    if (v === null) nulo = true
    else total = primero ? v : total - v
    primero = false
  }
  return nulo ? null : total
}

function dividir(ev: Evaluacion, quien: string, a: Valor, b: Valor): Valor {
  if (a === null || b === null) return null
  if (b === 0) return anotar(ev, 'division_por_cero', quien)
  return a / b
}

const porDos = (a: Valor, b: Valor): Valor => (a === null || b === null ? null : a * b)

const redondearValor = (x: Valor, n: number): Valor => (x === null ? null : redondear(x, n))
