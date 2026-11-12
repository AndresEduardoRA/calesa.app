import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { TEXTO_CON_RUEDA, TEXTO_SIN_RUEDA, puedeEstarEnLaRueda, textoDeLaRueda } from './rueda'

const con: Permisos = [{ clave: 'web.cola.participar', origenId: null, alcance: 'todos' }]
// Gestionar la cola no es recibir turnos: son dos permisos.
const otroDeLaCola: Permisos = [{ clave: 'web.cola.gestionar', origenId: null, alcance: 'todos' }]

describe('puedeEstarEnLaRueda', () => {
  it('es el permiso web.cola.participar y ninguno más', () => {
    expect(puedeEstarEnLaRueda(con)).toBe(true)
    expect(puedeEstarEnLaRueda(otroDeLaCola)).toBe(false)
    expect(puedeEstarEnLaRueda([])).toBe(false)
  })

  it('vale con el permiso acotado a un origen o a lo propio: la rueda no distingue orígenes', () => {
    expect(
      puedeEstarEnLaRueda([{ clave: 'web.cola.participar', origenId: 'o1', alcance: 'propios' }]),
    ).toBe(true)
  })
})

describe('textoDeLaRueda', () => {
  it('dice cada caso con su frase', () => {
    expect(textoDeLaRueda(con)).toBe(TEXTO_CON_RUEDA)
    expect(textoDeLaRueda([])).toBe(TEXTO_SIN_RUEDA)
    expect(TEXTO_SIN_RUEDA).toBe('Tu rol no recibe turnos de la web.')
  })
})
