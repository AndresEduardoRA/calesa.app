import { describe, expect, it, vi } from 'vitest'
import { camposComunes, type CampoDeVehiculo, type Fuentes } from '@/modules/vehiculos/client'
import { PLANTILLAS } from '../../entities/plantillas'
import { encabezadosDeVehiculos, type ContextoDeVehiculos } from '../exportar/columnas-de-vehiculos'
import { objetivosDeVehiculos, prepararVehiculos } from './convertir-vehiculos'

// `leads/client` reexporta una Server Action: en el navegador el bundler la cambia por una referencia; en Vitest, no.
vi.mock('server-only', () => ({}))

const SUV = '1c7a5d2f-2b3c-4d4e-9f0a-1b2c3d4e5f60'
const VIEJA = '2d8b6e3a-3c4d-4e5f-8a1b-2c3d4e5f6071'

function campo(parcial: Partial<CampoDeVehiculo> & Pick<CampoDeVehiculo, 'clave' | 'tipo'>) {
  return {
    etiqueta: parcial.clave,
    opciones: [],
    requerido: false,
    grupo: null,
    enTarjeta: false,
    filtrable: false,
    activo: true,
    valorDefecto: null,
    ...parcial,
  } satisfies CampoDeVehiculo
}

const fuentes: Fuentes = {
  comunes: camposComunes('subasta'),
  campos: [
    campo({
      clave: 'color',
      etiqueta: 'Color',
      tipo: 'opcion',
      opciones: [
        { clave: 'rojo', etiqueta: 'Rojo' },
        { clave: 'azul', etiqueta: 'Azul oscuro' },
      ],
    }),
    campo({
      clave: 'extras',
      etiqueta: 'Extras',
      tipo: 'multi_opcion',
      opciones: [
        { clave: 'a', etiqueta: 'A' },
        { clave: 'b', etiqueta: 'B' },
      ],
    }),
    campo({ clave: 'llegada', etiqueta: 'Llegada', tipo: 'fecha' }),
  ],
  categorias: [
    { id: SUV, nombre: 'Camión ligero', activa: true },
    { id: VIEJA, nombre: 'Clásico', activa: false },
  ],
  zona: 'America/La_Paz',
  locale: 'es-BO',
}

const objetivos = objetivosDeVehiculos(fuentes)
const ENCABEZADOS = [
  'Título',
  'Kilometraje',
  'Precio',
  'Placado',
  'Precio negociable',
  'Acepta permuta',
  'Categoría',
  'Color',
  'Extras',
  'Llegada',
  'VIN',
]
const DESTINOS = [
  'titulo',
  'kilometraje',
  'precio',
  'placado',
  'precioNegociable',
  'aceptaPermuta',
  'categoriaId',
  'a.color',
  'a.extras',
  'a.llegada',
  'vin',
]

const una = (celdas: Partial<Record<(typeof ENCABEZADOS)[number], string>>) =>
  prepararVehiculos({
    filas: [ENCABEZADOS.map((e) => celdas[e] ?? '')],
    destinos: DESTINOS,
    objetivos,
    fuentes,
  })[0]

describe('prepararVehiculos', () => {
  it('lee números, sí o no, categoría, opciones y fechas a lo que espera la plantilla', () => {
    expect(
      una({
        Título: 'Hilux',
        Kilometraje: '1.234.567',
        Precio: '12.500,50',
        Placado: 'Sí',
        'Precio negociable': 'no',
        'Acepta permuta': 'x',
        Categoría: 'camion ligero',
        Color: 'azul OSCURO',
        Extras: 'A | b',
        Llegada: '4/3/2026',
      }),
    ).toEqual({
      datos: {
        titulo: 'Hilux',
        kilometraje: 1234567,
        precio: 12500.5,
        placado: true,
        precio_negociable: false,
        acepta_permuta: true,
        categoria_id: SUV,
        atributos: { color: 'azul', extras: ['a', 'b'], llegada: '2026-03-04' },
      },
    })
  })

  it('lo que no se lee o no pasa el alta queda rechazado con la etiqueta', () => {
    expect(una({ Título: 'Hilux', Placado: 'quizás' })).toEqual({
      rechazo: { motivo: 'Escribe «Sí» o «No».', campo: 'Placado' },
    })
    const desactivada = una({ Título: 'Hilux', Categoría: 'Clásico' })
    expect(desactivada).toMatchObject({ rechazo: { campo: 'Categoría' } })
    expect(desactivada && 'rechazo' in desactivada && desactivada.rechazo.motivo).toBe(
      'La categoría «Clásico» no existe o está desactivada. Las activas: Camión ligero.',
    )
    expect(una({ Precio: '10' })).toMatchObject({ rechazo: { campo: 'Título' } })
    expect(una({ Título: 'Hilux', VIN: 'NO-ES-UN-VIN' })).toMatchObject({
      rechazo: { campo: 'VIN' },
    })
  })

  it('una fila normalizada por fila de la persona, también la rechazada (D32)', () => {
    const filas = prepararVehiculos({
      filas: [ENCABEZADOS.map(() => ''), ENCABEZADOS.map((e) => (e === 'Título' ? 'A' : ''))],
      destinos: DESTINOS,
      objetivos,
      fuentes,
    })
    expect(filas.map((f) => ('datos' in f ? 'datos' : 'rechazo'))).toEqual(['rechazo', 'datos'])
  })
})

describe('objetivosDeVehiculos', () => {
  it('los encabezados de «exportar todo» se emparejan solos', async () => {
    const { emparejarColumnas } = await import('@/modules/leads/client')
    const contexto = {
      comunes: fuentes.comunes,
      campos: fuentes.campos,
      categorias: new Map(),
      fases: new Map(),
      zona: 'America/La_Paz',
    } as unknown as ContextoDeVehiculos
    const encabezados = encabezadosDeVehiculos(contexto)
    const { destinos } = emparejarColumnas(encabezados, objetivos)
    const ignorados = encabezados.filter((_e, i) => destinos[i] === null)
    expect(ignorados).toEqual(['N.º', 'Fase', 'Creado', 'Actualizado'])
    expect(destinos.filter((d) => d !== null)).toEqual(objetivos.map((o) => o.id))
  })

  it('las claves que salen son las de la plantilla de vehículos', () => {
    const fila = una({
      Título: 'Hilux',
      Kilometraje: '1',
      Precio: '1',
      Placado: 'no',
      'Precio negociable': 'sí',
      'Acepta permuta': 'no',
      Categoría: 'Camión ligero',
      Color: 'Rojo',
    })
    const permitidas = new Set(PLANTILLAS.vehiculos.map((c) => c.clave))
    expect(fila && 'datos' in fila && Object.keys(fila.datos).every((k) => permitidas.has(k))).toBe(
      true,
    )
  })
})
