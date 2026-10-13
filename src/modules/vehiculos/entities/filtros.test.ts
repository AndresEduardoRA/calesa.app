import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import type { CampoDeVehiculo } from './campo'
import { camposFiltrables, condicionesDe, esquemaDeFiltros } from './filtros'

function campo(clave: string, extra: Partial<CampoDeVehiculo> = {}): CampoDeVehiculo {
  return {
    clave,
    etiqueta: clave[0]?.toUpperCase() + clave.slice(1),
    tipo: 'texto',
    opciones: [],
    requerido: false,
    grupo: null,
    enTarjeta: false,
    filtrable: true,
    activo: true,
    valorDefecto: null,
    ...extra,
  }
}

const OPCIONES = [
  { clave: 'automatica', etiqueta: 'Automática' },
  { clave: 'manual', etiqueta: 'Manual' },
]
const CAMPOS = [
  campo('color'),
  campo('transmision', { tipo: 'opcion', opciones: OPCIONES }),
  campo('extras', { tipo: 'multi_opcion', opciones: [{ clave: 'techo', etiqueta: 'Techo' }] }),
  campo('llave', { tipo: 'booleano' }),
  campo('cilindros', { tipo: 'numero' }),
  campo('llegada', { tipo: 'fecha' }),
  campo('subasta', { tipo: 'fecha_hora' }),
  campo('carroceria', { tipo: 'opcion' }),
  campo('motor', { filtrable: false }),
  campo('viejo', { activo: false }),
]
const FASES = [{ id: 'f1', nombre: 'En subasta', color: '#465fff', activa: true }]
const CATEGORIAS = [
  { id: 'c1', nombre: 'SUV', activa: true },
  { id: 'c2', nombre: 'Vieja', activa: false },
]
const FUENTES = { campos: CAMPOS, fases: FASES, categorias: CATEGORIAS }

describe('esquemaDeFiltros', () => {
  const esquema = esquemaDeFiltros(FUENTES)

  it('los fijos van primero: fase (con «Sin fase»), categoría (sólo activas), año y vitrina', () => {
    expect(esquema.busqueda?.clave).toBe('q')
    expect(esquema.filtros.slice(0, 4).map((filtro) => filtro.clave)).toEqual([
      'fase',
      'categoria',
      'anio',
      'vitrina',
    ])
    expect(esquema.filtros[3]).toEqual({
      tipo: 'booleano',
      clave: 'vitrina',
      etiqueta: 'En vitrina',
    })
    const [fase, categoria] = esquema.filtros
    expect(fase).toMatchObject({
      opciones: [
        { valor: 'f1', etiqueta: 'En subasta', color: '#465fff' },
        { valor: 'ninguna', etiqueta: 'Sin fase' },
      ],
    })
    expect(categoria).toMatchObject({ opciones: [{ valor: 'c1', etiqueta: 'SUV' }] })
  })

  it('después, los campos filtrables y activos del layout, con su etiqueta y el prefijo a.', () => {
    expect(esquema.filtros.slice(4).map((filtro) => [filtro.clave, filtro.tipo])).toEqual([
      ['a.color', 'texto'],
      ['a.transmision', 'opciones'],
      ['a.extras', 'opciones'],
      ['a.llave', 'booleano'],
      ['a.cilindros', 'rango_numero'],
      ['a.llegada', 'rango_fecha'],
      ['a.subasta', 'rango_fecha'],
    ])
    expect(esquema.filtros.find((filtro) => filtro.clave === 'a.color')?.etiqueta).toBe('Color')
  })

  it('un campo de opciones sin opciones no se ofrece', () => {
    expect(camposFiltrables(CAMPOS).map((uno) => uno.clave)).not.toContain('carroceria')
  })

  it('sin fases ni categorías quedan el año y la vitrina, y sin campos filtrables nada del layout', () => {
    const vacio = esquemaDeFiltros({
      campos: [campo('motor', { filtrable: false })],
      fases: [],
      categorias: [],
    })
    expect(vacio.filtros.map((filtro) => filtro.clave)).toEqual(['anio', 'vitrina'])
  })
})

describe('condicionesDe', () => {
  const esquema = esquemaDeFiltros(FUENTES)
  const condiciones = (parametros: Record<string, string>) =>
    condicionesDe(CAMPOS, leerFiltros(esquema, parametros), { zona: 'America/La_Paz' })

  it('sin filtros no pide nada', () => {
    expect(condiciones({})).toEqual([])
  })

  it('la búsqueda y los fijos', () => {
    expect(
      condiciones({ q: 'rav4', fase: 'f1,ninguna', categoria: 'c1', 'anio.min': '2015' }),
    ).toEqual([
      { tipo: 'busqueda', texto: 'rav4' },
      { tipo: 'columna_en', columna: 'fase_id', valores: ['f1'], incluirNulo: true },
      { tipo: 'columna_en', columna: 'categoria_id', valores: ['c1'], incluirNulo: false },
      { tipo: 'columna_rango', columna: 'anio', min: 2015, max: null },
    ])
  })

  it('una opción es una contención; de un campo de varias, que la incluya', () => {
    expect(condiciones({ 'a.transmision': 'automatica,manual', 'a.extras': 'techo' })).toEqual([
      {
        tipo: 'atributos_contienen',
        alternativas: [{ transmision: 'automatica' }, { transmision: 'manual' }],
      },
      { tipo: 'atributos_contienen', alternativas: [{ extras: ['techo'] }] },
    ])
  })

  it('sí o no, número y texto', () => {
    expect(condiciones({ 'a.llave': 'no', 'a.cilindros.max': '6', 'a.color': 'gris' })).toEqual([
      { tipo: 'atributo_texto', clave: 'color', texto: 'gris' },
      { tipo: 'atributos_contienen', alternativas: [{ llave: false }] },
      { tipo: 'atributo_rango_numero', clave: 'cilindros', min: null, max: 6 },
    ])
  })

  it('«hasta el 13» incluye el 13; una fecha con hora empieza a la medianoche de la empresa', () => {
    expect(
      condiciones({ 'a.llegada.desde': '2026-10-01', 'a.llegada.hasta': '2026-10-13' }),
    ).toEqual([
      {
        tipo: 'atributo_rango_texto',
        clave: 'llegada',
        desde: '2026-10-01',
        antesDe: '2026-10-14',
      },
    ])
    expect(
      condiciones({ 'a.subasta.desde': '2026-10-13', 'a.subasta.hasta': '2026-10-13' }),
    ).toEqual([
      {
        tipo: 'atributo_rango_texto',
        clave: 'subasta',
        desde: '2026-10-13T04:00:00.000Z',
        antesDe: '2026-10-14T04:00:00.000Z',
      },
    ])
  })

  it('la clave de un atributo sale del layout: lo que no es filtrable se ignora', () => {
    expect(condiciones({ 'a.motor': 'v8', 'a.viejo': 'x', 'a.inventado': 'x' })).toEqual([])
    const colado = {
      busqueda: '',
      porClave: { 'a.motor': { tipo: 'texto' as const, texto: 'v8' } },
    }
    expect(condicionesDe(CAMPOS, colado)).toEqual([])
  })
})

describe('condicionesDe: en vitrina', () => {
  const esquema = esquemaDeFiltros(FUENTES)

  it('«en vitrina» lleva las fases que hoy publican; con el origen cerrado, ninguna', () => {
    const filtros = leerFiltros(esquema, { vitrina: 'si' })
    const abierta = {
      webActiva: true,
      origenActivo: true,
      origenVisible: true,
      fasesQuePublican: ['f1'],
    }
    expect(condicionesDe(CAMPOS, filtros, { vitrina: abierta })).toEqual([
      { tipo: 'en_vitrina', valor: true, fases: ['f1'] },
    ])
    expect(
      condicionesDe(CAMPOS, filtros, { vitrina: { ...abierta, origenVisible: false } }),
    ).toEqual([{ tipo: 'en_vitrina', valor: true, fases: [] }])
    // Sin saber del origen, nada está en vitrina.
    expect(condicionesDe(CAMPOS, leerFiltros(esquema, { vitrina: 'no' }))).toEqual([
      { tipo: 'en_vitrina', valor: false, fases: [] },
    ])
  })
})
