import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REM_PARA_EL_PANEL_AL_COSTADO } from './use-panel-al-costado'

describe('el corte del panel de filtros', () => {
  it('es el mismo número en la constante y en las clases del CSS (Tailwind sólo lee clases literales)', () => {
    const fuente = readFileSync(
      join(process.cwd(), 'src/shared/ui/filtros/filter-shell.tsx'),
      'utf8',
    )
    const clases = [...fuente.matchAll(/@min-\[(\d+(?:\.\d+)?)rem\]:/g)].map((m) => Number(m[1]))
    // La grilla del cuerpo y el `block` del panel (y lo que digan los comentarios).
    expect(clases.length).toBeGreaterThanOrEqual(2)
    expect(new Set(clases)).toEqual(new Set([REM_PARA_EL_PANEL_AL_COSTADO]))
  })
})
