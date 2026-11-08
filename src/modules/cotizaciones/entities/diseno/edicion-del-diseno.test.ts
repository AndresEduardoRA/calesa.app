import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { esquemaDiseno } from '../diseno'
import { validarFormula } from '../validar'
import { validarDiseno } from '../validar-diseno'
import { celda, disenoDe, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'
import {
  contextoDelEditor,
  hayCambiosEnElDiseno,
  pedidoDeGuardarDiseno,
  ponerAncho,
  ponerSeccion,
} from './edicion-del-diseno'
import { ponerNiveles } from './niveles'

// La ruta va por una variable: Vite reescribe un `new URL('…', import.meta.url)` literal.
const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')

const diseno = disenoDe([seccion('s', [celda('a'), celda('b')]), seccion('t', [celda('c')])])
const leida = { definicion: formulaDePrueba, params: { tasa: 0.1, tablas: { x: [{ k: 1 }] } } }
const ORIGEN = '11111111-1111-4111-8111-111111111111'

describe('pedidoDeGuardarDiseno', () => {
  it('T2 · sobre la publicada: nota nula y esperada «publicada»', () => {
    const base = {
      id: '22222222-2222-4222-8222-222222222222',
      estado: 'publicada' as const,
      actualizadoEn: '2026-11-08T10:00:00.123456+00:00',
      nota: 'de la publicación',
    }
    const p = pedidoDeGuardarDiseno(base, leida, diseno, ORIGEN)
    expect(p.nota).toBeNull()
    expect(p.esperada).toStrictEqual({ sobre: 'publicada', publicadaId: base.id })
  })

  it('T2 · sobre el borrador: su nota y su hora tal cual; definición y params iguales a lo leído', () => {
    const base = {
      id: '22222222-2222-4222-8222-222222222222',
      estado: 'borrador' as const,
      actualizadoEn: '2026-11-08T10:00:00.123456+00:00',
      nota: 'mi nota',
    }
    const p = pedidoDeGuardarDiseno(base, leida, diseno, ORIGEN)
    expect(p.nota).toBe('mi nota')
    expect(p.esperada).toStrictEqual({
      sobre: 'borrador',
      actualizadoEn: '2026-11-08T10:00:00.123456+00:00',
    })
    expect(p.definicion).toStrictEqual(leida.definicion)
    expect(p.params).toStrictEqual(leida.params)
    expect(p.diseno).toBe(diseno)
  })
})

describe('ponerSeccion y ponerAncho', () => {
  it('cambian lo pedido sin mutar; un título de blancos quita la clave; se corta a 80', () => {
    const conTitulo = ponerSeccion(diseno, 's', { titulo: '  Costos  ', presentacion: 'avanzado' })
    expect(conTitulo.secciones[0]).toMatchObject({ titulo: 'Costos', presentacion: 'avanzado' })
    expect(diseno.secciones[0]).not.toHaveProperty('titulo')
    expect(ponerSeccion(conTitulo, 's', { titulo: '   ' }).secciones[0]).not.toHaveProperty(
      'titulo',
    )
    const largo = ponerSeccion(diseno, 's', { titulo: 'x'.repeat(100) })
    expect(Array.from(largo.secciones[0]?.titulo ?? '')).toHaveLength(80)
    expect(ponerAncho(diseno, 's', 'b', 'mitad').secciones[0]?.items[1]).toMatchObject({
      nodo: 'b',
      ancho: 'mitad',
    })
    expect(ponerAncho(diseno, 's', 'no_existe', 'mitad')).toEqual(diseno)
  })
})

describe('contextoDelEditor + validarDiseno', () => {
  it('T3 · el diseño de «capturas» con una sección y una celda en «costos» no da editar_sin_ver ni nivel_no_admitido', () => {
    const juego = JSON.parse(leer('../casos-de-diseno.json')) as {
      contexto: { niveles: string[]; retirados: string[]; tonos: string[] }
      formulas: Record<string, { definicion: unknown; params: unknown }>
      casos: { nombre: string; diseno: unknown }[]
    }
    const f = juego.formulas['capturas']
    const caso = juego.casos.find((c) => c.nombre.startsWith('capturas:'))
    if (f === undefined || caso === undefined) throw new Error('falta el caso «capturas»')
    const formula = validarFormula(f.definicion, f.params)
    if (!formula.ok) throw new Error('la fórmula de «capturas» no valida')
    const d = ponerNiveles(
      ponerNiveles(esquemaDiseno.parse(caso.diseno), { seccion: 'aduana' }, { ver: 'costos' }),
      { seccion: 'logistica', nodo: 'grua' },
      { ver: 'costos' },
    )
    const contexto = contextoDelEditor(formula.formula.definicion, [
      { clave: 'costos', nombre: 'Costos', retirado: false },
    ])
    expect(contexto.retirados).toEqual([])
    expect(contexto.niveles).toEqual(['costos'])
    const r = validarDiseno(formula.formula.definicion, d, contexto)
    expect(r.ok ? 'válida' : r.error).toBe('válida')
  })

  it('T3 · los retirados salen en retirados y los tonos son los de los grupos', () => {
    const c = contextoDelEditor(formulaDePrueba, [
      { clave: 'a', nombre: 'A', retirado: false },
      { clave: 'b', nombre: 'B', retirado: true },
    ])
    expect(c).toEqual({ niveles: ['a', 'b'], retirados: ['b'], tonos: [] })
  })
})

describe('hayCambiosEnElDiseno', () => {
  it('T4 · el orden de las claves no cuenta; un nivel_ver nuevo sí', () => {
    const otro = JSON.parse(JSON.stringify(diseno)) as typeof diseno
    const primera = otro.secciones[0]
    if (primera === undefined) throw new Error('sin sección')
    otro.secciones[0] = {
      items: primera.items,
      presentacion: primera.presentacion,
      id: primera.id,
    }
    expect(hayCambiosEnElDiseno(diseno, otro)).toBe(false)
    expect(hayCambiosEnElDiseno(diseno, diseno)).toBe(false)
    expect(
      hayCambiosEnElDiseno(diseno, ponerNiveles(diseno, { seccion: 's' }, { ver: 'costos' })),
    ).toBe(true)
  })
})
