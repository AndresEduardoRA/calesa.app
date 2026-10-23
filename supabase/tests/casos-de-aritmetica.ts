// La aritmética de los ayudantes de `evaluar_formula()` (`_motor_mas`, `_motor_menos`, `_motor_por`, `_motor_entre`) contra la de JS,
// bit a bit: Postgres lanza 22003 donde IEEE da ±∞ o ±0 (1e200 * 1e200) y los ayudantes tienen que devolver lo que TS. Después de
// `asentar` el signo de un infinito o de un cero ya no se ve (todo lo no finito es null, −0 es 0), pero el ayudante tiene que ser
// exacto igual: así se prueba, sin depender de que un caso del motor lo muestre. Cada caso es [operación, a, b, resultado];
// `Infinity`, `-Infinity`, `NaN` y `-0` van como texto, porque JSON no los guarda.
import { redondear } from '@/modules/cotizaciones/entities/redondeo'
import type { Azar } from './mutadores-de-formula'

export type Operacion = '+' | '-' | '*' | '/'
export type Dato = number | string
export type CasoDeAritmetica = [Operacion, Dato, Dato, Dato]

const OPERACIONES: readonly Operacion[] = ['+', '-', '*', '/']

// Los operandos que importan: ceros, unos, los umbrales de los ayudantes (1e150, 1e307) y sus vecinos, los extremos de los dobles y lo
// que no es finito.
const CURADOS = [
  0,
  -0,
  1,
  -1,
  0.5,
  2,
  3,
  1e-150,
  1e150,
  9.9e149,
  1.1e150,
  1e307,
  1e308,
  -1e308,
  Number.MAX_VALUE,
  -Number.MAX_VALUE,
  5e-324,
  -5e-324,
  2.2250738585072014e-308,
  1e-300,
  1e300,
  2 ** 511,
  2 ** -511,
  2 ** 1023,
  2 ** -1074,
  9e307,
  -9e307,
  1e-200,
  1e200,
  Infinity,
  -Infinity,
  NaN,
]

const codificar = (x: number): Dato =>
  Number.isNaN(x)
    ? 'NaN'
    : x === Infinity
      ? 'Infinity'
      : x === -Infinity
        ? '-Infinity'
        : Object.is(x, -0)
          ? '-0'
          : x

function calcular(op: Operacion, a: number, b: number): number {
  return op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b
}

// Un doble al azar por sus bits (sin NaN ni infinitos): reparte los exponentes de manera pareja, no los valores.
function dobleAlAzar(azar: Azar): number {
  const vista = new DataView(new ArrayBuffer(8))
  vista.setUint32(0, azar.entero(2 ** 32))
  vista.setUint32(4, azar.entero(2 ** 32))
  const x = vista.getFloat64(0)
  return Number.isFinite(x) ? x : 1
}

const AL_AZAR_POR_OPERACION = 400

export function casosDeAritmetica(azar: Azar): CasoDeAritmetica[] {
  const casos: CasoDeAritmetica[] = []
  const agregar = (op: Operacion, a: number, b: number) => {
    // El divisor nunca es 0: quien llama (`dividir`) lo descarta antes.
    if (op === '/' && b === 0) return
    casos.push([op, codificar(a), codificar(b), codificar(calcular(op, a, b))])
  }
  for (const op of OPERACIONES) {
    for (const a of CURADOS) for (const b of CURADOS) agregar(op, a, b)
    for (let i = 0; i < AL_AZAR_POR_OPERACION; i += 1)
      agregar(op, dobleAlAzar(azar), dobleAlAzar(azar))
  }
  return casos
}

// `redondear(x, n)` de TS (exacto, con BigInt) contra `round(x::numeric, n)::float8` de la base: [x, n, resultado]. Los empates (2,675,
// 1,005, −2,5), lo que cruza una potencia de 10 (999,99999999999999) y lo que ya no cabe en un doble.
export type CasoDeRedondeo = [Dato, number, Dato]

const PARA_REDONDEAR = [
  2.675,
  1.005,
  -2.5,
  2.5,
  0.5,
  -0.5,
  1.5,
  0.285,
  1.115,
  4.35,
  0.125,
  0.375,
  999999999999.9999,
  999.9999999999999,
  100000000.0078125,
  123456789.123456789,
  0.1 + 0.2,
  1 / 3,
  2 / 3,
  -1 / 3,
  1e15 + 0.5,
  4503599627370495.5,
  1e21,
  1e-320,
  5e-324,
  0,
  -0.001,
  0.0005,
  0.00049999999999,
  1.7976931348623157e308,
  -1.7976931348623157e308,
  1.79e308,
  8.98846567431158e307,
]
const DECIMALES = [0, 1, 2, 3, 4, 5, 6]
const REDONDEOS_AL_AZAR = 500

// Un número con cifras al azar y un exponente entre 1e-8 y 1e16: lo que de verdad se redondea.
function dineroAlAzar(azar: Azar): number {
  const mantisa = azar.entero(10 ** 9) + azar.entero(10 ** 8) / 10 ** 8
  const x = mantisa * 10 ** (azar.entero(25) - 8)
  return azar.entero(2) === 0 ? x : -x
}

export function casosDeRedondeo(azar: Azar): CasoDeRedondeo[] {
  const casos: CasoDeRedondeo[] = []
  for (const x of PARA_REDONDEAR)
    for (const n of DECIMALES) casos.push([codificar(x), n, codificar(redondear(x, n))])
  for (let i = 0; i < REDONDEOS_AL_AZAR; i += 1) {
    const [x, n] = [dineroAlAzar(azar), azar.entero(7)]
    casos.push([codificar(x), n, codificar(redondear(x, n))])
  }
  return casos
}
