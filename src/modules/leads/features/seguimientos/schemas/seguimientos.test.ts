import { describe, expect, it } from 'vitest'
import {
  esquemaCrearSeguimiento,
  esquemaGuardarSeguimiento,
  esquemaVersionDeSeguimiento,
} from './seguimientos'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const LEAD = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'
const TIPO = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const doc = (text: string, marks?: unknown[]) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] }],
})
const nuevo = (cambios: Record<string, unknown> = {}) => ({
  id: ID,
  leadId: LEAD,
  tipoId: TIPO,
  titulo: '  Llamó  ',
  detalle: doc('Quiere un RAV4', [{ type: 'bold' }]),
  visibilidad: 'privado',
  ocurridoEn: null,
  recordatorio: null,
  ...cambios,
})

describe('esquemaCrearSeguimiento', () => {
  it('acepta un documento de la lista blanca y recorta el resumen', () => {
    const leido = esquemaCrearSeguimiento.safeParse(nuevo())
    expect(leido.success).toBe(true)
    expect(leido.data?.titulo).toBe('Llamó')
    expect(leido.data?.detalle).toEqual(doc('Quiere un RAV4', [{ type: 'bold' }]))
  })
  it('un documento sin texto viaja como nulo', () => {
    const leido = esquemaCrearSeguimiento.safeParse(
      nuevo({ detalle: { type: 'doc', content: [{ type: 'paragraph' }] } }),
    )
    expect(leido.data?.detalle).toBeNull()
  })
  it('lo que no está en la lista blanca no sale del servidor', () => {
    for (const detalle of [
      doc('x', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]),
      doc('x', [{ type: 'link', attrs: { href: 'https://a.com', onclick: 'x' } }]),
      { type: 'doc', content: [{ type: 'image', attrs: { src: 'x' } }] },
      '<script>alert(1)</script>',
    ]) {
      expect(esquemaCrearSeguimiento.safeParse(nuevo({ detalle })).success).toBe(false)
    }
  })
  it('una visibilidad que no existe, un resumen vacío o un id que no es un guid no pasan', () => {
    expect(esquemaCrearSeguimiento.safeParse(nuevo({ visibilidad: 'portal' })).success).toBe(false)
    expect(esquemaCrearSeguimiento.safeParse(nuevo({ titulo: '   ' })).success).toBe(false)
    expect(esquemaCrearSeguimiento.safeParse(nuevo({ id: 'x' })).success).toBe(false)
    expect(esquemaCrearSeguimiento.safeParse(nuevo({ ocurridoEn: 'ayer' })).success).toBe(false)
  })
})

describe('esquemaGuardarSeguimiento y la versión', () => {
  it('pide la versión y algo que guardar', () => {
    expect(
      esquemaGuardarSeguimiento.safeParse({ id: ID, actualizadoEnEsperado: 'v', cambios: {} })
        .success,
    ).toBe(false)
    expect(esquemaGuardarSeguimiento.safeParse({ id: ID, cambios: { titulo: 'x' } }).success).toBe(
      false,
    )
    expect(
      esquemaGuardarSeguimiento.safeParse({
        id: ID,
        actualizadoEnEsperado: 'v',
        cambios: { detalle: null, visibilidad: 'publico' },
      }).success,
    ).toBe(true)
    expect(
      esquemaVersionDeSeguimiento.safeParse({ id: ID, actualizadoEnEsperado: '' }).success,
    ).toBe(false)
  })
})
