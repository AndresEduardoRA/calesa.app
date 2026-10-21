import { describe, expect, it } from 'vitest'
import { contextoDeAltaDesde, origenInicial } from './contexto-de-alta'

const ORIGEN_FB = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ORIGEN_WEB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const ORIGEN_APAGADO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const TIPO_PRO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0'
const TIPO_WA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const ORIGENES = [
  { id: ORIGEN_FB, nombre: 'Facebook' },
  { id: ORIGEN_WEB, nombre: 'Web' },
]

describe('origenInicial', () => {
  const base = { origenes: ORIGENES, ultimoOrigenId: null, origenPorDefectoId: null }

  it('prefiere el último origen de la persona, mientras se ofrezca', () => {
    expect(
      origenInicial({ ...base, ultimoOrigenId: ORIGEN_WEB, origenPorDefectoId: ORIGEN_FB }),
    ).toBe(ORIGEN_WEB)
  })

  it('sin último origen, el por defecto de la empresa', () => {
    expect(origenInicial({ ...base, origenPorDefectoId: ORIGEN_WEB })).toBe(ORIGEN_WEB)
  })

  it('un último origen que ya no se ofrece (se apagó) cede al por defecto', () => {
    expect(
      origenInicial({ ...base, ultimoOrigenId: ORIGEN_APAGADO, origenPorDefectoId: ORIGEN_WEB }),
    ).toBe(ORIGEN_WEB)
  })

  it('sin ninguno de los dos, el primero activo; sin activos, nada', () => {
    expect(origenInicial(base)).toBe(ORIGEN_FB)
    expect(origenInicial({ ...base, origenes: [] })).toBeNull()
  })

  it('tampoco ofrece un por defecto que no está entre los activos', () => {
    expect(origenInicial({ ...base, origenPorDefectoId: ORIGEN_APAGADO })).toBe(ORIGEN_FB)
  })
})

describe('contextoDeAltaDesde', () => {
  it('lee lo que devuelve lead_alta_contexto()', () => {
    const contexto = contextoDeAltaDesde({
      telefono_cc: '+591',
      origenes: [{ id: ORIGEN_WEB, nombre: 'Web' }],
      tipos: [{ id: TIPO_PRO, nombre: 'Prospecto', clase: 'prospecto' }],
      tipo_por_defecto_id: TIPO_PRO,
      tipos_seguimiento: [{ id: TIPO_WA, nombre: 'WhatsApp' }],
      ultimo_origen_id: ORIGEN_WEB,
      origen_por_defecto_id: null,
      topes: { origenes: 100, tipos: 100, tipos_seguimiento: 100 },
      empresa: { ciudad: null, pais: 'Bolivia' },
    })
    expect(contexto).toMatchObject({
      telefonoCc: '+591',
      ultimoOrigenId: ORIGEN_WEB,
      origenPorDefectoId: null,
      topes: { origenes: 100, tipos: 100, tiposDeSeguimiento: 100 },
      tipos: [{ id: TIPO_PRO, nombre: 'Prospecto', clase: 'prospecto' }],
      tipoPorDefectoId: TIPO_PRO,
      empresa: { ciudad: null, pais: 'Bolivia' },
    })
    expect(contexto.tiposDeSeguimiento[0]?.nombre).toBe('WhatsApp')
  })

  it('lo que no calza es un error', () => {
    expect(() => contextoDeAltaDesde({})).toThrow()
  })
})
