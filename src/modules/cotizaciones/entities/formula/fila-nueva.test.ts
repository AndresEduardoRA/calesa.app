import { describe, expect, it } from 'vitest'
import { esquemaId } from '../nodos'
import { formulaDePrueba, validaLaFormula } from './fila-de-prueba.soporte'
import { idDeFilaNueva, ocupadosDe, sumarFila, type PedidoDeFilaNueva } from './fila-nueva'

const formula = () =>
  formulaDePrueba([
    { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
    { id: 'total', texto: '=base*2', etiqueta: 'Total' },
  ])
const pedido = (resto: Partial<PedidoDeFilaNueva> = {}): PedidoDeFilaNueva => ({
  despuesDe: 'base',
  etiqueta: 'Seguro',
  id: 'seguro',
  tipo: 'calculo',
  texto: 'remate+fees',
  ...resto,
})
const ids = (f: ReturnType<typeof formula>) => f.definicion.nodos.map((n) => n.id)

describe('idDeFilaNueva (T4)', () => {
  const libre = new Set<string>()
  it('propone el id desde la etiqueta, sin tildes y en minúsculas ASCII', () => {
    expect(idDeFilaNueva('Seguro de carga', libre)).toBe('seguro_de_carga')
    expect(idDeFilaNueva('Año', libre)).toBe('ano')
    expect(idDeFilaNueva('Ñandú', libre)).toBe('nandu')
    expect(idDeFilaNueva('  Flete (USD) / mar!  ', libre)).toBe('flete_usd_mar')
  })

  it('con un dígito al frente o sin letras, con el prefijo fila_', () => {
    expect(idDeFilaNueva('2024 flete', libre)).toBe('fila_2024_flete')
    expect(idDeFilaNueva('???', libre)).toBe('fila')
    expect(idDeFilaNueva('', libre)).toBe('fila')
  })

  it('corta a 41 caracteres y siempre cumple esquemaId', () => {
    const largo = idDeFilaNueva('x'.repeat(60), libre)
    expect(largo).toHaveLength(41)
    for (const e of ['Seguro de carga', 'Año', '2024 flete', '???', 'a'.repeat(60), 'a b  c__d']) {
      expect(esquemaId.safeParse(idDeFilaNueva(e, libre)).success).toBe(true)
    }
  })

  it('nunca lleva «__»', () => {
    expect(idDeFilaNueva('a__b___c', libre)).toBe('a_b_c')
    const choque = new Set(['a_b'])
    expect(idDeFilaNueva('a b', choque)).not.toContain('__')
  })

  it('si choca con un nodo, una constante, un grupo, un bucket o una clave de cambio, sufija _2, _3…', () => {
    const f = formula()
    const ocupados = new Set([...ocupadosDe(f), 'grupo_a', 'bucket_x', 'clave_cambio'])
    expect(idDeFilaNueva('Base', ocupados)).toBe('base_2')
    expect(idDeFilaNueva('oficial', ocupadosDe(f))).toBe('oficial_2')
    const dos = new Set(['seguro', 'seguro_2'])
    expect(idDeFilaNueva('Seguro', dos)).toBe('seguro_3')
    expect(idDeFilaNueva('Grupo A', ocupados)).toBe('grupo_a_2')
  })

  it('el sufijo recorta la base para caber en 41', () => {
    const base = 'x'.repeat(41)
    const r = idDeFilaNueva(base, new Set([base]))
    expect(r).toHaveLength(41)
    expect(r.endsWith('_2')).toBe(true)
    expect(esquemaId.safeParse(r).success).toBe(true)
  })
})

describe('ocupadosDe', () => {
  it('trae nodos, constantes, grupos, buckets y claves de cambio', () => {
    const f = formula()
    const o = ocupadosDe({
      ...f,
      definicion: {
        ...f.definicion,
        grupos: [{ id: 'g1', etiqueta: 'G', tono: 't', bucket: 'b' }],
      },
    })
    for (const x of ['base', 'total', 'tc', 'oficial', 'b', 'g1', 'remate'])
      expect(o.has(x)).toBe(true)
  })
})

describe('sumarFila (T4)', () => {
  it('una constante 0 se pone tras la fila con su valor en params', () => {
    const f = formula()
    const r = sumarFila(f, pedido({ tipo: 'constante', texto: '0', id: 'k', etiqueta: 'K' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(ids(r.formula).indexOf('k')).toBe(ids(f).indexOf('base') + 1)
    expect(r.formula.params.constantes['k']).toBe(0)
    expect(validaLaFormula(r.formula).ok).toBe(true)
  })

  it('un cálculo a+b se pone tras la fila', () => {
    const f = formula()
    const r = sumarFila(f, pedido())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(ids(r.formula)[ids(f).indexOf('base') + 1]).toBe('seguro')
    expect(validaLaFormula(r.formula).ok).toBe(true)
    // La fórmula que recibió no cambió.
    expect(ids(f)).not.toContain('seguro')
  })

  it('con auxiliares (=remate*4%) crea la auxiliar delante y la fila queda tras despuesDe', () => {
    const r = sumarFila(formula(), pedido({ texto: '=remate*4%' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const orden = ids(r.formula)
    expect(orden.indexOf('seguro__1')).toBeLessThan(orden.indexOf('seguro'))
    expect(orden.indexOf('seguro__1')).toBeGreaterThan(orden.indexOf('base'))
  })

  it('tipo_distinto en los dos sentidos, junto al texto', () => {
    const a = sumarFila(formula(), pedido({ tipo: 'calculo', texto: '5' }))
    expect(a).toMatchObject({ ok: false, error: { codigo: 'tipo_distinto', campo: 'texto' } })
    expect(!a.ok && a.error.mensaje).toBe(
      'Un número solo es una constante: elige «Constante» o escribe una operación.',
    )
    const b = sumarFila(formula(), pedido({ tipo: 'constante', texto: 'remate+fees' }))
    expect(b).toMatchObject({ ok: false, error: { codigo: 'tipo_distinto', campo: 'texto' } })
    expect(!b.ok && b.error.mensaje).toBe(
      'Una constante es un número solo: elige «Cálculo» para una operación.',
    )
  })

  it('etiqueta vacía y de 61 caracteres, junto a la etiqueta', () => {
    expect(sumarFila(formula(), pedido({ etiqueta: '   ' }))).toMatchObject({
      ok: false,
      error: {
        codigo: 'etiqueta_vacia',
        campo: 'etiqueta',
        mensaje: 'Escribe cómo se llama la fila.',
      },
    })
    expect(sumarFila(formula(), pedido({ etiqueta: 'e'.repeat(61) }))).toMatchObject({
      ok: false,
      error: { codigo: 'etiqueta_larga', campo: 'etiqueta' },
    })
    expect(sumarFila(formula(), pedido({ etiqueta: 'e'.repeat(60) })).ok).toBe(true)
  })

  it('id_invalido (con la regla) e id_ocupado, junto al nombre', () => {
    const inv = sumarFila(formula(), pedido({ id: 'Seguro de carga' }))
    expect(inv).toMatchObject({ ok: false, error: { codigo: 'id_invalido', campo: 'id' } })
    expect(!inv.ok && inv.error.mensaje).toContain('minúsculas sin tildes')
    const oc = sumarFila(formula(), pedido({ id: 'base' }))
    expect(oc).toMatchObject({ ok: false, error: { codigo: 'id_ocupado', campo: 'id' } })
    expect(!oc.ok && oc.error.mensaje).toBe('Ya hay una fila llamada «base».')
  })

  it('fila_inexistente (despuesDe que no existe) cae junto al nombre', () => {
    expect(sumarFila(formula(), pedido({ despuesDe: 'nada' }))).toMatchObject({
      ok: false,
      error: { codigo: 'fila_inexistente', campo: 'id' },
    })
  })

  it('un texto que no compila da el error del compilador junto al texto', () => {
    const r = sumarFila(formula(), pedido({ texto: 'remate+' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.campo).toBe('texto')
  })
})
