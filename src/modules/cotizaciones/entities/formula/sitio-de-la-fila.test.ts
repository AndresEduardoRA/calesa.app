import { describe, expect, it } from 'vitest'
import { filasDe } from './filas'
import { CINCO_FILAS, formulaDePrueba } from './fila-de-prueba.soporte'
import { sitioDe } from './sitio-de-la-fila'

const f = formulaDePrueba([
  ...CINCO_FILAS.slice(0, 2),
  {
    id: 'ultima',
    texto: '=total+base',
    destino: { formato: 'usd', descripcion: 'La última', salida: 'total' },
  },
])
const filas = filasDe(f.definicion)
const lugar = (id: string) => f.definicion.nodos.findIndex((n) => n.id === id)

describe('sitioDe', () => {
  it('una fila que existe ocupa sus auxiliares y su raíz, con lo que el destino lleva', () => {
    const s = sitioDe(f, filas, { existente: 'total' })
    expect(s).toMatchObject({ desde: lugar('total__1'), hasta: lugar('total') + 1 })
    expect(s).toMatchObject({ destino: { id: 'total', etiqueta: 'total' } })
    const u = sitioDe(f, filas, { existente: 'ultima' })
    expect(u).toMatchObject({
      destino: { id: 'ultima', formato: 'usd', descripcion: 'La última', salida: 'total' },
    })
  })

  it('una fila nueva ocupa un lugar vacío tras otra fila o al principio', () => {
    const tras = sitioDe(f, filas, { id: 'nueva', etiqueta: 'Nueva', despuesDe: 'total' })
    expect(tras).toMatchObject({
      fila: null,
      viejo: null,
      desde: lugar('total') + 1,
      hasta: lugar('total') + 1,
    })
    expect(sitioDe(f, filas, { id: 'nueva', etiqueta: 'Nueva', despuesDe: null })).toMatchObject({
      desde: 0,
      hasta: 0,
    })
  })

  it('un pedido que no vale da su código', () => {
    const codigo = (d: Parameters<typeof sitioDe>[2]) => {
      const s = sitioDe(f, filas, d)
      return 'codigo' in s ? s.codigo : 'ok'
    }
    expect(codigo({ existente: 'no_existe' })).toBe('fila_inexistente')
    expect(codigo({ existente: 'remate' })).toBe('tipo_no_editable')
    expect(codigo({ existente: 'b' })).toBe('tipo_no_editable')
    expect(codigo({ id: 'n', etiqueta: 'N', despuesDe: 'no_existe' })).toBe('fila_inexistente')
    expect(codigo({ id: 'Mal Id', etiqueta: 'N', despuesDe: null })).toBe('id_invalido')
    expect(codigo({ id: 'total', etiqueta: 'N', despuesDe: null })).toBe('id_ocupado')
    expect(codigo({ id: 'total__2', etiqueta: 'N', despuesDe: null })).toBe('id_ocupado')
  })
})
