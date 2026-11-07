import { describe, expect, it } from 'vitest'
import { compilarFila } from './compilar-fila'
import { conElAjuste, formulaDePrueba, nodoDe } from './fila-de-prueba.soporte'

const base = () => formulaDePrueba([{ id: 'total', texto: '=(remate+fees)*4%' }])
// El ⚙ dejó total__2 en −3: el texto ya no manda.
const conAjuste = () => conElAjuste(base(), 'total__2', -3)
const pedido = (texto: string, confirmaPisar?: boolean) => ({
  destino: { existente: 'total' },
  texto,
  ...(confirmaPisar === undefined ? {} : { confirmaPisar }),
})

describe('recompilar no pisa el ⚙ sin preguntar (T10, C10)', () => {
  it('con el texto que no manda, recompilar el mismo texto pregunta (nuevo: 0.04)', () => {
    const f = conAjuste()
    const antes = structuredClone(f)
    const r = compilarFila(f, pedido('=(remate+fees)*4%'))
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).toMatchObject({
      codigo: 'pisa_un_valor',
      cambios: [{ id: 'total__2', guardado: -3, nuevo: 0.04 }],
    })
    expect(f).toStrictEqual(antes)
  })

  it('si la constante desaparece del texto nuevo, también pregunta (nuevo: null)', () => {
    const r = compilarFila(conAjuste(), pedido('=remate+fees'))
    expect(!r.ok && r.error).toMatchObject({
      codigo: 'pisa_un_valor',
      cambios: [{ id: 'total__2', guardado: -3, nuevo: null }],
    })
  })

  it('con confirmaPisar los dos compilan', () => {
    for (const texto of ['=(remate+fees)*4%', '=remate+fees']) {
      const r = compilarFila(conAjuste(), pedido(texto, true))
      expect(r.ok, texto).toBe(true)
    }
    const r = compilarFila(conAjuste(), pedido('=(remate+fees)*4%', true))
    expect(r.ok && r.formula.params.constantes['total__2']).toBe(0.04)
  })

  it('un texto nuevo que deja el mismo valor no pregunta', () => {
    const r = compilarFila(conAjuste(), pedido('=(remate+fees)*-3'))
    expect(r.ok).toBe(true)
  })

  it('al día o reescrito, no pregunta: cambiar un número es lo que la persona tipeó', () => {
    expect(compilarFila(base(), pedido('=remate+fees')).ok).toBe(true)
    const g = conElAjuste(base(), 'total__2', 0.05)
    const r = compilarFila(g, pedido('=(remate+fees)*5%'))
    expect(r.ok && r.formula.params.constantes['total__2']).toBe(0.05)
    expect(compilarFila(g, pedido('=remate+fees')).ok).toBe(true)
    expect(nodoDe(base(), 'total')).toBeDefined()
  })
})
