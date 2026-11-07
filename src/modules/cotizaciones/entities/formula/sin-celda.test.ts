import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { esquemaDiseno, type Diseno } from '../diseno'
import type { Definicion } from '../formula'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'
import { formulaDePrueba } from './fila-de-prueba.soporte'
import { TEXTO_SIN_DISENO, filasSinCelda, nodosSinCelda, textoDeSinCelda } from './sin-celda'

// La fórmula de prueba: `total` = `=(remate+fees)*4%` (con su auxiliar `total__2` del 4 %, y `total__1`, la suma) y `seguro`, una constante.
const formula = () =>
  formulaDePrueba([
    { id: 'total', texto: '=(remate+fees)*4%', etiqueta: 'Total' },
    { id: 'seguro', texto: '150', etiqueta: 'Seguro' },
  ])

const celda = (nodo: string, secundario?: 'porcentaje' | 'monto') => ({
  tipo: 'celda' as const,
  nodo,
  ancho: 'completo' as const,
  ...(secundario ? { secundario } : {}),
})

// Un diseño con una sección por lista de ítems.
const disenoCon = (...items: Diseno['secciones'][number]['items'][]): Diseno => ({
  cabecera: { modos: [], ver_total_bs: false },
  secciones: items.map((x, i) => ({ id: `s${String(i)}`, presentacion: 'principal', items: x })),
  tarjeta_total: { nodo: 'total', secundarios: [] },
})

// Las celdas de los inputs de la base (remate, fees, flete): sin ellas cada prueba diría también esas filas.
const INPUTS = [celda('remate'), celda('fees'), celda('flete')]

describe('nodosSinCelda y filasSinCelda: lo que el diseño no muestra (C6, la regla de §5)', () => {
  it('una constante nueva sin celda: su fila', () => {
    const f = formula()
    const d = disenoCon(INPUTS, [celda('total__2'), celda('total')])
    expect(nodosSinCelda(f.definicion, d)).toEqual(['seguro'])
    expect(filasSinCelda(f.definicion, d)).toEqual({ tipo: 'filas', filas: ['seguro'] })
  })

  it('la auxiliar de un número sube a su fila, una vez aunque falten dos', () => {
    const f = formulaDePrueba([{ id: 'total', texto: '=remate*4%+100', etiqueta: 'Total' }])
    const d = disenoCon(INPUTS, [celda('total')])
    expect(nodosSinCelda(f.definicion, d)).toEqual(['total__1', 'total__3'])
    expect(filasSinCelda(f.definicion, d)).toEqual({ tipo: 'filas', filas: ['total'] })
  })

  it('una celda con secundario sobre un porcentaje_de cubre su pct; sin secundario, no', () => {
    const conPar = formulaDePrueba([
      { id: 'comision', texto: '=PORCENTAJE_DE(remate; 4%)', etiqueta: 'Comisión' },
      { id: 'total', texto: '=remate+comision', etiqueta: 'Total' },
    ])
    const raiz = conPar.definicion.nodos.find((n) => n.id === 'comision')
    expect(raiz?.tipo === 'calculo' && raiz.op).toBe('porcentaje_de')
    const conSecundario = disenoCon(INPUTS, [celda('comision', 'porcentaje'), celda('total')])
    expect(nodosSinCelda(conPar.definicion, conSecundario)).toEqual([])
    const sinSecundario = disenoCon(INPUTS, [celda('comision'), celda('total')])
    expect(nodosSinCelda(conPar.definicion, sinSecundario)).toEqual(['comision__1'])
  })

  it('un atajos sobre la constante no es su celda', () => {
    const f = formula()
    const d = disenoCon(INPUTS, [
      celda('total__2'),
      celda('total'),
      { tipo: 'atajos', nodo: 'seguro', columna: 'x', filas: 3 },
    ])
    expect(nodosSinCelda(f.definicion, d)).toEqual(['seguro'])
  })

  it('sin diseño: el caso propio', () => {
    expect(filasSinCelda(formula().definicion, null)).toEqual({ tipo: 'sin_diseno' })
  })

  it('todo con su celda: ninguna', () => {
    const f = formula()
    const d = disenoCon(INPUTS, [celda('total__2'), celda('total'), celda('seguro')])
    expect(filasSinCelda(f.definicion, d)).toEqual({ tipo: 'filas', filas: [] })
  })
})

describe('textoDeSinCelda', () => {
  const etiquetas = (n: number) => Array.from({ length: n }, (_, i) => `Fila ${String(i + 1)}`)

  it('ninguna: nada que decir', () => {
    expect(textoDeSinCelda([])).toBeNull()
  })

  it('una, cinco y siete (las cinco primeras y «y 2 más»)', () => {
    expect(textoDeSinCelda(['Seguro de carga'])).toBe(
      'Para publicar, el diseño de la hoja tiene que mostrar: «Seguro de carga». Puedes guardar igual.',
    )
    expect(textoDeSinCelda(etiquetas(5))).toBe(
      'Para publicar, el diseño de la hoja tiene que mostrar: «Fila 1», «Fila 2», «Fila 3», «Fila 4», «Fila 5». Puedes guardar igual.',
    )
    expect(textoDeSinCelda(etiquetas(7))).toBe(
      'Para publicar, el diseño de la hoja tiene que mostrar: «Fila 1», «Fila 2», «Fila 3», «Fila 4», «Fila 5» y 2 más. Puedes guardar igual.',
    )
  })

  it('el de un borrador sin diseño', () => {
    expect(TEXTO_SIN_DISENO).toBe(
      'Este borrador no tiene el diseño de la hoja: todavía no se puede publicar.',
    )
  })
})

// La paridad con el espejo de `validar_diseno()` (§5), sobre su juego: en los casos válidos nada queda sin celda; en cada `nodo_sin_seccion` de un input, una
// constante o una opción, el nodo que nombra está entre los que quedan sin celda. La ruta va por una variable (Vite reescribe un `new URL` literal).
describe('paridad con casos-de-diseno.json', () => {
  const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
  const esquemaCaso = z.object({
    nombre: z.string(),
    valida: z.boolean(),
    formula: z.string().optional(),
    formula_de: z.string().optional(),
    diseno: z.unknown(),
    motivo: z.object({ regla: z.string(), donde: z.string().optional() }).optional(),
  })
  const juego = z
    .object({
      formulas: z.record(z.string(), z.object({ definicion: z.unknown(), params: z.unknown() })),
      casos: z.array(esquemaCaso),
    })
    .parse(JSON.parse(leer('../casos-de-diseno.json')))
  const deFormulas = (
    JSON.parse(leer('../casos-de-formula.json')) as { casos: Record<string, unknown>[] }
  ).casos.map((c) => ({ nombre: c['nombre'], definicion: c['definicion'], params: c['params'] }))
  const definicionDe = (c: z.infer<typeof esquemaCaso>): Definicion | null => {
    const cruda =
      c.formula !== undefined
        ? juego.formulas[c.formula]
        : deFormulas.find((f) => f.nombre === c.formula_de)
    if (cruda === undefined) return null
    const r = validarFormula(cruda.definicion, cruda.params)
    return r.ok ? r.formula.definicion : null
  }
  const pideCelda = (n: Nodo | undefined) =>
    n?.tipo === 'input' || n?.tipo === 'constante' || n?.tipo === 'opcion'

  const conDiseno = juego.casos.flatMap((c) => {
    const definicion = definicionDe(c)
    const diseno = esquemaDiseno.safeParse(c.diseno)
    return definicion && diseno.success ? [{ c, definicion, diseno: diseno.data }] : []
  })

  it('el juego tiene casos válidos y de nodo_sin_seccion para comparar', () => {
    expect(conDiseno.filter((x) => x.c.valida).length).toBeGreaterThan(10)
    expect(
      conDiseno.filter((x) => x.c.motivo?.regla === 'nodo_sin_seccion').length,
    ).toBeGreaterThan(0)
  })

  it.each(conDiseno.filter((x) => x.c.valida))('válido: $c.nombre', ({ definicion, diseno }) => {
    expect(nodosSinCelda(definicion, diseno)).toEqual([])
  })

  it.each(
    conDiseno.filter(
      (x) =>
        x.c.motivo?.regla === 'nodo_sin_seccion' &&
        pideCelda(x.definicion.nodos.find((n) => n.id === x.c.motivo?.donde)),
    ),
  )('nodo_sin_seccion: $c.nombre', ({ c, definicion, diseno }) => {
    expect(nodosSinCelda(definicion, diseno)).toContain(c.motivo?.donde)
  })
})
