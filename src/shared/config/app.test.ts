import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COLOR_FONDO_CLARO,
  COLOR_FONDO_OSCURO,
  COLOR_SUPERFICIE_OSCURA,
  COLOR_TEMA,
  COLOR_TINTA,
} from './app'

const tokens = readFileSync(path.join(process.cwd(), 'design', 'tokens.css'), 'utf8')
const [claro = '', oscuro = ''] = tokens.split(/^\.dark \{/m)

function valorDe(bloque: string, variable: string): string | undefined {
  return new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6})`).exec(bloque)?.[1]
}

// El manifest y el cálculo de la marca no leen variables CSS: usan copias. Si alguien cambia un
// token y no la copia, este test lo dice.
describe('las copias de design/tokens.css', () => {
  it('coinciden con el tema claro', () => {
    expect(valorDe(claro, '--color-primario')).toBe(COLOR_TEMA)
    expect(valorDe(claro, '--color-paper')).toBe(COLOR_FONDO_CLARO)
    expect(valorDe(claro, '--color-ink')).toBe(COLOR_TINTA)
  })

  it('coinciden con el tema oscuro', () => {
    expect(valorDe(oscuro, '--color-paper')).toBe(COLOR_FONDO_OSCURO)
    expect(valorDe(oscuro, '--color-surface')).toBe(COLOR_SUPERFICIE_OSCURA)
  })
})
