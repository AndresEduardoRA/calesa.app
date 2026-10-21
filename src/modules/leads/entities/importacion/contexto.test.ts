import { describe, expect, it } from 'vitest'
import type { ContextoDeAlta } from '../alta'
import type { CatalogosDeLead } from '../catalogos'
import { contextoDeImportacionDesde } from './contexto'

const O1 = '11111111-1111-4111-8111-111111111111'
const O2 = '22222222-2222-4222-8222-222222222222'
const T1 = '33333333-3333-4333-8333-333333333333'

const CONTEXTO: ContextoDeAlta = {
  telefonoCc: '591',
  origenes: [
    { id: O1, nombre: 'Facebook' },
    { id: O2, nombre: 'Web' },
  ],
  tipos: [{ id: T1, nombre: 'Prospecto', clase: 'prospecto' }],
  tipoPorDefectoId: T1,
  tiposDeSeguimiento: [],
  ultimoOrigenId: null,
  origenPorDefectoId: null,
  topes: { origenes: 100, tipos: 100, tiposDeSeguimiento: 100 },
  empresa: { ciudad: null, pais: null },
}

const CATALOGOS: CatalogosDeLead = {
  origenes: [
    { id: O1, clave: 'facebook', nombre: 'Facebook', activo: true },
    { id: O2, clave: 'web', nombre: 'Web', activo: true },
  ],
  tipos: [{ id: T1, clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto', activo: true }],
}

describe('contextoDeImportacionDesde', () => {
  it('suma la clave a cada origen y tipo que el alta ofrece, en su orden', () => {
    const c = contextoDeImportacionDesde(CONTEXTO, CATALOGOS)
    expect(c.origenes).toEqual([
      { id: O1, clave: 'facebook', nombre: 'Facebook' },
      { id: O2, clave: 'web', nombre: 'Web' },
    ])
    expect(c.tipos).toEqual([
      { id: T1, clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto' },
    ])
    expect(c.tipoPorDefectoId).toBe(T1)
  })

  it('no inventa la clave de uno que el catálogo ya no tiene', () => {
    const c = contextoDeImportacionDesde(CONTEXTO, {
      ...CATALOGOS,
      origenes: [CATALOGOS.origenes[0]!],
    })
    expect(c.origenes.map((o) => o.id)).toEqual([O1])
  })
})
