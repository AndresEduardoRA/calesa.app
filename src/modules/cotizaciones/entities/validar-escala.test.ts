import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { referenciasDe, soloEnDe } from './nodos'
import { validarFormula } from './validar'

// Una fórmula sintética de unos `n` nodos con todas las formas que crecen: cadenas de dos referencias, un
// `suma` de n/2, n/4 constantes en params, n/10 grupos y una variante de 50 claves con `solo_en` largos.
function sintetica(n: number) {
  const opciones = Array.from({ length: 50 }, (_, i) => ({
    clave: `o${i}`,
    etiqueta: `O${i}`,
    titulo: `Opción ${i}`,
  }))
  const soloEn = opciones.slice(0, 25).map((o) => o.clave)
  const grupos = Array.from({ length: n / 10 }, (_, i) => ({
    id: `g${i}`,
    etiqueta: `G${i}`,
    tono: 't',
    bucket: `b${i % 2}`,
  }))
  const nodos: Record<string, unknown>[] = [
    { id: 'tc_a', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'A', formato: 'raw' },
    { id: 'tc_b', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'B', formato: 'raw' },
    { id: 'variante', tipo: 'opcion', etiqueta: 'V', opciones },
    { id: 'pct', tipo: 'constante', etiqueta: 'P', formato: 'pct' },
  ]
  const params: Record<string, number> = { pct: 0.1 }
  const ids: string[] = []
  // Los miembros se reparten en orden entre los grupos: ninguno queda vacío.
  for (let k = 0, miembro = 0; nodos.length < n - 1; k += 1) {
    const id = `x${k}`
    const grupo = `g${miembro % grupos.length}`
    if (k % 4 !== 3) miembro += 1
    const [a, b] = [ids[k - 1] ?? 'pct', ids[k - 2] ?? 'pct']
    if (k % 4 === 0) {
      nodos.push({ id, tipo: 'constante', etiqueta: id, grupo })
      params[id] = k
    } else if (k % 4 === 1) nodos.push({ id, tipo: 'input', etiqueta: id, grupo })
    else if (k % 4 === 2)
      nodos.push({
        id,
        tipo: 'calculo',
        op: 'porcentaje_de',
        de: [a, b],
        pct: 'pct',
        etiqueta: id,
        grupo,
      })
    else
      nodos.push({
        id,
        tipo: 'calculo',
        op: 'multiplicar',
        de: [a, b],
        etiqueta: id,
        solo_en: soloEn,
      })
    ids.push(id)
  }
  nodos.push({
    id: 'total',
    tipo: 'calculo',
    op: 'suma',
    de: ids.filter((_, i) => i % 2 === 0),
    etiqueta: 'T',
    salida: 'total',
  })
  return {
    definicion: { nodos, buckets: { b0: 'tc_a', b1: 'tc_b' }, total_en: 'tc_b', grupos },
    params,
  }
}

// Lo que mide una fórmula: nodos, aristas (referencias y claves de `solo_en`), grupos, opciones y params.
function tamano(f: ReturnType<typeof sintetica>): number {
  const r = validarFormula(f.definicion, f.params)
  if (!r.ok) throw new Error(r.error.mensaje)
  const nodos = r.formula.definicion.nodos
  const aristas = nodos.reduce(
    (s, x) => s + referenciasDe(x).length + (soloEnDe(x)?.length ?? 0),
    0,
  )
  return nodos.length + aristas + f.definicion.grupos.length + 50 + Object.keys(f.params).length
}

function visitas(f: ReturnType<typeof sintetica>): number {
  const medidor = { visitas: 0 }
  const r = validarFormula(f.definicion, f.params, medidor)
  // Si no valida, el mensaje dice por qué.
  expect(r.ok ? r : r.error).toMatchObject({ ok: true })
  return medidor.visitas
}

// `validar.ts` hace 12 pasadas lineales por nodo y 6 por arista (docs/COTIZADOR.md › «Las reglas»): k = 16,
// fijado por esa cuenta y no por lo medido.
const K = 16

describe('validarFormula con volumen', () => {
  const chica = sintetica(200)
  const grande = sintetica(2000)

  it('valida las dos sintéticas, de 200 y de 2.000 nodos', () => {
    expect(chica.definicion.nodos).toHaveLength(200)
    expect(grande.definicion.nodos).toHaveLength(2000)
  })

  it('visita a lo sumo k veces el tamaño de la fórmula: es lineal en nodos y aristas', () => {
    expect(visitas(chica)).toBeLessThanOrEqual(K * tamano(chica))
    expect(visitas(grande)).toBeLessThanOrEqual(K * tamano(grande))
  })

  it('diez veces más nodos son a lo sumo 10,5 veces más visitas, no cien', () => {
    expect(visitas(grande)).toBeLessThanOrEqual(10.5 * visitas(chica))
  })

  it('los validadores no buscan en una lista (el contador no lo vería): todo pasa por Map, Set y el medidor', () => {
    const archivos = [
      'validar.ts',
      'validar-contexto.ts',
      'validar-grupos.ts',
      'validar-variante.ts',
    ]
    for (const a of archivos) {
      const fuente = readFileSync(new URL(a, import.meta.url), 'utf8')
      expect(fuente, a).not.toMatch(
        /\.(includes|indexOf|lastIndexOf|find|findIndex|findLast|filter|some|every)\(/,
      )
    }
  })
})
