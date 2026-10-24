import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formulaSintetica, type FormulaSintetica } from './formula-sintetica'
import { referenciasDe, soloEnDe } from './nodos'
import { validarFormula } from './validar'

// Lo que mide una fórmula: nodos, aristas (referencias y claves de `solo_en`), grupos, opciones y params.
function tamano(f: FormulaSintetica): number {
  const r = validarFormula(f.definicion, f.params)
  if (!r.ok) throw new Error(r.error.mensaje)
  const nodos = r.formula.definicion.nodos
  const aristas = nodos.reduce(
    (s, x) => s + referenciasDe(x).length + (soloEnDe(x)?.length ?? 0),
    0,
  )
  return nodos.length + aristas + f.definicion.grupos.length + 50 + Object.keys(f.params).length
}

function visitas(f: FormulaSintetica): number {
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
  const chica = formulaSintetica(200)
  const grande = formulaSintetica(2000)

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
      'validar-campos.ts',
    ]
    for (const a of archivos) {
      const fuente = readFileSync(new URL(a, import.meta.url), 'utf8')
      expect(fuente, a).not.toMatch(
        /\.(includes|indexOf|lastIndexOf|find|findIndex|findLast|filter|some|every)\(/,
      )
    }
  })

  it('todo bucle de los validadores pasa por recorrer(): sin él, el contador no lo vería', () => {
    const archivos = [
      'validar.ts',
      'validar-contexto.ts',
      'validar-grupos.ts',
      'validar-variante.ts',
      'validar-campos.ts',
    ]
    for (const a of archivos) {
      const fuente = readFileSync(new URL(a, import.meta.url), 'utf8')
      expect(fuente, a).not.toMatch(/for \((const|let|var) [^)]* of (?!recorrer\()/)
    }
  })
})
