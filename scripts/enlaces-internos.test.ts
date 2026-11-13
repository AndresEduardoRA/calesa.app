import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { citasDe, enlacesDe, problemasDeEnlaces, titulosDe } from './enlaces-internos.mjs'

describe('enlaces-internos', () => {
  it('lee la ruta y las secciones citadas, también encadenadas y tras un cierre de código', () => {
    expect(
      citasDe('ver `docs/FLUJO.md` › «La base» › «Aplastar» y docs/UX.md, «Cotizar».'),
    ).toEqual([
      { linea: 1, ruta: 'docs/FLUJO.md', secciones: ['La base', 'Aplastar'] },
      { linea: 1, ruta: 'docs/UX.md', secciones: ['Cotizar'] },
    ])
    expect(
      citasDe('// la regla de `.claude/rules/e2e.md` › «Interfaz: cuándo»')[0]?.secciones,
    ).toEqual(['Interfaz: cuándo'])
    expect(citasDe('src/modules/leads/CLAUDE.md sin sección')[0]).toEqual({
      linea: 1,
      ruta: 'src/modules/leads/CLAUDE.md',
      secciones: [],
    })
  })

  it('los títulos son los encabezados y lo que va en negrita', () => {
    expect(titulosDe('# A\ntexto **Regla uno** y más\n### B (4.10-2)')).toEqual([
      'A',
      'Regla uno',
      'B (4.10-2)',
    ])
  })

  it('los enlaces Markdown relativos, sin http ni anclas solas', () => {
    expect(enlacesDe('[a](b.md#x) [c](https://x.y) [d](#solo) [e](../f.md)')).toEqual([
      { linea: 1, destino: 'b.md' },
      { linea: 1, destino: '../f.md' },
    ])
  })

  describe('sobre un repo de mentira', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'enlaces-'))
    afterAll(() => rmSync(raiz, { recursive: true, force: true }))
    const escribir = (ruta: string, texto: string) => {
      mkdirSync(dirname(join(raiz, ruta)), { recursive: true })
      writeFileSync(join(raiz, ruta), texto)
    }
    escribir('docs/COTIZADOR.md', '# Cotizador\n## El motor\n### Cómo se guarda\n')
    escribir(
      'src/a.ts',
      [
        '// docs/COTIZADOR.md › «El motor»',
        '// docs/COTIZADOR.md › «Cómo se guarda»',
        '// docs/COTIZADOR.md › «En la base»',
        '// docs/NO-EXISTE.md',
        '// docs/<X>.md y docs/x.md son ejemplos',
      ].join('\n'),
    )
    escribir('docs/LEEME.md', '[bien](COTIZADOR.md) [mal](FALTA.md)\n')

    it('vale un título del doc; falla la sección que no está, el doc que no existe y el enlace roto', () => {
      const problemas = problemasDeEnlaces(raiz).map((p) => `${p.archivo}:${String(p.linea)}`)
      expect(problemas).toEqual(['docs/LEEME.md:1', 'src/a.ts:3', 'src/a.ts:4'])
    })
  })
})
