import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  cambiosDeUnTono,
  coloresDeUnTonoNuevo,
  contrasteDeUnTema,
  normalizarColor,
  validarTono,
  type ColoresDeUnTono,
  type Tono,
} from './tonos'

// La ruta va por una variable: Vite reescribe un `new URL('…', import.meta.url)` literal.
const RUTA_DEL_CORPUS = '../../../../../supabase/tests/corpus-de-contraste.json'
const corpus = JSON.parse(readFileSync(new URL(RUTA_DEL_CORPUS, import.meta.url), 'utf8')) as {
  pares: { a: string; b: string; razon: number; aa: boolean }[]
}

const tono = (id: string, nombre: string, colores = coloresDeUnTonoNuevo()): Tono => ({
  id,
  clave: nombre.toLowerCase(),
  nombre,
  actualizadoEn: '2026-11-08T10:00:00.123456+00:00',
  colores,
})

const conClaro = (tinta: string, fondo: string): ColoresDeUnTono => ({
  ...coloresDeUnTonoNuevo(),
  claro: { fondo, borde: '#e9d27a', tinta },
})

const nuevo = (nombre: string, colores = coloresDeUnTonoNuevo(), tonos: Tono[] = []) =>
  validarTono({ nombre, colores, tonos, original: null })

describe('el AA de un tono', () => {
  it('T1 · decide como la base en los pares del corpus (el umbral es «mayor o igual a 4,5»)', () => {
    expect(corpus.pares.length).toBeGreaterThanOrEqual(300)
    for (const { a, b, aa } of corpus.pares) {
      const r = nuevo('Prueba', conClaro(a, b))
      // El corpus trae hex válidos; el AA es lo único que puede fallar.
      expect(r.ok, `${a} sobre ${b}`).toBe(aa)
      if (!r.ok) expect(Object.keys(r.motivos)).toEqual(['claro'])
    }
  })

  it('T1 · un par justo en 4,5 pasa y uno apenas menos no', () => {
    // #767676 sobre blanco da 4,54; #777777, 4,47 (corpus).
    expect(contrasteDeUnTema('claro', { tinta: '#767676', fondo: '#ffffff' })?.cumple).toBe(true)
    expect(contrasteDeUnTema('claro', { tinta: '#777777', fondo: '#ffffff' })?.cumple).toBe(false)
  })

  it('T1 · el texto trunca a un decimal con coma, como la base', () => {
    // 4,478… se dice «4,4» y no «4,5».
    const m = contrasteDeUnTema('claro', { tinta: '#777777', fondo: '#ffffff' })
    expect(m?.texto).toBe('En el tema claro la tinta sobre el fondo da 4,4:1 y hace falta 4,5:1.')
    expect(contrasteDeUnTema('oscuro', { tinta: '#000000', fondo: '#ffffff' })?.texto).toBe(
      'Contraste 21,0:1: cumple AA.',
    )
  })

  it('T1 · con un hex a medio escribir no hay contraste ni motivo de AA', () => {
    expect(contrasteDeUnTema('claro', { tinta: '#1b21', fondo: '#ffffff' })).toBeNull()
    const r = nuevo('Prueba', conClaro('#1b21', '#ffffff'))
    expect(r).toEqual({
      ok: false,
      motivos: {
        'claro.tinta':
          'El color «claro.tinta» tiene que escribirse como #rrggbb, por ejemplo #fff7d6.',
      },
    })
  })

  it('T1 · la paleta de partida pasa AA en los dos temas', () => {
    const c = coloresDeUnTonoNuevo()
    expect(contrasteDeUnTema('claro', c.claro)?.cumple).toBe(true)
    expect(contrasteDeUnTema('oscuro', c.oscuro)?.cumple).toBe(true)
  })
})

describe('las reglas de un tono', () => {
  it('T1 · el nombre: vacío, de más de 40, repetido (sin importar mayúsculas ni espacios)', () => {
    expect(nuevo('   ')).toEqual({ ok: false, motivos: { nombre: 'Escribe el nombre del tono.' } })
    expect(nuevo('x'.repeat(41))).toEqual({
      ok: false,
      motivos: { nombre: 'El nombre del tono admite hasta 40 caracteres.' },
    })
    expect(nuevo('x'.repeat(40)).ok).toBe(true)
    const otros = [tono('a', 'Verde azulado')]
    expect(nuevo('  verde   AZULADO ', coloresDeUnTonoNuevo(), otros)).toEqual({
      ok: false,
      motivos: { nombre: 'Ya hay un tono «verde AZULADO».' },
    })
  })

  it('T1 · editar no choca con sí mismo ni cuenta contra el tope', () => {
    const lleno = Array.from({ length: 24 }, (_, i) => tono(`id-${i}`, `Tono ${i}`))
    const [primero] = lleno
    expect(primero).toBeDefined()
    const editado = validarTono({
      nombre: 'tono 0',
      colores: coloresDeUnTonoNuevo(),
      tonos: lleno,
      original: primero ?? null,
    })
    expect(editado.ok).toBe(true)
    expect(nuevo('Otro', coloresDeUnTonoNuevo(), lleno)).toEqual({
      ok: false,
      motivos: { nombre: 'Ya hay 24 tonos, que es el máximo. Elimina uno que ningún grupo use.' },
    })
  })

  it('T1 · un color mal escrito dice el campo exacto (tres cifras, sin #, un nombre)', () => {
    const colores = coloresDeUnTonoNuevo()
    colores.oscuro.borde = '#abc'
    colores.claro.fondo = 'fff7d6'
    colores.claro.tinta = 'azul'
    const r = nuevo('Prueba', colores)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.motivos).sort()).toEqual(['claro.fondo', 'claro.tinta', 'oscuro.borde'])
    }
  })

  it('T1 · normaliza: recorta y pasa a minúsculas', () => {
    expect(normalizarColor('  #FFF7D6 ')).toBe('#fff7d6')
    expect(normalizarColor('#fff')).toBeNull()
    const r = nuevo('  Mi   tono ', conClaro('#1B2130', '#FFF7D6'))
    expect(r).toMatchObject({ ok: true, nombre: 'Mi tono' })
    if (r.ok) expect(r.colores.claro).toMatchObject({ tinta: '#1b2130', fondo: '#fff7d6' })
  })
})

describe('lo que se guarda de un tono', () => {
  const original = tono('a', 'Amarillo')
  const validar = (nombre: string, colores: ColoresDeUnTono) => {
    const r = validarTono({ nombre, colores, tonos: [original], original })
    if (!r.ok) throw new Error('debía validar')
    return r
  }

  it('T1 · manda sólo el nombre, sólo los colores o nada', () => {
    expect(cambiosDeUnTono(original, validar('Amarillo', coloresDeUnTonoNuevo()))).toEqual({})
    expect(cambiosDeUnTono(original, validar('Dorado', coloresDeUnTonoNuevo()))).toEqual({
      nombre: 'Dorado',
    })
    const otros = conClaro('#000000', '#ffffff')
    expect(cambiosDeUnTono(original, validar('Amarillo', otros))).toEqual({ colores: otros })
    expect(Object.keys(cambiosDeUnTono(original, validar('Dorado', otros))).sort()).toEqual([
      'colores',
      'nombre',
    ])
  })
})
