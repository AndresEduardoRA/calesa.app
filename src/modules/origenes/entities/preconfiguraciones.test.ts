import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  camposPreconfigurados,
  reglasPreconfiguradas,
  resumenDePreconfiguracion,
} from './preconfiguraciones'

// El espejo se compara con el SQL que de verdad crea los campos: si alguien cambia el trigger y
// no esto, la pantalla de alta le promete a la persona lo que no va a nacer.
const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261011000300_triggers.sql'),
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

function filasDe(bloque: string, conApibara: boolean): FilaSql[] {
  const patron = conApibara
    ? /\(new\.id, '([a-z_0-9]+)', '([^']+)', '([a-z_]+)', (?:true|false), '([^']+)', (\d+), (true|false), (true|false), (true|false), '([a-z_]+)', true\)/g
    : /\(new\.id, '([a-z_0-9]+)', '([^']+)', '([a-z_]+)', (?:true|false), '([^']+)', (\d+), (true|false), (true|false), (true|false), true\)/g
  return [...bloque.matchAll(patron)].map((m) => ({
    clave: m[1] ?? '',
    etiqueta: m[2] ?? '',
    tipo: m[3] ?? '',
    grupo: m[4] ?? '',
    orden: Number(m[5]),
    enTarjeta: m[6] === 'true',
    filtrable: m[7] === 'true',
    publicoWeb: m[8] === 'true',
    claveApibara: conApibara ? m[9] : undefined,
  }))
}

function bloques() {
  const inicio = SQL.indexOf('create or replace function public.origen_preconfigurar_campos')
  const fin = SQL.indexOf('create trigger trg_origen_preconfigurar_campos')
  const funcion = SQL.slice(inicio, fin)
  const separador = funcion.indexOf('  else\n')
  return { subasta: funcion.slice(0, separador), manual: funcion.slice(separador) }
}

describe('preconfiguraciones', () => {
  it('los campos de subasta son los que crea el trigger', () => {
    const delSql = filasDe(bloques().subasta, true)
    expect(delSql).toHaveLength(17)
    expect(
      camposPreconfigurados('subasta').map((campo) => ({
        ...campo,
        claveApibara: campo.claveApibara,
      })),
    ).toEqual(delSql)
  })

  it('los campos manuales son los que crea el trigger', () => {
    const delSql = filasDe(bloques().manual, false)
    expect(delSql).toHaveLength(8)
    expect(
      camposPreconfigurados('manual').map((campo) => ({ ...campo, claveApibara: undefined })),
    ).toEqual(delSql)
  })

  it('las reglas del flujo son las que crea origen_crear_flujo', () => {
    const inicio = SQL.indexOf('create or replace function public.origen_crear_flujo')
    const fin = SQL.indexOf('create trigger trg_origen_crear_flujo')
    const funcion = SQL.slice(inicio, fin)
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
    expect(resumenDePreconfiguracion('subasta')).toContain('17 campos')
    expect(resumenDePreconfiguracion('subasta')).toContain('apibara')
  })
})
