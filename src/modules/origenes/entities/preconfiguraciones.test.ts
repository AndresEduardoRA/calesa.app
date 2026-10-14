import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  camposPreconfigurados,
  reglasPreconfiguradas,
  resumenDePreconfiguracion,
} from './preconfiguraciones'
import { CLAVES_RESERVADAS } from './campo'

// El espejo se compara con el SQL que de verdad crea los campos: si alguien cambia el trigger y
// no esto, la pantalla de alta le promete a la persona lo que no va a nacer.
const TRIGGERS = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261011000300_triggers.sql'),
  'utf8',
)
const APIBARA = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261014000200_apibara.sql'),
  'utf8',
)

type FilaSql = {
  clave: string
  etiqueta: string
  tipo: string
  grupo: string
  orden: number
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  claveApibara: string | undefined
}

// Las filas de `_apibara_catalogo()`: cada una es `('clave', 'Etiqueta', 'tipo', 'Grupo', orden, …)`.
function filasDelCatalogo(): FilaSql[] {
  const inicio = APIBARA.indexOf('create or replace function public._apibara_catalogo')
  const fin = APIBARA.indexOf('revoke all on function public._apibara_catalogo')
  const patron =
    /\('([a-z_0-9]+)', '([^']+)', '([a-z_]+)', '([^']+)', (\d+), (true|false), (true|false), (true|false), (null|'[a-z_.A-Z0-9]+'), (true|false)\)/g
  return [...APIBARA.slice(inicio, fin).matchAll(patron)].map((m) => ({
    clave: m[1] ?? '',
    etiqueta: m[2] ?? '',
    tipo: m[3] ?? '',
    grupo: m[4] ?? '',
    orden: Number(m[5]),
    enTarjeta: m[6] === 'true',
    filtrable: m[7] === 'true',
    publicoWeb: m[8] === 'true',
    claveApibara: m[9] === 'null' ? undefined : (m[9] ?? '').replaceAll("'", ''),
  }))
}

function filasManuales(): FilaSql[] {
  const inicio = TRIGGERS.indexOf('create or replace function public.origen_preconfigurar_campos')
  const fin = TRIGGERS.indexOf('create trigger trg_origen_preconfigurar_campos')
  const funcion = TRIGGERS.slice(inicio, fin)
  const manual = funcion.slice(funcion.indexOf('  else\n'))
  const patron =
    /\(new\.id, '([a-z_0-9]+)', '([^']+)', '([a-z_]+)', (?:true|false), '([^']+)', (\d+), (true|false), (true|false), (true|false), true\)/g
  return [...manual.matchAll(patron)].map((m) => ({
    clave: m[1] ?? '',
    etiqueta: m[2] ?? '',
    tipo: m[3] ?? '',
    grupo: m[4] ?? '',
    orden: Number(m[5]),
    enTarjeta: m[6] === 'true',
    filtrable: m[7] === 'true',
    publicoWeb: m[8] === 'true',
    claveApibara: undefined,
  }))
}

describe('preconfiguraciones', () => {
  it('los campos de subasta son los del catálogo de apibara', () => {
    const delSql = filasDelCatalogo()
    expect(delSql.length).toBeGreaterThan(100)
    expect(
      camposPreconfigurados('subasta').map((campo) => ({
        ...campo,
        claveApibara: campo.claveApibara,
      })),
    ).toEqual(delSql)
  })

  it('el catálogo no repite claves ni rutas', () => {
    const filas = filasDelCatalogo()
    const claves = filas.map((fila) => fila.clave)
    const rutas = filas.flatMap((fila) =>
      fila.claveApibara === undefined ? [] : [fila.claveApibara],
    )
    expect(new Set(claves).size).toBe(claves.length)
    expect(new Set(rutas).size).toBe(rutas.length)
    // Un campo propio no puede llamarse como una columna de `vehiculos`.
    expect(claves.filter((clave) => CLAVES_RESERVADAS.includes(clave))).toEqual([])
  })

  it('el trigger de preconfiguración arma la subasta desde el catálogo', () => {
    const inicio = APIBARA.indexOf('create or replace function public.origen_preconfigurar_campos')
    const funcion = APIBARA.slice(
      inicio,
      APIBARA.indexOf('revoke all on function public.origen_apibara_completar'),
    )
    expect(funcion).toContain('from public._apibara_catalogo() c')
  })

  it('los campos manuales son los que crea el trigger', () => {
    const delSql = filasManuales()
    expect(delSql).toHaveLength(8)
    expect(
      camposPreconfigurados('manual').map((campo) => ({ ...campo, claveApibara: undefined })),
    ).toEqual(delSql)
  })

  it('las reglas del flujo son las que crea origen_crear_flujo', () => {
    const inicio = TRIGGERS.indexOf('create or replace function public.origen_crear_flujo')
    const fin = TRIGGERS.indexOf('create trigger trg_origen_crear_flujo')
    const funcion = TRIGGERS.slice(inicio, fin)
    const comunes = [
      ...(funcion.match(/array\[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([a-z_]+)'/g),
    ].map((m) => m[1])
    expect(reglasPreconfiguradas('manual')).toEqual(comunes)
    expect(reglasPreconfiguradas('subasta')).toEqual([...comunes, 'aduana'])
    expect(funcion).toContain("new.tipo = 'subasta'")
    expect(funcion).toContain("'aduana'")
  })

  it('el resumen dice cuántos campos nacen y menciona apibara sólo en subasta', () => {
    expect(resumenDePreconfiguracion('manual')).toContain('8 campos')
    expect(resumenDePreconfiguracion('manual')).not.toContain('apibara')
    expect(resumenDePreconfiguracion('subasta')).toContain(
      `${camposPreconfigurados('subasta').length} campos`,
    )
    expect(resumenDePreconfiguracion('subasta')).toContain('apibara')
  })
})
