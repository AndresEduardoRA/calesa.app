import { describe, expect, it } from 'vitest'
import {
  autorVisible,
  COLUMNAS_DEL_HISTORIAL,
  ETIQUETA_DE_CLASE,
  historialDesde,
} from './historial-del-vehiculo'

const ID_1 = '00000000-0000-4000-8000-000000000001'
const ID_2 = '00000000-0000-4000-8000-000000000002'

const fila = (id: string, numero: number, clase: string, perfiles: unknown) => ({
  id,
  numero,
  clase,
  creado_en: '2026-10-29T08:00:00.123456+00:00',
  perfiles,
})

describe('historialDesde: las filas del historial de un vehículo', () => {
  it('da las filas en el orden en que llegaron, con el autor visible y la clase', () => {
    const r = historialDesde([
      fila(ID_2, 7, 'final', { nombre: 'Gala Guarda', email: 'gala@x.com' }),
      fila(ID_1, 3, 'preventa', { nombre: '  ', email: 'ana.perez@x.com' }),
    ])
    expect(r).toEqual([
      {
        id: ID_2,
        numero: 7,
        clase: 'final',
        creadoEn: '2026-10-29T08:00:00.123456+00:00',
        autor: 'Gala Guarda',
      },
      {
        id: ID_1,
        numero: 3,
        clase: 'preventa',
        creadoEn: '2026-10-29T08:00:00.123456+00:00',
        autor: 'ana.perez',
      },
    ])
  })

  it('sin autor legible (la persona no está) dice «Sin nombre»', () => {
    const r = historialDesde([fila(ID_1, 1, 'preventa', null)])
    expect(r?.[0]?.autor).toBe('Sin nombre')
  })

  it('una fila sin creado_en, con otra clase o con un id que no es un guid hace de la lectura un error', () => {
    const sinFecha = { ...fila(ID_1, 1, 'preventa', null), creado_en: null }
    expect(historialDesde([sinFecha])).toBeNull()
    expect(historialDesde([fila(ID_1, 1, 'borrador', null)])).toBeNull()
    expect(historialDesde([fila('uno', 1, 'final', null)])).toBeNull()
    expect(historialDesde('no es una lista')).toBeNull()
  })

  it('sin filas es una lista vacía, no un error', () => {
    expect(historialDesde([])).toEqual([])
  })
})

describe('autorVisible: cómo se nombra a quien cotizó', () => {
  it('su nombre; sin nombre, la parte local del correo; sin nada, «Sin nombre»', () => {
    expect(autorVisible({ nombre: 'Gala Guarda', email: 'g@x.com' })).toBe('Gala Guarda')
    expect(autorVisible({ nombre: '', email: 'gala.guarda@x.com' })).toBe('gala.guarda')
    expect(autorVisible({ nombre: ' ', email: '@x.com' })).toBe('Sin nombre')
    expect(autorVisible(null)).toBe('Sin nombre')
  })
})

describe('lo que pide la lectura', () => {
  it('las columnas son sólo las legibles, con el autor embebido por su clave foránea', () => {
    expect(COLUMNAS_DEL_HISTORIAL).toBe(
      'id, numero, clase, creado_en, perfiles!cotizaciones_creado_por_fkey(nombre, email)',
    )
    expect(ETIQUETA_DE_CLASE).toEqual({ preventa: 'Preventa', final: 'Final' })
  })
})
