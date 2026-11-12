import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BORRADOR_NUEVO_DE_VALOR,
  CATALOGOS_DE_REPUESTOS,
  cambiosDeValor,
  esClaveDeCatalogo,
  ordenarValores,
  ordenSiguiente,
  validarValor,
  valoresDesde,
  type ValorDeCatalogo,
} from './catalogo'

// La ruta va por variable: Vite reescribe un literal en `new URL`/`readFileSync` (memoria «Vite reescribe new URL literal»).
const MIGRACIONES = join(process.cwd(), 'supabase', 'migrations')
const CHECK = 'repuestos_catalogos_catalogo_check'

/** Las claves del `check` según la última migración que lo define. */
function clavesDelCheck(): string[] {
  const archivos = readdirSync(MIGRACIONES)
    .filter((a) => a.endsWith('.sql'))
    .sort()
  let claves: string[] = []
  for (const a of archivos) {
    const texto = readFileSync(join(MIGRACIONES, a), 'utf8')
    for (const linea of texto.split('\n')) {
      if (!linea.includes(CHECK) || !/check/i.test(linea.replace(CHECK, ''))) continue
      const encontradas = [...linea.matchAll(/'([a-z_]+)'/g)].map((m) => m[1] ?? '')
      if (encontradas.length > 0) claves = encontradas
    }
  }
  return claves
}

const ID = '00000000-0000-4000-8000-000000000001'
const valor = (extra: Partial<ValorDeCatalogo> = {}): ValorDeCatalogo => ({
  id: ID,
  catalogo: 'condicion',
  nombre: 'Nuevo',
  activo: true,
  orden: 0,
  ...extra,
})

describe('catálogos de repuestos', () => {
  it('K1 · las claves, en orden, son las del check de la base', () => {
    const delCheck = clavesDelCheck()
    expect(delCheck.length).toBeGreaterThan(0)
    expect(CATALOGOS_DE_REPUESTOS.map((c) => c.clave)).toEqual(delCheck)
    expect(esClaveDeCatalogo('pais_origen')).toBe(true)
    expect(esClaveDeCatalogo('color')).toBe(false)
  })

  it('K2 · valoresDesde rechaza una clave fuera de las cuatro y un id que no es guid', () => {
    expect(valoresDesde([valor()])).toEqual([valor()])
    expect(valoresDesde([{ ...valor(), catalogo: 'color' }])).toBeNull()
    expect(valoresDesde([{ ...valor(), id: '1' }])).toBeNull()
    expect(valoresDesde('x')).toBeNull()
  })

  it('K3 · validarValor dice qué falta, con los topes de la base', () => {
    const b = { ...BORRADOR_NUEVO_DE_VALOR, nombre: ' Usado ' }
    expect(validarValor(b)).toEqual({
      ok: true,
      datos: { nombre: 'Usado', activo: true, orden: 0 },
    })
    expect(validarValor({ ...b, nombre: '  ' })).toEqual({
      ok: false,
      errores: { nombre: 'Escribe el nombre.' },
    })
    expect(validarValor({ ...b, nombre: 'a'.repeat(61) })).toEqual({
      ok: false,
      errores: { nombre: 'El nombre admite hasta 60 letras.' },
    })
    for (const orden of ['-1', '32768', '3.5', '']) {
      expect(validarValor({ ...b, orden })).toEqual({
        ok: false,
        errores: { orden: 'El orden es un número entero de 0 a 32767.' },
      })
    }
    expect(validarValor({ ...b, orden: '32767' })).toMatchObject({ ok: true })
  })

  it('K3 · ordenSiguiente va al final, con tope', () => {
    expect(ordenSiguiente([])).toBe(0)
    expect(ordenSiguiente([valor({ orden: 2 }), valor({ orden: 7 })])).toBe(8)
    expect(ordenSiguiente([valor({ orden: 32767 })])).toBe(32767)
  })

  it('cambiosDeValor y ordenarValores', () => {
    const v = valor({ nombre: 'Usado', orden: 1 })
    expect(cambiosDeValor(v, { nombre: 'Usado', activo: true, orden: 1 })).toBeNull()
    expect(cambiosDeValor(v, { nombre: 'Usada', activo: false, orden: 1 })).toEqual({
      nombre: 'Usada',
      activo: false,
    })
    const a = valor({ nombre: 'Zeta', orden: 0 })
    const b = valor({ nombre: 'Ála', orden: 0 })
    const c = valor({ nombre: 'Beta', orden: -1 })
    expect(ordenarValores([a, b, c]).map((x) => x.nombre)).toEqual(['Beta', 'Ála', 'Zeta'])
  })
})
