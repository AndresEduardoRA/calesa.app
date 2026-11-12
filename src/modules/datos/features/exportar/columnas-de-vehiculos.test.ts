// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { CampoDeLayout, Categoria } from '@/modules/origenes'
import type { FaseResumen } from '@/modules/flujos'
import type { FilaDeVehiculoAExportar } from '../../entities/exportacion'
import {
  contextoDeVehiculos,
  encabezadosDeVehiculos,
  filaDeVehiculo,
} from './columnas-de-vehiculos'

// `camposComunes` sale por el `index.ts` de vehículos, que es de servidor.
vi.mock('server-only', () => ({}))

const ZONA = 'America/La_Paz'

const campo = (parcial: Partial<CampoDeLayout> & Pick<CampoDeLayout, 'clave' | 'tipo'>) =>
  ({
    id: parcial.clave,
    etiqueta: parcial.clave.toUpperCase(),
    opciones: [],
    requerido: false,
    valorDefecto: null,
    minimo: null,
    maximo: null,
    grupo: null,
    orden: 10,
    esSistema: false,
    activo: true,
    actualizadoEn: '2026-01-01T00:00:00Z',
    origenId: 'o1',
    enTarjeta: false,
    filtrable: false,
    publicoWeb: false,
    claveApibara: null,
    principal: false,
    ...parcial,
  }) as CampoDeLayout

const categoria: Categoria = {
  id: 'c1',
  origenId: 'o1',
  padreId: null,
  nombre: 'SUV',
  orden: 10,
  activa: true,
  actualizadoEn: '2026-01-01T00:00:00Z',
  vehiculos: null,
}
const fase: FaseResumen = {
  id: 'f1',
  nombre: 'En tránsito',
  color: 'azul',
  orden: 1,
  esInicial: false,
  esFinal: false,
  activa: true,
}

const CAMPOS = [
  campo({
    clave: 'color',
    tipo: 'opcion',
    orden: 30,
    opciones: [{ clave: 'r', etiqueta: 'Rojo' }],
  }),
  campo({ clave: 'llega', tipo: 'fecha_hora', orden: 20 }),
  campo({ clave: 'viejo', tipo: 'texto', orden: 5, activo: false }),
  campo({
    clave: 'extras',
    tipo: 'multi_opcion',
    orden: 40,
    opciones: [
      { clave: 'a', etiqueta: 'Aire' },
      { clave: 'b', etiqueta: 'Bluetooth' },
    ],
  }),
  campo({ clave: 'vin2', tipo: 'vin', orden: 50 }),
  campo({ clave: 'lote2', tipo: 'lote', orden: 60 }),
  campo({ clave: 'puertas', tipo: 'numero', orden: 70 }),
  campo({ clave: 'garantia', tipo: 'booleano', orden: 80 }),
]

const contexto = (tipo: 'subasta' | 'manual') =>
  contextoDeVehiculos({
    tipo,
    layout: { campos: CAMPOS, categorias: [categoria] },
    fases: [fase],
    zona: ZONA,
  })

const fila: FilaDeVehiculoAExportar = {
  id: 'v1',
  numero: 7,
  titulo: 'Toyota RAV4',
  marca: 'Toyota',
  modelo: null,
  anio: 2021,
  vin: '1HGCM82633A004352',
  categoriaId: 'c1',
  kilometraje: 1500,
  placado: false,
  lote: '123',
  plataforma: 'copart',
  urlOrigen: 'https://x.test/1',
  precio: 12500.5,
  precioNegociable: true,
  aceptaPermuta: null,
  faseId: 'f1',
  atributos: {
    color: 'r',
    llega: '2026-11-12T20:00:00Z',
    viejo: 'no sale',
    extras: ['a', 'b'],
    vin2: 'ABC',
    lote2: 'L-9',
    puertas: 4,
    garantia: true,
  },
  creadoEn: '2026-11-12T20:00:00Z',
  actualizadoEn: '2026-11-12T21:30:00Z',
}

describe('columnas de vehículos', () => {
  it('T17 · un origen manual no lleva lote, plataforma ni enlace; uno de subasta, sí', () => {
    const manual = encabezadosDeVehiculos(contexto('manual'))
    const subasta = encabezadosDeVehiculos(contexto('subasta'))
    for (const etiqueta of ['Lote', 'Plataforma', 'Enlace de la subasta']) {
      expect(manual).not.toContain(etiqueta)
      expect(subasta).toContain(etiqueta)
    }
    expect(manual[0]).toBe('N.º')
    expect(manual.slice(-3)).toEqual(['Fase', 'Creado', 'Actualizado'])
  })

  it('T17 · los campos activos del layout, en su orden; el inactivo no sale', () => {
    const encabezados = encabezadosDeVehiculos(contexto('manual'))
    const delLayout = encabezados.slice(encabezados.indexOf('Acepta permuta') + 1, -3)
    expect(delLayout).toEqual(['LLEGA', 'COLOR', 'EXTRAS', 'VIN2', 'LOTE2', 'PUERTAS', 'GARANTIA'])
  })

  it('T17 · cada celda: el precio sin redondear, sí o no, nombres y fechas en la zona', () => {
    const ctx = contexto('subasta')
    const encabezados = encabezadosDeVehiculos(ctx)
    const celdas = filaDeVehiculo(fila, ctx)
    const valor = (encabezado: string) => celdas[encabezados.indexOf(encabezado)]
    expect(celdas).toHaveLength(encabezados.length)
    expect(valor('N.º')).toBe(7)
    expect(valor('Precio')).toBe(12500.5)
    expect(valor('Modelo')).toBe('')
    expect(valor('Año')).toBe(2021)
    expect(valor('Placado')).toBe('No')
    expect(valor('Precio negociable')).toBe('Sí')
    expect(valor('Acepta permuta')).toBe('')
    expect(valor('Categoría')).toBe('SUV')
    expect(valor('Lote')).toBe('123')
    expect(valor('Enlace de la subasta')).toBe('https://x.test/1')
    expect(valor('COLOR')).toBe('Rojo')
    expect(valor('EXTRAS')).toBe('Aire | Bluetooth')
    expect(valor('LLEGA')).toBe('2026-11-12T16:00')
    expect(valor('VIN2')).toBe('ABC')
    expect(valor('LOTE2')).toBe('L-9')
    expect(valor('PUERTAS')).toBe(4)
    expect(valor('GARANTIA')).toBe('Sí')
    expect(valor('Fase')).toBe('En tránsito')
    expect(valor('Creado')).toBe('2026-11-12T16:00')
    expect(valor('Actualizado')).toBe('2026-11-12T17:30')
  })

  it('T17 · una categoría o una fase desconocida o nula, y un precio nulo, salen vacíos', () => {
    const ctx = contexto('manual')
    const encabezados = encabezadosDeVehiculos(ctx)
    const celdas = filaDeVehiculo(
      { ...fila, categoriaId: 'otra', faseId: null, precio: null, atributos: { puertas: 'x' } },
      ctx,
    )
    const valor = (encabezado: string) => celdas[encabezados.indexOf(encabezado)]
    expect(valor('Categoría')).toBe('')
    expect(valor('Fase')).toBe('')
    expect(valor('Precio')).toBe('')
    expect(valor('PUERTAS')).toBe('')
    expect(valor('COLOR')).toBe('')
  })
})
