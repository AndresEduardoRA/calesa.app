// La guía de despliegue (`docs/DESPLIEGUE.md`) nombra lo que el repo pide, derivado del mismo inventario que `pnpm despliegue:en-seco`:
// una función edge, un secreto propio de una función o un nombre de Vault que crea la persona sin línea en la guía hacen caer `pnpm test`.
// Así la guía no se queda vieja (9.13-3, D30). Las funciones y Vault se buscan entre comillas de código: un «push» suelto no cuenta.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { esquemaDeLasFunciones } from '../../src/shared/config/esquemas'
import { esperadoDelRepo } from './extraer'
import { SECRETOS_DE_LA_PLATAFORMA } from './inventario'
import { archivosDelRepo } from './repo'

const RAIZ = process.cwd()
const GUIA = readFileSync(join(RAIZ, 'docs/DESPLIEGUE.md'), 'utf8')
const e = esperadoDelRepo(archivosDelRepo(RAIZ), Object.keys(esquemaDeLasFunciones.shape))

const faltan = (nombres: string[]) => nombres.filter((n) => !GUIA.includes(n))
const faltanEnCodigo = (nombres: string[]) => nombres.filter((n) => !GUIA.includes(`\`${n}\``))
const sinRepetir = (nombres: string[]) => [...new Set(nombres)].sort()

describe('la guía de despliegue nombra lo que el repo pide', () => {
  it('cada función edge', () => {
    const funciones = e.funciones.map((f) => f.nombre)
    expect(funciones.length).toBeGreaterThan(0)
    expect(faltanEnCodigo(funciones)).toEqual([])
  })

  it('cada secreto propio de una función (los de la plataforma los pone Supabase)', () => {
    const plataforma = new Set(SECRETOS_DE_LA_PLATAFORMA)
    const propios = sinRepetir(
      e.funciones.flatMap((f) => f.secretos).filter((s) => !plataforma.has(s)),
    )
    expect(propios.length).toBeGreaterThan(0)
    expect(faltanEnCodigo(propios)).toEqual([])
  })

  it('cada nombre de Vault que crea la persona y cada prefijo que crea la app', () => {
    const creados = new Set(e.vault.creadosEnMigraciones)
    const deLaPersona = sinRepetir(
      e.vault.leidos.map((l) => l.nombre).filter((n) => !creados.has(n)),
    )
    const prefijos = sinRepetir(e.vault.prefijos.map((p) => `${p.nombre}*`))
    expect(deLaPersona.length + prefijos.length).toBeGreaterThan(0)
    expect(faltanEnCodigo([...deLaPersona, ...prefijos])).toEqual([])
  })

  it('lo fijo: el ensayo, el --dry-run, env:check, demo.yml, Integraciones y los abiertos de la persona', () => {
    expect(
      faltan([
        'pnpm despliegue:en-seco',
        '--dry-run',
        'env:check produccion',
        'SUPABASE_PROJECT_REF',
        'demo.yml',
        'DEMO_PROJECT_REF',
        'web_revalidar_correr',
        'Integraciones',
        '**9-12**',
        '**9-6**',
        '**9-11**',
        '**5a-4b**',
      ]),
    ).toEqual([])
  })
})
