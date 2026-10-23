// Los casos del corpus de `evaluar_formula()` (`corpus-del-motor.ts`) escritos a mano sobre los bordes: la aritmética de dobles (uno
// por cada sitio donde un resultado no finito se asienta como null), el orden de los bytes (`collate "C"`), los reparto de varios
// términos y de términos apagados, los tramos y las celdas que faltan. El esperado lo calcula el motor de TS.
import {
  calc,
  campo,
  caso,
  con,
  entrada,
  formula,
  inp,
  tc,
  total,
  type CasoAMano,
} from './constructores-del-motor'
import type { Objeto } from './mutadores-de-formula'

export const ARITMETICA = formula([
  tc('tc'),
  inp('a'),
  inp('b'),
  inp('c'),
  calc('por', 'multiplicar', ['a', 'b', 'c']),
  calc('res', 'restar', ['a', 'b', 'c']),
  calc('div', 'dividir', ['a', 'b']),
  calc('sum', 'suma', ['a', 'b']),
  total(['a'], { bucket: 'x' }),
])
const TRIOS: [string, number, number, number][] = [
  ['nan: desborde por cero', 1e200, 1e200, 0],
  ['desborda', 1e200, 1e200, 1],
  ['desborda por abajo', 1e-200, 1e-200, 1],
  ['menos infinito', 1e200, -1e200, 1],
  ['resta que desborda', 1e308, -1e308, -1e308],
  ['suma que desborda', 1e308, 1e308, 0],
  ['cociente que se va a cero', 5e-324, 2, 1],
  ['cociente que desborda', 1e300, 1e-300, 1],
  ['cociente que desborda por abajo', 1e-300, 1e300, 1],
  ['subnormales', 1e-310, 1e-310, 1],
  ['cero negativo', -1e-200, 1e-200, 1],
  ['bordes seguros', 1e150, 1e150, 1e-150],
  ['división por cero', 3, 0, 5],
  ['máximo por dos', 1.7976931348623157e308, 2, 0.5],
  ['medio mínimo subnormal', 2 ** -1000, 2 ** -75, 1],
  ['mínimo subnormal', 2 ** -1000, 2 ** -74, 1],
  ['signos', -1e154, 1e154, -1e154],
  ['umbral de la suma', 1e307, 1e307, 1e307],
  ['bajo el umbral', 9.9e306, 9.9e306, 1],
  ['bajo 1e308 y desborda', 9e307, -9e307, 9e307],
  ['entre 1e150 y 1e200', 1e155, 1e155, 1],
  ['entre 1e-200 y 1e-150', 1e-155, 1e-155, 1],
]

const PORCENTAJES = formula(
  [
    tc('tc'),
    inp('a'),
    inp('b'),
    con('p', { formato: 'pct' }),
    con('q', { formato: 'pct' }),
    con('p2', { formato: 'pct' }),
    campo('c', 'c'),
    calc('m', 'porcentaje_de', ['a', 'b'], { pct: 'p', sobrescribible: true }),
    calc('m0', 'porcentaje_de', ['a', 'b'], { pct: 'q' }),
    calc('m2', 'porcentaje_de', ['a', 'c'], { pct: 'p2', sobrescribible: true }),
    total(['a'], { bucket: 'x' }),
  ],
  {},
  { p: 0.1, q: 0, p2: 0.2 },
)

const GRUPOS = formula(
  [
    tc('tc_a'),
    tc('tc_b', 'paralelo'),
    inp('x', { grupo: 'g1' }),
    inp('y', { grupo: 'g1' }),
    inp('z', { grupo: 'g2' }),
    total(['x', 'y', 'z']),
  ],
  {
    buckets: { b0: 'tc_a', b1: 'tc_b' },
    total_en: 'tc_b',
    grupos: [
      { id: 'g1', etiqueta: 'G1', tono: 't', bucket: 'b0' },
      { id: 'g2', etiqueta: 'G2', tono: 't', bucket: 'b1' },
    ],
  },
)
const TCS = { oficial: 1, paralelo: 1 }

const REPARTO = formula(
  [
    tc('tc'),
    tc('tc2', 'paralelo'),
    inp('a', { bucket: 'x' }),
    inp('b', { bucket: 'y' }),
    total(['a', 'b']),
  ],
  { buckets: { x: 'tc', y: 'tc2' } },
)
const conTotalEn = (f: ReturnType<typeof formula>) => ({
  ...f,
  definicion: { ...(f.definicion as Objeto), total_en: 'tc2' },
})

const REDONDEO = formula([
  tc('tc'),
  inp('a'),
  calc('r0', 'redondear', ['a'], { n: 0 }),
  calc('r2', 'redondear', ['a'], { n: 2 }),
  calc('r6', 'redondear', ['a'], { n: 6 }),
  total(['r0'], { bucket: 'x' }),
])
const REDONDEOS = [
  2.675,
  1.005,
  -2.5,
  0.5,
  -0.5,
  1.7976931348623157e308,
  -1.7976931348623157e308,
  1e-320,
  123456789.123456789,
  100000000.0078125,
  0.285,
  1.115,
  999999999999.9999,
  0.1 + 0.2,
  4.35,
  -0.001,
  1e21,
  5e-324,
]

const DEPRECIAR = formula(
  [
    tc('tc'),
    inp('y'),
    inp('d'),
    calc('dep', 'depreciar', ['d'], { tabla: 't', sobre: 'y', columna: 'f' }),
    total(['d'], { bucket: 'x' }),
  ],
  {},
  {
    tablas: {
      t: [
        { desde: 2000, hasta: 2020, f: 1e300 },
        { desde: 2021, hasta: 2030, f: 0.5 },
      ],
    },
  },
)

const solo = (nombre: string, f: ReturnType<typeof formula>, e: Objeto) =>
  caso('borde', nombre, f, e)

export const CASOS_DE_BORDE: CasoAMano[] = [
  ...TRIOS.map(([n, a, b, c]) =>
    solo(`aritmética: ${n}`, ARITMETICA, entrada({ inputs: { a, b, c } })),
  ),
  // El pct de un par cuyo monto manda: monto ÷ base con la base en el borde.
  solo(
    'par: base infinita, el pct pisado vale 0',
    PORCENTAJES,
    entrada({ inputs: { a: 1e308, b: 1e308 }, overrides: { m: 5 } }),
  ),
  solo(
    'par: base subnormal, el pct pisado desborda',
    PORCENTAJES,
    entrada({ inputs: { a: 1e-310, b: 0 }, overrides: { m: 5 } }),
  ),
  solo(
    'par: base 0, el pct pisado no tiene valor',
    PORCENTAJES,
    entrada({ inputs: { a: 0, b: 0 }, overrides: { m: 5 } }),
  ),
  solo(
    'par: monto negativo sobre base infinita',
    PORCENTAJES,
    entrada({ inputs: { a: 1e308, b: 1e308 }, overrides: { m: -5 } }),
  ),
  solo(
    'par: la base es null, el pct pisado también',
    PORCENTAJES,
    entrada({ inputs: { a: 3 }, overrides: { m2: 5 } }),
  ),
  solo(
    'par: la base desborda y el pct es 0 (NaN)',
    PORCENTAJES,
    entrada({ inputs: { a: 1e308, b: 1e308 } }),
  ),
  solo('par: el pct manda con la base en 0', PORCENTAJES, entrada({ inputs: { a: 0, b: 0 } })),
  // Los sitios donde se asienta un resultado no finito: el nodo, el pct pisado, el USD de un grupo, su Bs, el Bs del total con
  // grupos, el Bs del reparto y el USD del total.
  solo(
    'asentar: el USD de un grupo desborda',
    GRUPOS,
    entrada({ inputs: { x: 1e308, y: 1e308, z: 1 }, tipos_cambio: TCS }),
  ),
  solo(
    'asentar: el Bs de un grupo desborda',
    GRUPOS,
    entrada({ inputs: { x: 1e200, y: 1, z: 1 }, tipos_cambio: { oficial: 1e200, paralelo: 1 } }),
  ),
  solo(
    'asentar: el Bs del total desborda',
    GRUPOS,
    entrada({ inputs: { x: 1e308, y: 0, z: 1e308 }, tipos_cambio: TCS }),
  ),
  solo(
    'asentar: el USD del total desborda',
    GRUPOS,
    entrada({ inputs: { x: 1e100, y: 0, z: 0 }, tipos_cambio: { oficial: 1, paralelo: 1e-300 } }),
  ),
  solo(
    'asentar: el grupo desborda por abajo',
    GRUPOS,
    entrada({ inputs: { x: 1e-200, y: 0, z: 0 }, tipos_cambio: { oficial: 1e-200, paralelo: 1 } }),
  ),
  solo(
    'asentar: el Bs del reparto desborda',
    REPARTO,
    entrada({ inputs: { a: 1e308, b: 1e308 }, tipos_cambio: TCS }),
  ),
  solo(
    'asentar: el reparto no desborda',
    REPARTO,
    entrada({ inputs: { a: 1e308, b: -1e308 }, tipos_cambio: TCS }),
  ),
  solo(
    'asentar: el USD del reparto desborda',
    conTotalEn(REPARTO),
    entrada({ inputs: { a: 1e100, b: 1 }, tipos_cambio: { oficial: 1, paralelo: 1e-300 } }),
  ),
  solo(
    'asentar: un tipo de cambio mínimo divide',
    conTotalEn(REPARTO),
    entrada({ inputs: { a: 1, b: 1 }, tipos_cambio: { oficial: 1, paralelo: 5e-324 } }),
  ),
  ...REDONDEOS.map((a) => solo(`redondear: ${String(a)}`, REDONDEO, entrada({ inputs: { a } }))),
  solo('depreciar: el factor desborda', DEPRECIAR, entrada({ inputs: { y: 2010, d: 1e300 } })),
  solo('depreciar: subnormal por la mitad', DEPRECIAR, entrada({ inputs: { y: 2025, d: 1e-320 } })),
  solo('depreciar: sin fila para el año', DEPRECIAR, entrada({ inputs: { y: 1999, d: 7 } })),
  solo('depreciar: base 0', DEPRECIAR, entrada({ inputs: { y: 2010, d: 0 } })),
]
