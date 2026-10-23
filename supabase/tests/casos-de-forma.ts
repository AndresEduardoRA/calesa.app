// Los casos del corpus de `evaluar_formula()` (`corpus-del-motor.ts`) sobre la forma de la ENTRADA y del MODO, uno por cada manera
// de romper cada campo, en el orden del Zod: la base revisa lo mismo que `esquemaEntrada` y `esquemaModoDeCambio`, y el primer campo
// que falla es el `donde`. A mano y sistemáticos porque un mutador al azar no garantiza tocar cada chequeo. El esperado lo calcula TS.
import { base, caso, entrada, type CasoAMano, type Formula } from './constructores-del-motor'
import type { Json, Objeto } from './mutadores-de-formula'

const F: Formula = base()
const CAMPOS = ['inputs', 'banderas', 'tipos_cambio', 'vehiculo', 'tablas', 'overrides'] as const
// Un valor que cada campo acepta, para poner junto a lo malo.
const BUENO: Record<(typeof CAMPOS)[number], Json> = {
  inputs: 1,
  banderas: true,
  tipos_cambio: 1,
  vehiculo: 1,
  tablas: [],
  overrides: 1,
}
const E = (cambios: Objeto): Objeto => ({ ...entrada(), ...cambios })
const f = (nombre: string, e: Json, modo?: Json): CasoAMano => ({
  ...caso('forma', nombre, F, e),
  ...(modo === undefined ? {} : { modo }),
})
const SIN = (campo: string): Objeto => {
  const e = entrada()
  delete e[campo]
  return e
}

// Cómo se nombra un valor en el nombre de un caso: un texto largo se cuenta, no se corta (un emoji cortado por la mitad no es JSON).
const nombre = (v: Json): string =>
  typeof v === 'string' && [...v].length > 12
    ? `un texto de ${String([...v].length)} caracteres`
    : JSON.stringify(v)

const IDS_MALOS = ['Mayus', '1abc', 'con-guion', 'x'.repeat(42), '', 'a b', 'ñ']
const CAMPOS_MALOS = ['Mayus', 'x'.repeat(81), 'a..b', '.a', 'a.', 'a-b', '1a', 'a.B']
const MALOS: Record<string, Json[]> = {
  inputs: ['5', null, true, [1], {}],
  banderas: [1, 0, 'true', null, []],
  tipos_cambio: ['5', null, true, 0, -1, [], {}],
  vehiculo: [true, [1], {}],
  overrides: ['5', null, true, []],
}

const DE_CAMPOS: CasoAMano[] = CAMPOS.flatMap((c) => [
  f(`falta ${c}`, SIN(c)),
  ...[[], null, 'x', 5, true].map((malo) =>
    f(`${c} no es un objeto: ${nombre(malo)}`, E({ [c]: malo })),
  ),
])

const DE_CLAVES: CasoAMano[] = [
  ...(['inputs', 'banderas', 'tipos_cambio', 'overrides'] as const).flatMap((c) =>
    IDS_MALOS.map((k) =>
      f(`${c}: la clave ${nombre(k)} no es un id`, E({ [c]: { [k]: BUENO[c] } })),
    ),
  ),
  ...CAMPOS_MALOS.map((k) =>
    f(`vehiculo: la clave ${nombre(k)} no es un campo`, E({ vehiculo: { [k]: 1 } })),
  ),
  ...['atributos.cilindrada', 'a.b.c', 'a_1', 'anio'].map((k) =>
    f(`vehiculo: la clave ${nombre(k)} es un campo`, E({ vehiculo: { [k]: 1 } })),
  ),
  ...IDS_MALOS.map((k) =>
    f(`tablas: la clave ${nombre(k)} no es un id`, E({ tablas: { [k]: [] } })),
  ),
  ...IDS_MALOS.map((k) =>
    f(`tablas: la columna ${nombre(k)} no es un id`, E({ tablas: { t: [{ [k]: 1 }] } })),
  ),
]

const DE_VALORES: CasoAMano[] = [
  ...Object.entries(MALOS).flatMap(([c, malos]) =>
    malos.map((v) => f(`${c}: el valor ${nombre(v)} no sirve`, E({ [c]: { k: v } }))),
  ),
  ...[{}, 'x', null, 5, [[]], [1], [null], ['x']].map((v) =>
    f(`tablas: ${nombre(v)} no es una tabla de filas`, E({ tablas: { t: v } })),
  ),
  ...[true, [1], {}, '😀'.repeat(201)].map((v) =>
    f(`tablas: la celda ${nombre(v)} no sirve`, E({ tablas: { t: [{ a: v }] } })),
  ),
  ...[1, 'x', null, '😀'.repeat(200)].map((v) =>
    f(`tablas: la celda ${nombre(v)} sirve`, E({ tablas: { t: [{ a: v }] } })),
  ),
  ...[null, 5, true, 'Mal Id', '', 'x'.repeat(42), []].map((v) =>
    f(`variante ${nombre(v)} no sirve`, E({ variante: v })),
  ),
  ...['a', 'x'.repeat(41)].map((v) => f(`variante ${nombre(v)} es un id`, E({ variante: v }))),
  ...[null, 5, true, [], '😀'.repeat(201)].map((v) =>
    f(`vehiculo: ${nombre(v)} no es un campo`, E({ vehiculo: { a: v } })),
  ),
]

// Dos campos malos: gana el primero en el orden del Zod (inputs, banderas, tipos_cambio, vehiculo, tablas, variante, overrides), y una
// clave de más sólo se dice si todo lo demás está bien.
const DE_ORDEN: CasoAMano[] = [
  f('orden: inputs y overrides malos', E({ inputs: [], overrides: [] })),
  f('orden: overrides y tipos_cambio malos', E({ overrides: [], tipos_cambio: [] })),
  f('orden: banderas y variante malas', E({ banderas: [], variante: 5 })),
  f('orden: tablas y vehiculo malos', E({ tablas: [], vehiculo: [] })),
  f('orden: variante y tablas malas', E({ variante: 5, tablas: [] })),
  f('orden: overrides y variante malos', E({ overrides: [], variante: 5 })),
  f('orden: una clave de más y un campo malo', E({ extra: 1, inputs: [] })),
  f('orden: una clave de más y todo bien', E({ extra: 1 })),
  f('orden: dos claves de más', E({ extra: 1, otra: 2 })),
]

// El modo: `{buckets: {bucket: id}, total_en: id}`, y «ninguno» no es el nombre de un bucket.
const MODO_BUENO = { buckets: { x: 'tc' }, total_en: 'tc' }
const M = (cambios: Objeto) => ({ ...MODO_BUENO, ...cambios })
const DE_MODO: CasoAMano[] = [
  f('modo válido', entrada(), MODO_BUENO),
  f('modo: sin buckets', entrada(), { total_en: 'tc' }),
  f('modo: sin total_en', entrada(), { buckets: { x: 'tc' } }),
  ...['x', 5, null, true, []].map((v) =>
    f(`modo: buckets ${nombre(v)}`, entrada(), M({ buckets: v })),
  ),
  ...[5, null, true, [], {}, 'Mal Id', '', 'x'.repeat(42)].map((v) =>
    f(`modo: total_en ${nombre(v)}`, entrada(), M({ total_en: v })),
  ),
  ...IDS_MALOS.map((k) =>
    f(`modo: el bucket ${nombre(k)} no es un id`, entrada(), M({ buckets: { [k]: 'tc' } })),
  ),
  f('modo: el bucket «ninguno»', entrada(), M({ buckets: { ninguno: 'tc' } })),
  ...[5, null, true, [], {}, 'Mal Id', ''].map((v) =>
    f(`modo: el bucket apunta a ${nombre(v)}`, entrada(), M({ buckets: { x: v } })),
  ),
  f('modo: una clave de más', entrada(), M({ extra: 1 })),
  f('modo: buckets y total_en malos, gana buckets', entrada(), { buckets: [], total_en: 5 }),
  f('modo: total_en malo y una clave de más, gana total_en', entrada(), {
    buckets: { x: 'tc' },
    total_en: 5,
    extra: 1,
  }),
  f('modo: sin buckets ni total_en', entrada(), {}),
  f('modo: la entrada mal formada gana al modo mal formado', E({ extra: 1 }), []),
  f('modo: un modo malo y una entrada con una variante mala', E({ variante: 'zz' }), []),
]

export const CASOS_DE_FORMA: CasoAMano[] = [
  ...DE_CAMPOS,
  ...DE_CLAVES,
  ...DE_VALORES,
  ...DE_ORDEN,
  ...DE_MODO,
]
