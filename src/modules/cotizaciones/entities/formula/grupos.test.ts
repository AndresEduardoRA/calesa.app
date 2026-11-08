import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { evaluar } from '../motor'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'
import { filasDe } from './filas'
import {
  aplicarGrupo,
  grupoDelRechazo,
  miembrosDe,
  puedeSumarAlGrupo,
  type CambiosDelGrupo,
} from './grupos'

// Una fórmula con dos grupos de buckets distintos (T1 y T5): `ga` (bucket `a` → `tca`, clave `oficial`) y `gb` (bucket `b` → `tcb`, clave `paralelo`),
// el total dividido por `tca`. `ga` lleva dos miembros para que mover `cinco` no lo deje vacío.
const NODOS: Nodo[] = [
  { id: 'tca', tipo: 'tipo_cambio', etiqueta: 'TC A', clave: 'oficial' },
  { id: 'tcb', tipo: 'tipo_cambio', etiqueta: 'TC B', clave: 'paralelo' },
  { id: 'cinco', tipo: 'constante', etiqueta: 'Cinco', grupo: 'ga' },
  { id: 'uno', tipo: 'constante', etiqueta: 'Uno', grupo: 'ga' },
  { id: 'dos', tipo: 'constante', etiqueta: 'Dos', grupo: 'gb' },
  { id: 'suelta', tipo: 'input', etiqueta: 'Suelta' },
  { id: 'pct', tipo: 'constante', etiqueta: 'Porcentaje', formato: 'pct' },
  { id: 'bandera', tipo: 'bandera', etiqueta: 'Bandera' },
  {
    id: 'total',
    tipo: 'calculo',
    op: 'suma',
    etiqueta: 'Total',
    salida: 'total',
    de: ['cinco', 'uno', 'dos', 'suelta'],
  },
] as Nodo[]

const FORMULA: Formula = {
  definicion: {
    nodos: NODOS,
    buckets: { a: 'tca', b: 'tcb' },
    total_en: 'tca',
    grupos: [
      { id: 'ga', etiqueta: 'Grupo A', plazo: '1 día', tono: 'verde', bucket: 'a' },
      { id: 'gb', etiqueta: 'Grupo B', tono: 'naranja', bucket: 'b' },
    ],
  },
  params: { constantes: { cinco: 5, uno: 1, dos: 2, pct: 0.13 }, tablas: {} },
}

const TONOS = new Set(['verde', 'naranja', 'azul'])

// `dos` escrita en texto (`=suelta+2`) con su auxiliar `dos__1` antes. La auxiliar lleva formato `usd` a propósito: así da un monto sin salida y sólo la regla
// «una auxiliar nunca suma a un grupo» (las filas raíz de `filasDe()`) la deja afuera.
const CON_AUXILIAR: Formula = {
  ...FORMULA,
  definicion: {
    ...FORMULA.definicion,
    nodos: FORMULA.definicion.nodos.flatMap((n): Nodo[] =>
      n.id === 'dos'
        ? ([
            { id: 'dos__1', tipo: 'constante', etiqueta: '2', formato: 'usd' },
            { ...n, tipo: 'calculo', op: 'suma', de: ['suelta', 'dos__1'], texto: '=suelta+2' },
          ] as Nodo[])
        : [n],
    ),
  },
  params: { ...FORMULA.params, constantes: { ...FORMULA.params.constantes, dos__1: 2 } },
}

const cambiosDe = (formula: Formula, id: string): CambiosDelGrupo => {
  const g = formula.definicion.grupos?.find((x) => x.id === id)
  if (!g) throw new Error(id)
  return {
    etiqueta: g.etiqueta,
    plazo: g.plazo ?? '',
    tono: g.tono,
    bucket: g.bucket,
    miembros: miembrosDe(formula, id).map((n) => n.id),
  }
}

function valida(formula: Formula) {
  const v = validarFormula(formula.definicion, {
    ...formula.params.constantes,
    tablas: formula.params.tablas,
  })
  if (!v.ok) throw new Error(v.error.mensaje)
  return v.formula
}

const ENTRADA = {
  inputs: {},
  banderas: {},
  tipos_cambio: { oficial: 7, paralelo: 10 },
  vehiculo: {},
  tablas: {},
  overrides: {},
}

describe('aplicarGrupo: los campos', () => {
  it('T1: cambia etiqueta, plazo, tono y bucket del grupo en su lugar, y nada más', () => {
    valida(FORMULA)
    const r = aplicarGrupo(
      FORMULA,
      'ga',
      {
        ...cambiosDe(FORMULA, 'ga'),
        etiqueta: '  Nuevo  ',
        plazo: ' 3 días ',
        tono: 'azul',
        bucket: 'b',
      },
      TONOS,
    )
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    expect(r.formula.definicion.grupos).toEqual([
      { id: 'ga', etiqueta: 'Nuevo', plazo: '3 días', tono: 'azul', bucket: 'b' },
      FORMULA.definicion.grupos?.[1],
    ])
    const { grupos: _g, ...resto } = r.formula.definicion
    const { grupos: _o, ...original } = FORMULA.definicion
    expect(resto).toEqual(original)
    expect(r.formula.params).toEqual(FORMULA.params)
    expect(r.entraron).toEqual([])
    expect(r.quitadas).toEqual([])
    valida(r.formula)
  })

  it('T2: plazo vacío quita la clave; los topes, la etiqueta en blanco, el tono y el bucket ajenos dan error en su campo; nunca lanza', () => {
    const base = cambiosDe(FORMULA, 'ga')
    const r = aplicarGrupo(FORMULA, 'ga', { ...base, plazo: '   ' }, TONOS)
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    const g = r.formula.definicion.grupos?.[0]
    expect(g && 'plazo' in g).toBe(false)

    const campos = (c: Partial<CambiosDelGrupo>) => {
      const x = aplicarGrupo(FORMULA, 'ga', { ...base, ...c }, TONOS)
      return x.ok ? [] : x.errores.map((e) => e.campo)
    }
    expect(campos({ plazo: 'x'.repeat(40) })).toEqual([])
    expect(campos({ plazo: 'x'.repeat(41) })).toEqual(['plazo'])
    expect(campos({ etiqueta: 'x'.repeat(60) })).toEqual([])
    expect(campos({ etiqueta: 'x'.repeat(61) })).toEqual(['etiqueta'])
    expect(campos({ etiqueta: '   ' })).toEqual(['etiqueta'])
    expect(campos({ tono: 'rojo' })).toEqual(['tono'])
    expect(campos({ bucket: 'c' })).toEqual(['bucket'])
    expect(campos({ etiqueta: '', plazo: 'x'.repeat(41), tono: 'rojo', bucket: 'c' })).toEqual([
      'etiqueta',
      'plazo',
      'tono',
      'bucket',
    ])
    const sinGrupo = aplicarGrupo(FORMULA, 'zz', base, TONOS)
    expect(sinGrupo.ok).toBe(false)
  })
})

describe('aplicarGrupo: las filas', () => {
  it('T3: una fila de otro grupo entra, una que se quita queda sin la clave; sólo cambia `grupo` de la raíz', () => {
    const r = aplicarGrupo(
      FORMULA,
      'gb',
      { ...cambiosDe(FORMULA, 'gb'), miembros: ['cinco', 'suelta'] },
      TONOS,
    )
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    expect(r.entraron).toEqual([
      { id: 'cinco', etiqueta: 'Cinco', desde: 'Grupo A' },
      { id: 'suelta', etiqueta: 'Suelta', desde: null },
    ])
    expect(r.quitadas).toEqual([{ id: 'dos', etiqueta: 'Dos' }])
    const nodos = r.formula.definicion.nodos
    expect(nodos.map((n) => n.id)).toEqual(NODOS.map((n) => n.id))
    expect(nodos.find((n) => n.id === 'cinco')?.grupo).toBe('gb')
    expect(nodos.find((n) => n.id === 'suelta')?.grupo).toBe('gb')
    const dos = nodos.find((n) => n.id === 'dos')
    expect(dos && 'grupo' in dos).toBe(false)
    // Lo demás de cada nodo, igual.
    for (const [i, n] of nodos.entries()) {
      const { grupo: _a, ...x } = n
      const { grupo: _b, ...y } = NODOS[i] as Nodo
      expect(x).toEqual(y)
    }
    valida(r.formula)
  })

  it('T3: con texto y auxiliares, mover la fila no toca su texto, sus auxiliares ni su lugar', () => {
    const r = aplicarGrupo(
      CON_AUXILIAR,
      'ga',
      { ...cambiosDe(CON_AUXILIAR, 'ga'), miembros: ['cinco', 'uno', 'dos'] },
      TONOS,
    )
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    const nodos = r.formula.definicion.nodos
    expect(nodos.map((n) => n.id)).toEqual(CON_AUXILIAR.definicion.nodos.map((n) => n.id))
    expect(nodos.find((n) => n.id === 'dos__1')).toEqual(
      CON_AUXILIAR.definicion.nodos.find((n) => n.id === 'dos__1'),
    )
    expect(nodos.find((n) => n.id === 'dos')).toMatchObject({ grupo: 'ga', texto: '=suelta+2' })
  })
})

describe('aplicarGrupo: quién suma y el dinero', () => {
  it('T4: una salida, un pct, una bandera o un id que no existe no pueden sumar; puedeSumarAlGrupo coincide con validarFormula()', () => {
    const base = cambiosDe(FORMULA, 'ga')
    for (const id of ['total', 'pct', 'bandera', 'tca', 'no_existe']) {
      const r = aplicarGrupo(FORMULA, 'ga', { ...base, miembros: [...base.miembros, id] }, TONOS)
      expect(r.ok, id).toBe(false)
      if (!r.ok) expect(r.errores.map((e) => e.campo)).toEqual(['miembros'])
    }
    // Una auxiliar (aquí un monto sin salida) nunca suma: sólo las filas raíz.
    const aux = CON_AUXILIAR.definicion.nodos.find((n) => n.id === 'dos__1')
    expect(aux && puedeSumarAlGrupo(aux)).toBe(true)
    expect(filasDe(CON_AUXILIAR.definicion).find((f) => f.nodo.id === 'dos')?.auxiliares).toEqual([
      'dos__1',
    ])
    const conAux = aplicarGrupo(
      CON_AUXILIAR,
      'ga',
      { ...cambiosDe(CON_AUXILIAR, 'ga'), miembros: ['cinco', 'uno', 'dos__1'] },
      TONOS,
    )
    expect(conAux.ok ? [] : conAux.errores.map((e) => e.campo)).toEqual(['miembros'])
    // Cada nodo, solo como miembro de `gb` junto a `dos`: puede sumar si y sólo si validarFormula() no lo rechaza como miembro.
    for (const n of NODOS) {
      const nodos = NODOS.map((x) => (x.id === n.id ? { ...x, grupo: 'gb' } : x)) as Nodo[]
      const v = validarFormula({ ...FORMULA.definicion, nodos }, { ...FORMULA.params.constantes })
      const rechazoDeMiembro =
        !v.ok && (v.error.regla === 'miembro_no_es_monto' || v.error.regla === 'miembro_con_salida')
      expect(puedeSumarAlGrupo(n), n.id).toBe(!rechazoDeMiembro)
    }
  })

  it('T5 (dinero): pasar una constante de 5 del grupo de bucket A al de bucket B cambia el total en Bs en 5 × (tcB − tcA)', () => {
    const antes = evaluar(valida(FORMULA), ENTRADA)
    const r = aplicarGrupo(
      FORMULA,
      'gb',
      { ...cambiosDe(FORMULA, 'gb'), miembros: ['cinco', 'dos'] },
      TONOS,
    )
    if (!r.ok) throw new Error(JSON.stringify(r.errores))
    const despues = evaluar(valida(r.formula), ENTRADA)
    const bsAntes = antes.totales.bs
    const bsDespues = despues.totales.bs
    const usdAntes = antes.totales.usd
    const usdDespues = despues.totales.usd
    if (bsAntes === null || bsDespues === null || usdAntes === null || usdDespues === null) {
      throw new Error('sin total')
    }
    // Antes: (5 + 1) × 7 + 2 × 10 = 62. Después: 1 × 7 + (5 + 2) × 10 = 77.
    expect(bsAntes).toBeCloseTo(62, 9)
    expect(bsDespues - bsAntes).toBeCloseTo(5 * (10 - 7), 9)
    expect(usdDespues - usdAntes).toBeCloseTo((5 * (10 - 7)) / 7, 9)
  })
})

describe('grupoDelRechazo', () => {
  it('T6: da el grupo de `grupo_vacio` y de `bucket_inexistente`; nulo para una fila o una auxiliar', () => {
    const grupos = FORMULA.definicion.grupos ?? []
    const vacio = aplicarGrupo(FORMULA, 'gb', { ...cambiosDe(FORMULA, 'gb'), miembros: [] }, TONOS)
    if (!vacio.ok) throw new Error('debía aplicar')
    const v = validarFormula(vacio.formula.definicion, { ...FORMULA.params.constantes })
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.error.regla).toBe('grupo_vacio')
      expect(grupoDelRechazo(v.error, grupos)).toBe('gb')
    }
    const sinBucket = validarFormula(
      {
        ...FORMULA.definicion,
        grupos: grupos.map((g) => (g.id === 'ga' ? { ...g, bucket: 'c' } : g)),
      },
      { ...FORMULA.params.constantes },
    )
    expect(sinBucket.ok).toBe(false)
    if (!sinBucket.ok) {
      expect(sinBucket.error.regla).toBe('bucket_inexistente')
      expect(grupoDelRechazo(sinBucket.error, grupos)).toBe('ga')
    }
    expect(grupoDelRechazo({ donde: 'cinco' }, grupos)).toBeNull()
    expect(grupoDelRechazo({ donde: 'dos__1' }, grupos)).toBeNull()
    expect(grupoDelRechazo({}, grupos)).toBeNull()
  })
})
