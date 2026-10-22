import type { CampoFiltrable, ValorDeFiltro } from '@/shared/lib/filtros'

// Los datos de `candidatos-contrato.test.ts`: leads de juguete con valores de todos los tipos JSON bajo cada clave, y los filtros de un campo que se prueban contra ellos.

// Los valores de cada tipo JSON bajo cada clave: una cifra, un texto, un booleano, un nulo, un arreglo, un objeto y la clave que falta.
export const FILAS: Record<string, unknown>[] = [
  { ciudad: 'Sucre', edad: 5, llegada: '2026-09-30' },
  { ciudad: 'sucre', edad: 17, llegada: '2026-10-01' },
  { ciudad: 'SUCRE ALTA', edad: 18, llegada: '2026-10-05' },
  { ciudad: 'Ñandú', edad: 18.5, llegada: '2026-10-31' },
  { ciudad: '50% desc', edad: 30, llegada: '2026-11-01' },
  { ciudad: 'a_bcd', edad: 45, llegada: '2026-11-15' },
  { ciudad: 'axbcd', edad: 99, llegada: 'no es una fecha' },
  { ciudad: 'x\\bcd', edad: 1000, llegada: '' },
  { ciudad: "d'abc", edad: 7, llegada: '2026-10-20' },
  { ciudad: 12345, edad: -3, llegada: 20261005 },
  { ciudad: 'Oruro', edad: 0 },
  { ciudad: 'La Paz', edad: 'abc' },
  { ciudad: ['Sucre'], edad: true },
  { ciudad: { x: 'sucre' }, edad: false },
  { ciudad: null, edad: null },
  { edad: [18] },
  { ciudad: 'Cruz del Sur', edad: { n: 18 } },
  {},
]

export const idDe = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`

export const CAMPO = (clave: string, tipo: CampoFiltrable['tipo']): CampoFiltrable => ({
  clave,
  etiqueta: clave,
  tipo,
  opciones: [],
  filtrable: true,
  activo: true,
})

export const ZONA = 'America/La_Paz'

export const CASOS: { nombre: string; campo: CampoFiltrable; valor: ValorDeFiltro }[] = [
  {
    nombre: 'texto «sucre»',
    campo: CAMPO('ciudad', 'texto'),
    valor: { tipo: 'texto', texto: 'sucre' },
  },
  {
    nombre: 'texto «ñand» (la Ñ y la tilde)',
    campo: CAMPO('ciudad', 'texto'),
    valor: { tipo: 'texto', texto: 'ñand' },
  },
  {
    nombre: 'texto «50% desc» (el porcentaje es literal)',
    campo: CAMPO('ciudad', 'texto'),
    valor: { tipo: 'texto', texto: '50% desc' },
  },
  {
    nombre: 'texto «a_bcd» (el guion bajo es literal: no «axbcd»)',
    campo: CAMPO('ciudad', 'texto'),
    valor: { tipo: 'texto', texto: 'a_bcd' },
  },
  {
    nombre: 'texto «x\\bcd» (la barra es literal)',
    campo: CAMPO('ciudad', 'texto'),
    valor: { tipo: 'texto', texto: 'x\\bcd' },
  },
  {
    nombre: 'texto «234» (lo que hay es un número)',
    campo: CAMPO('ciudad', 'texto'),
    valor: { tipo: 'texto', texto: '234' },
  },
  {
    nombre: 'texto «d’abc» con una comilla',
    campo: CAMPO('ciudad', 'texto'),
    valor: { tipo: 'texto', texto: "d'abc" },
  },
  {
    nombre: 'texto que nadie tiene',
    campo: CAMPO('ciudad', 'texto'),
    valor: { tipo: 'texto', texto: 'zzzz' },
  },
  {
    nombre: 'número desde 18',
    campo: CAMPO('edad', 'numero'),
    valor: { tipo: 'rango_numero', min: 18, max: null },
  },
  {
    nombre: 'número hasta 17',
    campo: CAMPO('edad', 'numero'),
    valor: { tipo: 'rango_numero', min: null, max: 17 },
  },
  {
    nombre: 'número de 18 a 45',
    campo: CAMPO('edad', 'numero'),
    valor: { tipo: 'rango_numero', min: 18, max: 45 },
  },
  {
    nombre: 'número con decimales',
    campo: CAMPO('edad', 'numero'),
    valor: { tipo: 'rango_numero', min: 17.5, max: 18.5 },
  },
  {
    nombre: 'número negativo',
    campo: CAMPO('edad', 'numero'),
    valor: { tipo: 'rango_numero', min: -5, max: 0 },
  },
  {
    nombre: 'número desde 1.000.000 (nadie)',
    campo: CAMPO('edad', 'numero'),
    valor: { tipo: 'rango_numero', min: 1_000_000, max: null },
  },
  {
    nombre: 'fecha de octubre (el final es exclusivo)',
    campo: CAMPO('llegada', 'fecha'),
    valor: { tipo: 'rango_fecha', desde: '2026-10-01', hasta: '2026-10-31' },
  },
  {
    nombre: 'fecha desde el 31',
    campo: CAMPO('llegada', 'fecha'),
    valor: { tipo: 'rango_fecha', desde: '2026-10-31', hasta: null },
  },
  {
    nombre: 'fecha hasta el 5',
    campo: CAMPO('llegada', 'fecha'),
    valor: { tipo: 'rango_fecha', desde: null, hasta: '2026-10-05' },
  },
  {
    nombre: 'fecha con hora, el día de la empresa',
    campo: CAMPO('llegada', 'fecha_hora'),
    valor: { tipo: 'rango_fecha', desde: '2026-10-01', hasta: '2026-10-05' },
  },
]
