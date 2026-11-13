import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { jobsDe } from './workflows'

// Lo que el flujo de un PR necesita del CI (docs/FLUJO.md): el Nivel 1 valida el título (el commit que queda en main con el squash) y
// que las migraciones del PR vayan después de las de main, y `listo` resume a todos los jobs en el único check que main exige: con él
// en verde GitHub integra el PR solo. Si cae: el auto-merge dejaría de ser de fiar.
const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
const job = (nombre: string) => jobsDe(ci).find((j) => j.nombre === nombre)?.bloque ?? ''

describe('ci.yml › lo que pide el flujo de un PR', () => {
  it('el Nivel 1 de un PR revisa su título (el commit que queda en main) y que sus migraciones vayan después de las de main', () => {
    const nivel1 = job('nivel-1')
    expect(nivel1).toContain('printf \'%s\\n\' "$TITULO" | pnpm exec commitlint')
    expect(nivel1).toContain('TITULO: ${{ github.event.pull_request.title }}')
    expect(nivel1).toContain(
      'MIGRACIONES_BASE=FETCH_HEAD pnpm exec vitest run scripts/guardas/orden-de-migraciones.test.ts',
    )
    expect(nivel1.match(/if: github\.event_name == 'pull_request'/g)).toHaveLength(2)
  })

  it('`listo` espera a todos los demás, corre siempre y cae si alguno cayó o se canceló', () => {
    const listo = job('listo')
    const otros = jobsDe(ci)
      .map((j) => j.nombre)
      .filter((n) => n !== 'listo' && n !== 'carreras')
    expect(listo).toContain(`needs: [${otros.join(', ')}]`)
    expect(listo).toMatch(/^ {4}if: always\(\)$/m)
    expect(listo).toContain("RESULTADOS: ${{ join(needs.*.result, ' ') }}")
    expect(listo).toContain('*" failure "* | *" cancelled "*)')
  })
})
