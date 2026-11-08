// La fórmula y el diseño mínimos que comparten las pruebas de `entities/diseno/`: un total que suma tres sumandos (a, b y c), una
// comisión con su porcentaje, una resta y una variante. El diseño dibuja todo menos `libre`; cada prueba lo cambia con `ponerSeccion()`.
import { esquemaDiseno, type Diseno, type ItemDeDiseno, type SeccionDeDiseno } from '../diseno'
import { esquemaDefinicion, type Definicion } from '../formula'

export const formulaDePrueba: Definicion = esquemaDefinicion.parse({
  nodos: [
    {
      id: 'variante',
      tipo: 'opcion',
      etiqueta: 'Variante',
      opciones: [
        { clave: 'x', etiqueta: 'X', titulo: 'COTIZACIÓN X' },
        { clave: 'y', etiqueta: 'Y', titulo: 'COTIZACIÓN Y' },
      ],
    },
    { id: 'a', tipo: 'input', etiqueta: 'A' },
    { id: 'b', tipo: 'input', etiqueta: 'B' },
    { id: 'c', tipo: 'input', etiqueta: 'C' },
    { id: 'libre', tipo: 'input', etiqueta: 'Libre' },
    { id: 'tasa', tipo: 'constante', etiqueta: 'Tasa', formato: 'pct' },
    {
      id: 'comision',
      tipo: 'calculo',
      op: 'porcentaje_de',
      de: ['a'],
      pct: 'tasa',
      etiqueta: 'Comisión',
    },
    { id: 'neto', tipo: 'calculo', op: 'restar', de: ['a', 'b'], etiqueta: 'Neto' },
    {
      id: 'total',
      tipo: 'calculo',
      op: 'suma',
      de: ['a', 'b', 'c'],
      etiqueta: 'Total',
      salida: 'total',
    },
  ],
})

export const celda = (
  nodo: string,
  extra: Partial<Extract<ItemDeDiseno, { tipo: 'celda' }>> = {},
): ItemDeDiseno => ({
  tipo: 'celda',
  nodo,
  ancho: 'completo',
  ...extra,
})

export const seccion = (
  id: string,
  items: ItemDeDiseno[],
  extra: Partial<SeccionDeDiseno> = {},
): SeccionDeDiseno => ({
  id,
  presentacion: 'principal',
  items,
  ...extra,
})

export const disenoDe = (secciones: SeccionDeDiseno[]): Diseno =>
  esquemaDiseno.parse({
    cabecera: { modos: [], ver_total_bs: false },
    secciones,
    tarjeta_total: { nodo: 'total', secundarios: [] },
  })
