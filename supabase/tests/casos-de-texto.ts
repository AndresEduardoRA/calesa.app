// Los casos del corpus de `evaluar_formula()` (`corpus-del-motor.ts`) que son TEXTO JSON: lo que `JSON.stringify` no puede escribir
// (1e-400, 0.10000000000000001, 2024.0, 1e400…). TS los lee con JSON.parse y la base con ::jsonb: los dos tienen que decidir igual
// qué es 0, qué es infinito y qué es igual. El esperado lo calcula el motor de TS.
import {
  caso,
  con,
  entrada,
  formula,
  inp,
  tabla,
  tc,
  total,
  type CasoAMano,
} from './constructores-del-motor'

// Un campo del vehículo (`kf`) que un `match` compara con la columna `k` de la tabla `t1`. No hay un nodo `kf`: si lo hubiera, el
// `match` leería el nodo y no el campo.
const TEXTOS = formula(
  [
    tc('tc'),
    inp('a'),
    con('k'),
    tabla('tb', 't1', { k: 'kf' }),
    total(['a', 'k', 'tb'], { bucket: 'x' }),
  ],
  {},
  { k: 7 },
)

type Partes = Partial<
  Record<'inputs' | 'banderas' | 'tipos_cambio' | 'vehiculo' | 'tablas' | 'overrides', string>
>
// La entrada como texto JSON, con las partes que se pidan escritas tal cual.
const ent = (partes: Partes = {}) => {
  const p = {
    inputs: '{}',
    banderas: '{}',
    tipos_cambio: '{"oficial":1}',
    vehiculo: '{}',
    tablas: '{}',
    overrides: '{}',
    ...partes,
  }
  return `{${Object.entries(p)
    .map(([k, v]) => `"${k}":${v}`)
    .join(',')}}`
}
const conTabla = (kf: string, fila: string) =>
  ent({ vehiculo: `{"kf":${kf}}`, tablas: `{"t1":[${fila}]}` })
const tx = (nombre: string, texto: NonNullable<CasoAMano['texto']>): CasoAMano => ({
  ...caso('texto', nombre, TEXTOS, entrada()),
  texto,
})

export const CASOS_DE_TEXTO: CasoAMano[] = [
  tx('1e-400 tipeado vale 0', { entrada: ent({ inputs: '{"a":1e-400}' }) }),
  tx('-0 y -0.0 tipeados valen 0', {
    entrada: ent({ inputs: '{"a":-0.0}', overrides: '{"k":-0}' }),
  }),
  tx('1e-400 en una constante vale 0', { params: '{"k":1e-400}', entrada: ent() }),
  tx('1e-400 y 5e-324 en un override', { entrada: ent({ overrides: '{"k":1e-400,"a":5e-324}' }) }),
  tx('1e-400 en una celda vale 0', { entrada: conTabla('3', '{"k":3,"v":1e-400}') }),
  tx('1e-400 en un campo del vehículo vale 0', { entrada: conTabla('1e-400', '{"k":0,"v":4}') }),
  tx('un tipo de cambio de 1e-400 no es positivo', {
    entrada: ent({ tipos_cambio: '{"oficial":1e-400}' }),
  }),
  tx('un tipo de cambio justo bajo 2^-1075 no es positivo', {
    entrada: ent({ tipos_cambio: '{"oficial":2.4703282292062327e-324}' }),
  }),
  tx('un tipo de cambio justo sobre 2^-1075 es 5e-324', {
    entrada: ent({ tipos_cambio: '{"oficial":2.4703282292062328e-324}' }),
  }),
  tx('un input de 1e400 es una entrada inválida', { entrada: ent({ inputs: '{"a":1e400}' }) }),
  tx('un override de 1e400 es una entrada inválida', {
    entrada: ent({ overrides: '{"a":1E+400}' }),
  }),
  tx('un tipo de cambio de 1e400 es una entrada inválida', {
    entrada: ent({ tipos_cambio: '{"oficial":1e400}' }),
  }),
  tx('un campo del vehículo de 1e400 es una entrada inválida', {
    entrada: ent({ vehiculo: '{"kf":1e400}' }),
  }),
  tx('una celda de 1e400 es una entrada inválida', { entrada: conTabla('3', '{"k":3,"v":1e400}') }),
  tx('el máximo y un poco más', { entrada: ent({ inputs: '{"a":1.7976931348623158e308}' }) }),
  tx('un poco más del máximo es infinito', {
    entrada: ent({ inputs: '{"a":1.7976931348623159e308}' }),
  }),
  tx('el match compara dobles: 0.1 y 0.10000000000000001', {
    entrada: conTabla('0.10000000000000001', '{"k":0.1,"v":5}'),
  }),
  tx('el match compara dobles al revés', {
    entrada: conTabla('0.1', '{"k":0.10000000000000001,"v":5}'),
  }),
  tx('el match compara dobles: 2024.0 y 2024', { entrada: conTabla('2024.0', '{"k":2024,"v":6}') }),
  tx('el match compara dobles: 1e2 y 100', { entrada: conTabla('1e2', '{"k":100.0,"v":6}') }),
  tx('el match compara dobles: 1e-400 y 0', { entrada: conTabla('1e-400', '{"k":0,"v":6}') }),
  tx('el match no convierte: el texto "2024" no es 2024', {
    entrada: conTabla('"2024"', '{"k":2024,"v":6}'),
  }),
  tx('el match no convierte: 2024 no es el texto "2024"', {
    entrada: conTabla('2024', '{"k":"2024","v":6}'),
  }),
  tx('el match de texto con texto', { entrada: conTabla('"moto"', '{"k":"moto","v":6}') }),
  tx('el match de texto distingue mayúsculas', {
    entrada: conTabla('"Moto"', '{"k":"moto","v":6}'),
  }),
  tx('el match de texto con acentos', { entrada: conTabla('"camión"', '{"k":"camión","v":6}') }),
  tx('el match de texto con acentos, sin ellos', {
    entrada: conTabla('"camion"', '{"k":"camión","v":6}'),
  }),
  tx('el match de un número con null', { entrada: conTabla('null', '{"k":null,"v":6}') }),
  tx('la entrada no es un objeto: null', { entrada: 'null' }),
  tx('la entrada no es un objeto: lista', { entrada: '[]' }),
  tx('la entrada no es un objeto: texto', { entrada: '"x"' }),
  tx('la entrada no es un objeto: número', { entrada: '5' }),
  tx('el modo no es un objeto: null', { entrada: ent(), modo: 'null' }),
  tx('el modo no es un objeto: lista', { entrada: ent(), modo: '[]' }),
  tx('el modo no es un objeto: texto', { entrada: ent(), modo: '"x"' }),
  tx('200 emojis caben en un texto del vehículo', {
    entrada: ent({ vehiculo: JSON.stringify({ kf: '😀'.repeat(200) }) }),
  }),
  tx('201 emojis no caben', {
    entrada: ent({ vehiculo: JSON.stringify({ kf: '😀'.repeat(201) }) }),
  }),
  tx('200 emojis caben en una celda', {
    entrada: conTabla('3', `{"k":3,"v":4,"t":${JSON.stringify('😀'.repeat(200))}}`),
  }),
  tx('201 emojis no caben en una celda', {
    entrada: conTabla('3', `{"k":3,"v":4,"t":${JSON.stringify('😀'.repeat(201))}}`),
  }),
  tx('un número con exponente en la celda', { entrada: conTabla('3', '{"k":3,"v":1E+1}') }),
]
