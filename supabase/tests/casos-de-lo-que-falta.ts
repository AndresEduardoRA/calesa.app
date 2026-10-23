// Los casos del corpus de `evaluar_formula()` (`corpus-del-motor.ts`) escritos a mano sobre lo que falta o se ordena: un término que
// falta (depreciar y dividir), un campo del vehículo que no es un número, los tramos con extremos que faltan, un reparto de varios
// términos y de términos apagados, «ninguno» como bucket y el orden de los bytes (`collate "C"`). El esperado lo calcula TS.
import {
  bandera,
  calc,
  campo,
  caso,
  entrada,
  formula,
  inp,
  tabla,
  tc,
  total,
  tramo,
  type CasoAMano,
} from './constructores-del-motor'
import { ARITMETICA } from './casos-de-borde'
import type { Objeto } from './mutadores-de-formula'

// Un depreciar cuyo término puede faltar (un campo del vehículo) y un tramo cuyo año también.
const DEPRECIAR_CON_CAMPOS = formula(
  [
    tc('tc'),
    campo('anio', 'anio'),
    campo('dd', 'dd'),
    calc('dep', 'depreciar', ['dd'], { tabla: 't', sobre: 'anio', columna: 'v' }),
    total(['anio'], { bucket: 'x' }),
  ],
  {},
  { tablas: { t: [{ desde: 2000, hasta: 2030, v: 0.5 }] } },
)

const DIVIDIR_CON_NULL = formula([
  tc('tc'),
  campo('n', 'n'),
  inp('z'),
  calc('dv', 'dividir', ['n', 'z']),
  total(['z'], { bucket: 'x' }),
])

const TRAMO = formula([
  tc('tc'),
  campo('anio', 'anio'),
  tramo('tr', 't', 'anio'),
  total(['tr'], { bucket: 'x' }),
])
const conFilas = (filas: Objeto[], vehiculo: Objeto = { anio: 2010 }) =>
  caso(
    'borde',
    `tramo: ${JSON.stringify(filas)} con ${JSON.stringify(vehiculo)}`,
    TRAMO,
    entrada({ vehiculo, tablas: { t: filas } }),
  )

const REPARTO_DE_TRES = (de: string[]) =>
  formula(
    [
      tc('tc'),
      inp('a', { bucket: 'x' }),
      inp('b', { bucket: 'x' }),
      inp('c', { bucket: 'x' }),
      total(de),
    ],
    { buckets: { x: 'tc' } },
  )
const TRES = entrada({ inputs: { a: 0.1, b: 0.2, c: 0.3 } })

const REPARTO_CON_APAGADO = formula(
  [
    tc('tc'),
    tc('tc2', 'paralelo'),
    bandera('f'),
    inp('a', { bucket: 'x' }),
    inp('b', { bucket: 'y', condicion: 'f' }),
    total(['a', 'b']),
  ],
  { buckets: { x: 'tc', y: 'tc2' } },
)

// El orden de los bytes (`collate "C"`) no es el de un idioma: «a1» va antes que «a_b» y «a.b» antes que «a_b», al revés que con ICU.
const conCampos = (b: string, aa: string) =>
  formula(
    [tc('tc'), tabla('tb', 't', { b, aa }), total(['tb'], { bucket: 'x' })],
    {},
    { tablas: { t: [{ b: 1, aa: 2, v: 3 }] } },
  )

const solo = (nombre: string, f: ReturnType<typeof formula>, e: Objeto) =>
  caso('borde', nombre, f, e)

export const CASOS_DE_LO_QUE_FALTA: CasoAMano[] = [
  // Un término que falta: depreciar lo busca igual y anota lo suyo; dividir mira los null antes que el 0.
  solo(
    'depreciar: el término falta y la fila está',
    DEPRECIAR_CON_CAMPOS,
    entrada({ vehiculo: { anio: 2010 } }),
  ),
  solo(
    'depreciar: el término falta y la fila no',
    DEPRECIAR_CON_CAMPOS,
    entrada({ vehiculo: { anio: 1990 } }),
  ),
  solo('depreciar: el año falta', DEPRECIAR_CON_CAMPOS, entrada({ vehiculo: { dd: 10 } })),
  solo('dividir: null ÷ 0 no anota la división', DIVIDIR_CON_NULL, entrada({ inputs: { z: 0 } })),
  solo(
    'redondear: un término que falta queda sin valor',
    formula([
      tc('tc'),
      campo('c', 'c'),
      calc('r', 'redondear', ['c'], { n: 2 }),
      total(['r'], { bucket: 'x' }),
    ]),
    entrada(),
  ),
  solo(
    'redondear: un término que está',
    formula([
      tc('tc'),
      campo('c', 'c'),
      calc('r', 'redondear', ['c'], { n: 2 }),
      total(['r'], { bucket: 'x' }),
    ]),
    entrada({ vehiculo: { c: 2.675 } }),
  ),
  solo('dividir: 5 ÷ 0 sí', DIVIDIR_CON_NULL, entrada({ inputs: { z: 0 }, vehiculo: { n: 5 } })),
  // Un campo del vehículo: null, texto o ausente no son un número.
  solo('campo: null', base1(), entrada({ vehiculo: { anio: null } })),
  solo('campo: texto', base1(), entrada({ vehiculo: { anio: '2024' } })),
  solo('campo: ausente', base1(), entrada()),
  solo('campo: un número', base1(), entrada({ vehiculo: { anio: 2024 } })),
  // Los tramos: sólo cuentan las filas con `desde` y `hasta` numéricos; los dos extremos entran; gana la primera.
  conFilas([{ desde: 2000, v: 1 }]),
  conFilas([{ hasta: 2020, v: 1 }]),
  conFilas([{ desde: '2000', hasta: 2020, v: 1 }]),
  conFilas([{ desde: 2000, hasta: '2020', v: 1 }]),
  conFilas([{ desde: 2000, hasta: null, v: 1 }]),
  conFilas([{ desde: null, hasta: 2020, v: 1 }]),
  conFilas([{ desde: 2000, hasta: 2020 }]),
  conFilas([{ desde: 2000, hasta: 2020, v: null }]),
  conFilas([{ desde: 2000, hasta: 2020, v: 'x' }]),
  conFilas([
    { desde: 2000, hasta: 2020, v: 1 },
    { desde: 2005, hasta: 2015, v: 2 },
  ]),
  conFilas([
    { desde: 2005, hasta: 2015, v: 2 },
    { desde: 2000, hasta: 2020, v: 1 },
  ]),
  conFilas([{ desde: 2000, hasta: 2010, v: 1 }], { anio: 2010 }),
  conFilas([{ desde: 2010, hasta: 2020, v: 1 }], { anio: 2010 }),
  conFilas([{ desde: 2000, hasta: 2009, v: 1 }]),
  conFilas([], { anio: 2010 }),
  conFilas([{ desde: 2000, hasta: 2020, v: 1 }], {}),
  conFilas([], {}),
  // Un reparto de varios términos suma en el orden de `total.de` (0,1 + 0,2 + 0,3 y al revés no dan lo mismo), y uno apagado aporta
  // 0 por su tipo de cambio: si ése falta, el total también.
  solo('reparto: tres términos en orden', REPARTO_DE_TRES(['a', 'b', 'c']), TRES),
  solo('reparto: tres términos al revés', REPARTO_DE_TRES(['c', 'b', 'a']), TRES),
  solo(
    'reparto: un término apagado y su tipo de cambio falta',
    REPARTO_CON_APAGADO,
    entrada({ inputs: { a: 3, b: 4 } }),
  ),
  solo(
    'reparto: un término apagado y su tipo de cambio está',
    REPARTO_CON_APAGADO,
    entrada({ inputs: { a: 3, b: 4 }, tipos_cambio: { oficial: 1, paralelo: 2 } }),
  ),
  solo(
    'reparto: el término se enciende',
    REPARTO_CON_APAGADO,
    entrada({
      inputs: { a: 3, b: 4 },
      banderas: { f: true },
      tipos_cambio: { oficial: 1, paralelo: 2 },
    }),
  ),
  // «ninguno» es «sin bucket»: el total que lo dice se reparte entre sus términos.
  solo(
    'ninguno: el total sin bucket se reparte',
    formula([tc('tc'), inp('a', { bucket: 'x' }), total(['a'], { bucket: 'ninguno' })]),
    entrada({ inputs: { a: 3 } }),
  ),
  // El orden de los bytes.
  solo('orden: dos campos del vehículo faltan, el menor es a1', conCampos('a_b', 'a1'), entrada()),
  solo(
    'orden: dos campos del vehículo faltan, el menor es a.b',
    conCampos('a_b', 'a.b'),
    entrada(),
  ),
  solo(
    'orden: dos campos del vehículo faltan, el menor es a1 y va primero',
    conCampos('a1', 'a_b'),
    entrada(),
  ),
  solo(
    'orden: dos campos, uno falta y el otro no',
    conCampos('a_b', 'a1'),
    entrada({ vehiculo: { a_b: 1 } }),
  ),
  solo(
    'orden: los overrides inexistentes van por los bytes del id',
    ARITMETICA,
    entrada({
      inputs: { a: 1, b: 2, c: 3 },
      overrides: { a_b: 1, ab: 2, a1: 3, a: 4, b2: 5, a0: 6, zz: 7, a_: 8, tc: 9 },
    }),
  ),
]

function base1() {
  return formula([tc('tc'), campo('anio', 'anio'), total(['anio'], { bucket: 'x' })])
}
