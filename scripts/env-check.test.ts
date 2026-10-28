import { describe, expect, it } from 'vitest'

import { informe, revisar } from './env-check'

const archivos = (contenido: Record<string, string>) => (archivo: string) =>
  contenido[archivo] ?? null

describe('env:check', () => {
  it('un archivo que no existe se dice, sin fallar', () => {
    const r = revisar('demo', archivos({}))
    expect(r).toEqual({ entorno: 'demo', archivo: '.env.demo', existe: false, problemas: [] })
    expect(informe(r)).toBe('· demo: no hay .env.demo')
  })

  it('local revisa las públicas y las del servidor del mismo archivo', () => {
    const r = revisar(
      'local',
      archivos({ '.env.local': 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54621\n' }),
    )
    expect(r.problemas.map((p) => p.variable)).toEqual([
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SECRET_KEY',
    ])
  })

  it('el informe nombra variables y motivos, nunca un valor', () => {
    const r = revisar(
      'local',
      archivos({
        '.env.local': 'NEXT_PUBLIC_SUPABASE_URL=no-es-url\nSUPABASE_SECRET_KEY=muy-secreta\n',
      }),
    )
    const texto = informe(r)
    expect(texto).toContain('NEXT_PUBLIC_SUPABASE_URL: no es una URL')
    expect(texto).not.toContain('no-es-url')
    expect(texto).not.toContain('muy-secreta')
  })

  it('completo es completo', () => {
    const r = revisar(
      'local',
      archivos({
        '.env.local':
          'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54621\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=p\nSUPABASE_SECRET_KEY=s\n',
      }),
    )
    expect(informe(r)).toBe('✓ local (.env.local): completo')
  })

  it('un entorno que no existe es un error claro', () => {
    expect(() => revisar('produccion', archivos({}))).toThrow('entorno desconocido: produccion')
  })
})
