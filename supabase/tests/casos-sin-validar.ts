// Los casos del corpus de `evaluar_formula()` (`corpus-del-motor.ts`) con fórmulas que no pasaron por `validarFormula` (sí por la
// forma del Zod): cada punto donde el motor lanza `formula_sin_validar`, el orden entre los errores de llamada y cada lectura que
// el motor NO hace y por eso no lanza. El esperado lo calcula el motor de TS.
import {
  bandera,
  base,
  calc,
  caso,
  con,
  entrada,
  formula,
  inp,
  opcion,
  tc,
  total,
  tramo,
  type CasoAMano,
  type Formula,
} from './constructores-del-motor'
import type { Json, Objeto } from './mutadores-de-formula'

const sv = (nombre: string, f: Formula, e: Json = entrada(), modo?: Json): CasoAMano => ({
  ...caso('sin_validar', nombre, f, e),
  ...(modo === undefined ? {} : { modo }),
})
const T = { tablas: { t: [{ desde: 0, hasta: 9, v: 1 }] } }
const posterior = (nodos: Objeto[], params: Objeto = {}) =>
  formula([tc('tc'), inp('x'), ...nodos, inp('despues'), total(['x'], { bucket: 'x' })], {}, params)

export const CASOS_SIN_VALIDAR: CasoAMano[] = [
  // Cada punto donde el motor lanza.
  sv(
    'dos variantes',
    formula([opcion('v1'), opcion('v2'), tc('tc'), inp('x'), total(['x'], { bucket: 'x' })]),
  ),
  sv(
    'dos variantes y una clave mala en inputs: gana la fórmula',
    formula([opcion('v1'), opcion('v2'), tc('tc'), inp('x'), total(['x'], { bucket: 'x' })]),
    entrada({ inputs: { tc: 1 } }),
  ),
  sv(
    'dos variantes y sin total: gana la de las variantes',
    formula([opcion('v1'), opcion('v2'), tc('tc'), inp('x')]),
  ),
  sv('sin total', formula([tc('tc'), inp('x')])),
  sv(
    'sin total y una variante mala: gana la fórmula',
    formula([opcion('v'), tc('tc'), inp('x')]),
    entrada({ variante: 'zz' }),
  ),
  sv('solo_en sin variante', base([inp('s', { solo_en: ['a'] })])),
  sv('un bucket nombra un nodo que no es un tipo de cambio', {
    definicion: { nodos: [tc('tc'), inp('x'), total(['x'], { bucket: 'x' })], buckets: { x: 'x' } },
    params: {},
  }),
  sv('total_en nombra un nodo que no es un tipo de cambio', {
    definicion: {
      nodos: [tc('tc'), inp('x'), total(['x'], { bucket: 'x' })],
      buckets: { x: 'tc' },
      total_en: 'x',
    },
    params: {},
  }),
  sv(
    'sin grupos, el total no tiene bucket ni es una suma',
    formula([
      tc('tc'),
      inp('x'),
      inp('y'),
      calc('total', 'multiplicar', ['x', 'y'], { salida: 'total' }),
    ]),
  ),
  sv(
    'sin grupos, el total no es una suma aunque sus términos tengan bucket',
    formula([
      tc('tc'),
      inp('x', { bucket: 'x' }),
      inp('y', { bucket: 'x' }),
      calc('total', 'multiplicar', ['x', 'y'], { salida: 'total' }),
    ]),
  ),
  sv(
    'sin grupos, el total es un input sin bucket',
    formula([tc('tc'), inp('total', { salida: 'total' })]),
  ),
  sv(
    'sin grupos, un término del reparto no tiene bucket',
    formula([tc('tc'), inp('x', { bucket: 'x' }), inp('y'), total(['x', 'y'])]),
  ),
  sv(
    'sin grupos, un término del reparto tiene el bucket «ninguno»',
    formula([
      tc('tc'),
      inp('x', { bucket: 'x' }),
      inp('y', { bucket: 'ninguno' }),
      total(['x', 'y']),
    ]),
  ),
  sv(
    'sin grupos, un término del reparto no existe',
    formula([tc('tc'), inp('x', { bucket: 'x' }), total(['x', 'nada'])]),
  ),
  sv(
    'el bucket del total no tiene tipo de cambio',
    formula([tc('tc'), inp('x'), total(['x'], { bucket: 'zz' })]),
  ),
  sv('con grupos, el bucket de un grupo no tiene tipo de cambio', {
    definicion: {
      nodos: [tc('tc'), inp('x', { grupo: 'g' }), total(['x'])],
      buckets: { x: 'tc' },
      total_en: 'tc',
      grupos: [{ id: 'g', etiqueta: 'G', tono: 't', bucket: 'otro' }],
    },
    params: {},
  }),
  sv('constante sin valor en params', base([con('k')])),
  sv('un término de la suma está más adelante', posterior([calc('s', 'suma', ['x', 'despues'])])),
  sv(
    'un término nombra un nodo que no existe',
    formula([tc('tc'), inp('x'), calc('s', 'suma', ['nada']), total(['x'], { bucket: 'x' })]),
  ),
  sv(
    'un porcentaje_de lee un pct posterior',
    posterior([calc('m', 'porcentaje_de', ['x'], { pct: 'despues' })]),
  ),
  sv(
    'un multiplicar lee un término posterior',
    posterior([calc('m', 'multiplicar', ['x', 'despues'])]),
  ),
  sv('un restar lee un término posterior', posterior([calc('m', 'restar', ['x', 'despues'])])),
  sv(
    'un dividir lee su primer término posterior',
    posterior([calc('m', 'dividir', ['despues', 'x'])]),
  ),
  sv(
    'un dividir lee su segundo término posterior',
    posterior([calc('m', 'dividir', ['x', 'despues'])]),
  ),
  sv(
    'un redondear lee un término posterior',
    posterior([calc('m', 'redondear', ['despues'], { n: 2 })]),
  ),
  sv(
    'un si lee un término posterior con la bandera encendida',
    posterior([bandera('f'), calc('m', 'si', ['despues'], { condicion: 'f' })]),
    entrada({ banderas: { f: true } }),
  ),
  sv(
    'un si con la bandera apagada no lee nada',
    posterior([bandera('f'), calc('m', 'si', ['despues'], { condicion: 'f' })]),
  ),
  sv('un tramo lee un sobre posterior', posterior([tramo('tr', 't', 'despues')], T)),
  sv(
    'un depreciar lee un término posterior',
    posterior([calc('dp', 'depreciar', ['despues'], { tabla: 't', sobre: 'x', columna: 'v' })], T),
  ),
  sv(
    'un depreciar lee un sobre posterior',
    posterior([calc('dp', 'depreciar', ['x'], { tabla: 't', sobre: 'despues', columna: 'v' })], T),
  ),
  sv(
    'un cálculo lee la variante como un número',
    formula([
      opcion('v'),
      tc('tc'),
      inp('x'),
      calc('s', 'suma', ['v']),
      total(['x'], { bucket: 'x' }),
    ]),
  ),
  sv(
    'el total es la variante, sin grupos',
    formula([opcion('v', { salida: 'total', bucket: 'x' }), tc('tc'), inp('x')]),
  ),
  sv('el total es la variante, con grupos', {
    definicion: {
      nodos: [opcion('v', { salida: 'total' }), tc('tc'), inp('x', { grupo: 'g' })],
      buckets: { b: 'tc' },
      total_en: 'tc',
      grupos: [{ id: 'g', etiqueta: 'G', tono: 't', bucket: 'b' }],
    },
    params: {},
  }),
  // El orden entre los errores de llamada: la forma de la entrada, la del modo, la fórmula, la entrada contra la fórmula, la variante,
  // los estados y el cambio.
  sv('orden: la entrada mal formada gana al modo mal formado', base(), entrada({ extra: 1 }), []),
  sv(
    'orden: los inputs ajenos ganan a las banderas ajenas',
    base([bandera('f')]),
    entrada({ inputs: { tc: 1 }, banderas: { x: true } }),
  ),
  sv(
    'orden: los inputs ajenos ganan a una variante mala',
    formula([opcion('v'), tc('tc'), inp('x'), total(['x'], { bucket: 'x' })]),
    entrada({ inputs: { tc: 1 }, variante: 'zz' }),
  ),
  sv(
    'orden: la variante mala gana a un solo_en sin variante',
    base([inp('s', { solo_en: ['a'] })]),
    entrada({ variante: 'a' }),
  ),
  sv(
    'orden: un solo_en sin variante gana a un modo malo',
    base([inp('s', { solo_en: ['a'] })]),
    entrada(),
    { buckets: { x: 'x' }, total_en: 'tc' },
  ),
  sv('orden: los buckets de un modo ganan a su total_en', base(), entrada(), {
    buckets: { x: 'x' },
    total_en: 'x',
  }),
  sv('orden: el total_en de un modo gana al bucket sin cubrir', base(), entrada(), {
    buckets: { y: 'tc' },
    total_en: 'x',
  }),
]
