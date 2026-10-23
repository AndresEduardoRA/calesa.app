// Los casos del corpus de `evaluar_formula()` (`corpus-del-motor.ts`) con fórmulas que no pasaron por `validarFormula` y NO lanzan:
// cada lectura que el motor no hace (un input tipeado no lee su `requerido_si` ni su `sugerido_de`; una tabla sin filas o con
// override no lee su `match`; un par cuyo pct no está pisado no lee su base…) y lo que un nodo ve del pct de un par mientras espera
// su monto. La base tiene que leer en el mismo orden para no lanzar donde TS no lanza. El esperado lo calcula TS.
import {
  bandera,
  base,
  calc,
  campo,
  caso,
  con,
  entrada,
  formula,
  inp,
  tabla,
  tc,
  total,
  tramo,
  type CasoAMano,
  type Formula,
} from './constructores-del-motor'
import type { Json } from './mutadores-de-formula'

const sv = (nombre: string, f: Formula, e: Json = entrada()): CasoAMano =>
  caso('sin_validar', nombre, f, e)
const GRUPOS_VACIO = {
  buckets: { b: 'tc' },
  total_en: 'tc',
  grupos: [
    { id: 'g', etiqueta: 'G', tono: 't', bucket: 'b' },
    { id: 'vacio', etiqueta: 'V', tono: 't', bucket: 'b' },
  ],
}

export const CASOS_PEREZOSOS: CasoAMano[] = [
  // Lo que el motor no lee, no lanza.
  sv(
    'constante sin valor pero con override: no lanza',
    base([con('k')]),
    entrada({ overrides: { k: 3 } }),
  ),
  sv(
    'constante sin valor y apagada por su condición: no lanza',
    base([bandera('f'), con('k', { condicion: 'f' })]),
  ),
  sv(
    'requerido_si más adelante, el input tipeado: no lanza',
    formula([
      tc('tc'),
      inp('x', { requerido_si: 'despues' }),
      bandera('despues'),
      total(['x'], { bucket: 'x' }),
    ]),
    entrada({ inputs: { x: 4 } }),
  ),
  sv(
    'requerido_si más adelante, sin tipear: lanza',
    formula([
      tc('tc'),
      inp('x', { requerido_si: 'despues' }),
      bandera('despues'),
      total(['x'], { bucket: 'x' }),
    ]),
  ),
  sv(
    'sugerido_de inexistente, el input tipeado: no lanza',
    formula([tc('tc'), inp('x', { sugerido_de: 'nada' }), total(['x'], { bucket: 'x' })]),
    entrada({ inputs: { x: 4 } }),
  ),
  sv(
    'sugerido_de inexistente, sin tipear: lanza',
    formula([tc('tc'), inp('x', { sugerido_de: 'nada' }), total(['x'], { bucket: 'x' })]),
  ),
  sv(
    'sugerido_de inexistente con el requerido_si encendido: no lanza',
    formula([
      tc('tc'),
      bandera('f'),
      inp('x', { sugerido_de: 'nada', requerido_si: 'f' }),
      total(['x'], { bucket: 'x' }),
    ]),
    entrada({ banderas: { f: true } }),
  ),
  sv(
    'tabla con un match posterior y sin filas: no lanza',
    formula([
      tc('tc'),
      tabla('tb', 't', { k: 'despues' }),
      inp('despues'),
      total(['tb'], { bucket: 'x' }),
    ]),
  ),
  sv(
    'tabla con un match posterior y con filas: lanza',
    formula([
      tc('tc'),
      tabla('tb', 't', { k: 'despues' }),
      inp('despues'),
      total(['tb'], { bucket: 'x' }),
    ]),
    entrada({ tablas: { t: [{ k: 1, v: 2 }] } }),
  ),
  sv(
    'tabla con un match posterior y con override: no lanza',
    formula([
      tc('tc'),
      tabla('tb', 't', { k: 'despues' }, { sobrescribible: true }),
      inp('despues'),
      total(['tb'], { bucket: 'x' }),
    ]),
    entrada({ tablas: { t: [{ k: 1, v: 2 }] }, overrides: { tb: 9 } }),
  ),
  sv(
    'par con override y un pct apagado, con una base posterior: no lanza',
    formula(
      [
        tc('tc'),
        bandera('f'),
        con('p', { formato: 'pct', condicion: 'f' }),
        calc('m', 'porcentaje_de', ['despues'], { pct: 'p', sobrescribible: true }),
        inp('despues'),
        total(['m'], { bucket: 'x' }),
      ],
      {},
      { p: 0.1 },
    ),
    entrada({ overrides: { m: 7 } }),
  ),
  sv(
    'par con override y un pct activo, con una base posterior: lanza',
    formula(
      [
        tc('tc'),
        con('p', { formato: 'pct' }),
        calc('m', 'porcentaje_de', ['despues'], { pct: 'p', sobrescribible: true }),
        inp('despues'),
        total(['m'], { bucket: 'x' }),
      ],
      {},
      { p: 0.1 },
    ),
    entrada({ overrides: { m: 7 } }),
  ),
  sv(
    'una condición que no es una bandera: apagada',
    formula([tc('tc'), inp('y'), inp('x', { condicion: 'y' }), total(['x'], { bucket: 'x' })]),
    entrada({ inputs: { y: 1, x: 5 } }),
  ),
  sv(
    'una condición posterior: apagada',
    formula([tc('tc'), inp('x', { condicion: 'f' }), bandera('f'), total(['x'], { bucket: 'x' })]),
    entrada({ banderas: { f: true }, inputs: { x: 5 } }),
  ),
  sv(
    'un tramo con la tabla sin filas no lee un sobre null',
    formula([tc('tc'), campo('cv', 'cv'), tramo('tr', 't', 'cv'), total(['tr'], { bucket: 'x' })]),
  ),
  // Lo que un nodo ve de otro mientras el pct de un par espera a que llegue su monto.
  sv(
    'otro nodo lee el pct pisado antes que el par: ve null',
    formula(
      [
        tc('tc'),
        inp('b'),
        con('p', { formato: 'pct' }),
        calc('lee', 'suma', ['p']),
        calc('m', 'porcentaje_de', ['b'], { pct: 'p', sobrescribible: true }),
        total(['m'], { bucket: 'x' }),
      ],
      {},
      { p: 0.1 },
    ),
    entrada({ inputs: { b: 100 }, overrides: { m: 7 } }),
  ),
  sv(
    'un grupo sin miembros vale 0 y no se dibuja',
    {
      definicion: { nodos: [tc('tc'), inp('x', { grupo: 'g' }), total(['x'])], ...GRUPOS_VACIO },
      params: {},
    },
    entrada({ inputs: { x: 5 } }),
  ),
]
