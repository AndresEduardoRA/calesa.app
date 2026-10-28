import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

import { e2eDelCambio, salidaDeGithub } from './e2e-dirigidos.mjs'

// Los e2e de un PR en CI: completo (un disparador del Nivel 2 o algo que mueve a todos), dirigidos a lo tocado, o ninguno.
const SPECS: Record<string, string> = {
  'e2e/leads-alta.spec.ts':
    "import { prepararAlta } from './soporte/pasos'\nawait page.goto('/leads')",
  'e2e/cotizar-hoja.spec.ts':
    "import { cotizar } from './soporte/cotizar'\nawait page.goto('/cotizaciones/nueva')",
  'e2e/empresa.spec.ts':
    "import { base } from './soporte/base'\nawait page.goto('/configuracion/empresa')",
  'e2e/perfil-avatar.spec.ts': "await page.goto('/perfil')\n// avatares-miniaturas",
  'e2e/apibara-clave.spec.ts': "import { simular } from './soporte/apibara'",
}
const SOPORTES: Record<string, string> = {
  'e2e/soporte/base.ts': 'export const base = 1',
  'e2e/soporte/pasos.ts': "import { base } from './base'",
  'e2e/soporte/cotizar.ts': "import { x } from './esperas.ts'",
  'e2e/soporte/esperas.ts': 'export const x = 1',
  'e2e/soporte/apibara.ts': "readFileSync('e2e/fixtures/apibara/lote.json')",
}
const OTROS: Record<string, string> = {
  'supabase/migrations/20261101000000_x.sql':
    'create or replace function public.f() returns int language sql as $$ select 1 $$;',
  'supabase/migrations/20261101000001_tabla.sql': 'create table public.t (id int);',
}
const leer = (a: string) => SPECS[a] ?? SOPORTES[a] ?? OTROS[a] ?? null
const elegir = (archivos: string[]) =>
  e2eDelCambio(archivos, Object.keys(SPECS), leer, Object.keys(SOPORTES))

describe('e2e-dirigidos › completo', () => {
  it.each([
    ['src/shared/lib/conteo.ts', 'Nivel 2: shared'],
    ['src/proxy.ts', 'Nivel 2: proxy'],
    ['supabase/migrations/20261101000001_tabla.sql', 'Nivel 2: estructura'],
    ['playwright.config.ts', 'mueve a todos'],
    ['pnpm-lock.yaml', 'mueve a todos'],
    ['supabase/migrations/20261101000000_x.sql', 'mueve a todos'],
    ['supabase/seed.sql', 'mueve a todos'],
  ])('%s', (archivo, motivo) => {
    expect(elegir([archivo])).toMatchObject({
      modo: 'completo',
      motivo: expect.stringContaining(motivo),
    })
  })

  it('un archivo de src/ que no lleva a ningún spec pide el completo (mejor sobrar que faltar)', () => {
    expect(elegir(['src/modules/notificaciones/entities/aviso.ts'])).toMatchObject({
      modo: 'completo',
      motivo: expect.stringContaining('notificaciones'),
    })
    expect(elegir(['src/app/(app)/page.tsx']).modo).toBe('completo')
  })
})

describe('e2e-dirigidos › dirigidos', () => {
  it('el módulo: por el nombre del spec o por su ruta', () => {
    expect(elegir(['src/modules/leads/features/alta/components/formulario.tsx'])).toMatchObject({
      modo: 'dirigidos',
      specs: ['e2e/leads-alta.spec.ts'],
      interfaz: true,
    })
    expect(elegir(['src/modules/cotizaciones/infra/lecturas.ts']).specs).toEqual([
      'e2e/cotizar-hoja.spec.ts',
    ])
  })

  it('la ruta de la app y la función edge', () => {
    expect(elegir(['src/app/(app)/perfil/page.tsx']).specs).toEqual(['e2e/perfil-avatar.spec.ts'])
    expect(elegir(['supabase/functions/avatares-miniaturas/index.ts']).specs).toEqual([
      'e2e/perfil-avatar.spec.ts',
    ])
  })

  it('un spec que cambió corre él', () => {
    expect(elegir(['e2e/empresa.spec.ts'])).toMatchObject({
      modo: 'dirigidos',
      specs: ['e2e/empresa.spec.ts'],
    })
  })

  it('un ayudante de e2e/soporte: los specs que lo importan, también a través de otro ayudante', () => {
    expect(elegir(['e2e/soporte/base.ts']).specs).toEqual([
      'e2e/empresa.spec.ts',
      'e2e/leads-alta.spec.ts',
    ])
    expect(elegir(['e2e/soporte/esperas.ts']).specs).toEqual(['e2e/cotizar-hoja.spec.ts'])
  })

  it('una fixture: los specs cuyo ayudante la lee', () => {
    expect(elegir(['e2e/fixtures/apibara/lote.json']).specs).toEqual(['e2e/apibara-clave.spec.ts'])
  })

  it('sin interfaz, sólo escritorio; con interfaz, los dos proyectos', () => {
    expect(salidaDeGithub(elegir(['src/modules/leads/infra/lecturas.ts']))).toContain(
      'e2e_proyectos=escritorio',
    )
    expect(salidaDeGithub(elegir(['src/modules/leads/features/alta/components/x.tsx']))).toContain(
      'e2e_proyectos=ambos',
    )
  })
})

describe('e2e-dirigidos › ninguno y la salida de GitHub', () => {
  it('docs, scripts y pruebas de Vitest no piden e2e', () => {
    expect(
      elegir(['docs/PLAN.md', 'scripts/mapa.sh', 'src/modules/leads/entities/x.test.ts']).modo,
    ).toBe('ninguno')
  })

  it('completo: 4 bloques en escritorio; dirigidos: 1 bloque con la lista', () => {
    expect(salidaDeGithub(elegir(['src/proxy.ts'])).split('\n')).toEqual([
      'e2e_modo=completo',
      'e2e_specs=',
      'e2e_bloques=[1,2,3,4]',
      'e2e_de=4',
      'e2e_proyectos=escritorio',
    ])
    expect(salidaDeGithub(elegir(['e2e/empresa.spec.ts'])).split('\n')).toEqual([
      'e2e_modo=dirigidos',
      'e2e_specs=e2e/empresa.spec.ts',
      'e2e_bloques=[1]',
      'e2e_de=1',
      'e2e_proyectos=escritorio',
    ])
  })

  it('el CLI sobre el repo real: un rango vacío no pide e2e', () => {
    const salida = execFileSync(
      'node',
      ['scripts/e2e-dirigidos.mjs', '--rango', 'HEAD...HEAD', '--github'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
    expect(salida).toContain('e2e_modo=ninguno')
  })
})
