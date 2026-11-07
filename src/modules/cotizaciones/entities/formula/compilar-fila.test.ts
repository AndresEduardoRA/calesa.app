import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { compilarFila, type PedidoDeFila } from './compilar-fila'
import {
  CINCO_FILAS,
  formulaDeNFilas,
  formulaDePrueba,
  idsDe,
  nodoDe,
  sinTextoEn,
  validaLaFormula,
} from './fila-de-prueba.soporte'

const existente = (id: string, texto: string): PedidoDeFila => ({
  destino: { existente: id },
  texto,
})

function bien(formula: Formula, pedido: PedidoDeFila) {
  const r = compilarFila(formula, pedido)
  if (!r.ok) throw new Error(`no compiló: ${JSON.stringify(r.error)}`)
  return r
}
function mal(formula: Formula, pedido: PedidoDeFila) {
  const r = compilarFila(formula, pedido)
  if (r.ok) throw new Error('compiló y no debía')
  return r.error
}

const UNA = () => formulaDePrueba([{ id: 'total', texto: '=remate' }])

describe('el tope de 2.000 (T2, C4, 4-6)', () => {
  it('2.001 unidades ASCII: texto_demasiado_largo desde el índice 2.000 y la fórmula igual', () => {
    const f = UNA()
    const antes = structuredClone(f)
    const e = mal(f, existente('total', `=remate${' '.repeat(1994)}`))
    expect(e.codigo).toBe('texto_demasiado_largo')
    expect('tramo' in e && e.tramo).toEqual({ desde: 2000, largo: 1, linea: 1, columna: 2001 })
    expect(f).toStrictEqual(antes)
  })

  it('2.000 unidades compilan', () => {
    const r = bien(UNA(), existente('total', `=remate${' '.repeat(1993)}`))
    expect(nodoDe(r.formula, 'total')).toMatchObject({ texto: `=remate${' '.repeat(1993)}` })
  })

  it('1.000 astrales (2.000 unidades) dan otro error: no es el del tope', () => {
    const e = mal(UNA(), existente('total', '😀'.repeat(1000)))
    expect(e.codigo).toBe('caracter_invalido')
  })

  it('1.001 astrales (2.002 unidades) pasan del tope, con el tramo desde 2.000', () => {
    const e = mal(UNA(), existente('total', '😀'.repeat(1001)))
    expect(e.codigo).toBe('texto_demasiado_largo')
    expect('tramo' in e && e.tramo).toMatchObject({ desde: 2000, largo: 2 })
  })

  it('1.999 ASCII y un astral (2.001 unidades): el corte cae dentro del par y el tramo empieza en 1.999', () => {
    const e = mal(UNA(), existente('total', `${' '.repeat(1999)}😀`))
    expect(e.codigo).toBe('texto_demasiado_largo')
    expect('tramo' in e && e.tramo).toMatchObject({ desde: 1999, largo: 2, columna: 2000 })
  })
})

describe('recompilar el mismo texto (T3, C3, C6)', () => {
  const f = formulaDePrueba(CINCO_FILAS)
  it.each(CINCO_FILAS.map((x) => [x.id, x.texto] as const))(
    '%s da la misma fórmula',
    (id, texto) => {
      expect(bien(f, existente(id, texto)).formula).toStrictEqual(f)
    },
  )

  it('una fila propia total__1 que el texto nombra se recompila a la misma fórmula', () => {
    const g = sinTextoEn(
      formulaDePrueba([
        { id: 'total__1', texto: '=4' },
        { id: 'total', texto: '=total__1+remate' },
      ]),
      'total__1',
    )
    expect(bien(g, existente('total', '=total__1+remate')).formula).toStrictEqual(g)
  })

  it('no toca lo que recibe', () => {
    const antes = structuredClone(f)
    bien(f, existente('total', '=remate+fees'))
    expect(f).toStrictEqual(antes)
  })
})

describe('cambiar el texto de una fila (T4, C3)', () => {
  const f = formulaDePrueba([
    { id: 'total', texto: '=(remate+fees)*4%' },
    { id: 'cierre', texto: '=total' },
  ])

  it('quita las auxiliares viejas y sus params, sin huérfanos', () => {
    const r = bien(f, existente('total', '=remate+fees'))
    expect(idsDe(r.formula)).not.toContain('total__1')
    expect(idsDe(r.formula)).not.toContain('total__2')
    expect(r.formula.params.constantes).not.toHaveProperty('total__1')
    expect(r.formula.params.constantes).not.toHaveProperty('total__2')
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })

  it('suma las nuevas en el lugar de la fila', () => {
    const r = bien(f, existente('total', '=(remate+fees)*7%'))
    expect(r.formula.params.constantes['total__2']).toBe(0.07)
    expect(idsDe(r.formula).indexOf('total__1')).toBeLessThan(idsDe(r.formula).indexOf('total'))
    expect(idsDe(r.formula).indexOf('total')).toBeLessThan(idsDe(r.formula).indexOf('cierre'))
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })

  describe('con otra fila que nombra una auxiliar', () => {
    const g = formulaDePrueba([
      { id: 'total', texto: '=(remate+fees)*4%' },
      { id: 'otra', texto: '=total__2*2' },
    ])
    const rechazo = (texto: string) => {
      const antes = structuredClone(g)
      const e = mal(g, existente('total', texto))
      expect(g).toStrictEqual(antes)
      return e
    }

    it('quitarla da auxiliar_nombrada', () => {
      expect(rechazo('=remate+fees')).toMatchObject({
        codigo: 'auxiliar_nombrada',
        nombre: 'total__2',
        fila: 'otra',
      })
    })

    it('cambiar su valor (4% a 5%) también', () => {
      expect(rechazo('=(remate+fees)*5%')).toMatchObject({
        codigo: 'auxiliar_nombrada',
        nombre: 'total__2',
      })
    })

    it('recompilar el mismo texto no da error', () => {
      expect(bien(g, existente('total', '=(remate+fees)*4%')).formula).toStrictEqual(g)
    })
  })

  it('cambiar el formato de una auxiliar nombrada (4% a 0.04) da auxiliar_nombrada', () => {
    const g = formulaDePrueba([
      { id: 'total', texto: '=(remate+fees)*4%' },
      { id: 'otra', texto: '=PORCENTAJE_DE(remate; total__2)' },
    ])
    const e = mal(g, existente('total', '=(remate+fees)*0.04'))
    expect(e).toMatchObject({ codigo: 'auxiliar_nombrada', nombre: 'total__2', fila: 'otra' })
  })
})

describe('lo que la fila conserva (T5, C5)', () => {
  const dos = (texto: string, extra: Record<string, unknown>) =>
    formulaDePrueba([
      { id: 'x', texto, extra },
      { id: 'cierre', texto: '=remate' },
    ])

  it('la raíz lleva el texto, seccion, color y sobrescribible de antes', () => {
    const f = dos('=remate+fees', { seccion: 'Costos', color: 'verde', sobrescribible: true })
    const r = bien(f, existente('x', '=remate*flete'))
    expect(nodoDe(r.formula, 'x')).toMatchObject({
      texto: '=remate*flete',
      seccion: 'Costos',
      color: 'verde',
      sobrescribible: true,
      op: 'multiplicar',
    })
    expect(r.soltados).toEqual([])
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })

  it('una suma con interruptor reescrita como SI queda con la bandera del texto y suelta el interruptor', () => {
    const f = dos('=remate+fees', { condicion: 'c' })
    const r = bien(f, existente('x', '=SI(b; remate)'))
    expect(nodoDe(r.formula, 'x')).toMatchObject({ op: 'si', condicion: 'b' })
    expect(r.soltados).toContain('condicion')
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })

  it('un SI reescrito como suma queda sin condicion y sin soltados', () => {
    const f = dos('=SI(b; remate)', {})
    const r = bien(f, existente('x', '=remate+fees'))
    expect(nodoDe(r.formula, 'x')).not.toHaveProperty('condicion')
    expect(r.soltados).toEqual([])
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })

  it('un SI reescrito como SI deja la bandera del texto nuevo', () => {
    const f = dos('=SI(b; remate)', {})
    const r = bien(f, existente('x', '=SI(c; remate)'))
    expect(nodoDe(r.formula, 'x')).toMatchObject({ op: 'si', condicion: 'c' })
  })

  it('una suma con interruptor reescrita como resta lo conserva', () => {
    const f = dos('=remate+fees', { condicion: 'c' })
    const r = bien(f, existente('x', '=remate-fees'))
    expect(nodoDe(r.formula, 'x')).toMatchObject({ op: 'restar', condicion: 'c' })
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })

  it('de calculo a constante suelta sobrescribible y lo dice', () => {
    const f = dos('=remate+fees', { sobrescribible: true, seccion: 'Costos' })
    const r = bien(f, existente('x', '=4'))
    const nodo = nodoDe(r.formula, 'x')
    expect(nodo).toMatchObject({ tipo: 'constante', seccion: 'Costos', texto: '=4' })
    expect(nodo).not.toHaveProperty('sobrescribible')
    expect(r.soltados).toEqual(['sobrescribible'])
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })
})

describe('un texto que no compila (T6)', () => {
  it('devuelve el error del compilador y no cambia nada', () => {
    const f = formulaDePrueba(CINCO_FILAS)
    const antes = structuredClone(f)
    const e = mal(f, existente('total', '=nada+1'))
    expect(e.codigo).toBe('nombre_desconocido')
    expect('tramo' in e && e.tramo).toMatchObject({ desde: 1, largo: 4 })
    expect(f).toStrictEqual(antes)
  })
})

describe('una fila nueva y los pedidos que no valen', () => {
  const f = formulaDePrueba(CINCO_FILAS)
  const nueva = (id: string, despuesDe: string | null, texto = '=remate+fees'): PedidoDeFila => ({
    destino: { id, etiqueta: 'Nueva', despuesDe },
    texto,
  })

  it('se pone tras la fila que se dice (y sus auxiliares) o al principio', () => {
    const tras = bien(f, nueva('nueva', 'total')).formula
    const i = idsDe(tras)
    expect(i.indexOf('nueva')).toBe(i.indexOf('total') + 1)
    const principio = bien(f, nueva('nueva', null, '=4')).formula
    expect(idsDe(principio)[0]).toBe('nueva')
    // Al principio no hay nada antes que el texto pueda nombrar.
    expect(mal(f, nueva('nueva', null)).codigo).toBe('referencia_hacia_adelante')
    expect(nodoDe(tras, 'nueva')).toMatchObject({ texto: '=remate+fees', etiqueta: 'Nueva' })
  })

  it('no vale un id que ya existe, uno mal escrito ni una fila que no está', () => {
    expect(mal(f, nueva('total', null)).codigo).toBe('id_ocupado')
    expect(mal(f, nueva('total__1', null)).codigo).toBe('id_ocupado')
    expect(mal(f, nueva('Mal Id', null)).codigo).toBe('id_invalido')
    expect(mal(f, nueva('nueva', 'no_existe')).codigo).toBe('fila_inexistente')
    expect(mal(f, existente('no_existe', '=remate')).codigo).toBe('fila_inexistente')
  })
})

describe('escala (T12)', () => {
  const visitas = (n: number) => {
    const m = { visitas: 0 }
    const f = formulaDeNFilas(n)
    const r = compilarFila(f, existente(`r${String(n)}`, '=remate+fees'), m)
    expect(r.ok).toBe(true)
    return m.visitas
  }
  it('compilar la última fila de 2.000 nodos cuesta visitas lineales', () => {
    const v1 = visitas(2000)
    const v2 = visitas(4000)
    expect(v1).toBeGreaterThan(2000)
    expect(v2).toBeLessThanOrEqual(2 * v1 + 200)
  })
})
