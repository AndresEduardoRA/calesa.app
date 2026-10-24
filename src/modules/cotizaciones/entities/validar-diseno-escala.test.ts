import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { disenoSintetico, type DisenoSintetico } from './diseno-sintetico'
import { validarDiseno } from './validar-diseno'
import { validarFormula } from './validar'

// Lo que mide un diseño: nodos de la fórmula, ítems, secciones, modos, grupos y el contexto.
function tamano(s: DisenoSintetico): number {
  const d = s.diseno
  const items = d.secciones.reduce((suma, x) => suma + x.items.length, 0)
  const c = s.contexto
  return (
    s.definicion.nodos.length +
    items +
    d.secciones.length +
    2 * d.cabecera.modos.length +
    s.definicion.grupos.length +
    c.niveles.length +
    c.tonos.length +
    50
  )
}

function visitas(s: DisenoSintetico): number {
  const f = validarFormula(s.definicion, s.params)
  if (!f.ok) throw new Error(f.error.mensaje)
  const medidor = { visitas: 0 }
  const r = validarDiseno(f.formula.definicion, s.diseno, s.contexto, medidor)
  // Si no valida, el mensaje dice por qué.
  expect(r.ok ? r : r.error).toMatchObject({ ok: true })
  return medidor.visitas
}

// El peor ítem cuesta 8 visitas: recorrerlo, buscar su nodo, el nivel de ver y el de editar (2 y 2) y su registro (2); el peor nodo
// de la fórmula, 5 (indexarlo, y su cobertura con 3). k = 8, fijado por esa cuenta y no por lo medido.
const K = 8

const ARCHIVOS = [
  'validar-diseno.ts',
  'validar-diseno-contexto.ts',
  'validar-diseno-modos.ts',
  'validar-diseno-secciones.ts',
  'validar-diseno-cobertura.ts',
]

describe('validarDiseno con volumen', () => {
  const chica = disenoSintetico(40)
  const grande = disenoSintetico(400)

  it('valida los dos sintéticos, de unos 200 y de unos 2.000 ítems', () => {
    expect(chica.diseno.secciones.reduce((s, x) => s + x.items.length, 0)).toBeGreaterThan(200)
    expect(grande.diseno.secciones.reduce((s, x) => s + x.items.length, 0)).toBeGreaterThan(2000)
  })

  it('visita a lo sumo k veces el tamaño del diseño: es lineal en ítems y nodos', () => {
    expect(visitas(chica)).toBeLessThanOrEqual(K * tamano(chica))
    expect(visitas(grande)).toBeLessThanOrEqual(K * tamano(grande))
  })

  it('diez veces más unidades son a lo sumo 10,5 veces más visitas, no cien', () => {
    expect(visitas(grande)).toBeLessThanOrEqual(10.5 * visitas(chica))
  })

  it('los validadores no buscan en una lista (el contador no lo vería): todo pasa por Map, Set y el medidor', () => {
    for (const a of ARCHIVOS) {
      const fuente = readFileSync(new URL(a, import.meta.url), 'utf8')
      expect(fuente, a).not.toMatch(
        /\.(includes|indexOf|lastIndexOf|find|findIndex|findLast|filter|some|every)\(/,
      )
    }
  })

  it('todo bucle de los validadores pasa por recorrer(): sin él, el contador no lo vería', () => {
    for (const a of ARCHIVOS) {
      const fuente = readFileSync(new URL(a, import.meta.url), 'utf8')
      expect(fuente, a).not.toMatch(/for \((const|let|var) [^)]* of (?!recorrer\()/)
    }
  })
})
