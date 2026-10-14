import { describe, expect, it } from 'vitest'
import type { CampoDeLead } from './campo'
import type { FilaDeLead } from './listado'
import {
  gruposDelRapido,
  hayPrivadosSinRecibir,
  vistaDelRapido,
  type LecturaDelRapido,
} from './rapido'

const campo = (clave: string, extra: Partial<CampoDeLead> = {}) =>
  ({
    clave,
    etiqueta: clave.toUpperCase(),
    activo: true,
    grupo: null,
    soloCartera: false,
    ...extra,
  }) as CampoDeLead

describe('gruposDelRapido', () => {
  const campos = [
    campo('ciudad', { grupo: 'Ubicación' }),
    campo('pais', { grupo: 'Ubicación' }),
    campo('edad'),
    campo('notas', { activo: false }),
  ]

  it('agrupa lo que tiene valor, en el orden del layout, y salta lo vacío y lo apagado', () => {
    const grupos = gruposDelRapido(campos, { ciudad: 'La Paz', pais: '', edad: 31, notas: 'x' })
    expect(grupos.map((g) => [g.nombre, g.datos.map((d) => d.campo.clave)])).toEqual([
      ['Ubicación', ['ciudad']],
      [null, ['edad']],
    ])
  })

  it('un grupo sin datos no aparece; sin nada, vacío', () => {
    expect(gruposDelRapido(campos, {})).toEqual([])
    expect(gruposDelRapido(campos, { pais: [] })).toEqual([])
  })

  it('un valor «falso» o cero sí se muestra', () => {
    const grupos = gruposDelRapido([campo('vip'), campo('hijos')], { vip: false, hijos: 0 })
    expect(grupos[0]?.datos.map((d) => d.campo.clave)).toEqual(['vip', 'hijos'])
  })
})

describe('hayPrivadosSinRecibir', () => {
  it('sólo cuando no es de su cartera y existe algún privado activo', () => {
    const campos = [campo('ci', { soloCartera: true })]
    expect(hayPrivadosSinRecibir(campos, false)).toBe(true)
    expect(hayPrivadosSinRecibir(campos, true)).toBe(false)
    expect(hayPrivadosSinRecibir([campo('ci', { soloCartera: true, activo: false })], false)).toBe(
      false,
    )
    expect(hayPrivadosSinRecibir([campo('ciudad')], false)).toBe(false)
  })
})

describe('vistaDelRapido', () => {
  const lead = (extra: Partial<FilaDeLead> = {}): FilaDeLead => ({
    id: 'a',
    numero: 1,
    nombre: 'Ana',
    telefono: '591•••••01',
    enCartera: true,
    tipo: 'prospecto',
    origenId: null,
    creadoEn: '2026-10-14T00:00:00Z',
    atributos: {},
    ...extra,
  })
  const base = { id: 'a', idValido: true, lectura: null, delListado: null, soloMios: false }
  const lectura = (l: Partial<LecturaDelRapido> & { estado: LecturaDelRapido['estado'] }) =>
    ({ id: 'a', ...l }) as LecturaDelRapido

  it('sin lead en la URL no hay nada que decir', () => {
    expect(vistaDelRapido({ ...base, id: null })).toEqual({ tipo: 'cargando' })
  })

  it('un id que no es un id, o que ya no existe o no se ve, es «no disponible»', () => {
    expect(vistaDelRapido({ ...base, idValido: false })).toEqual({ tipo: 'no_disponible' })
    expect(vistaDelRapido({ ...base, lectura: lectura({ estado: 'no_disponible' }) })).toEqual({
      tipo: 'no_disponible',
    })
  })

  it('mientras llega la lectura se dibuja con la fila de la página; sin ella, cargando', () => {
    expect(vistaDelRapido({ ...base, delListado: lead() })).toEqual({
      tipo: 'lead',
      lead: lead(),
      completo: false,
      fallo: false,
    })
    expect(vistaDelRapido(base)).toEqual({ tipo: 'cargando' })
  })

  it('con la lectura, el lead completo', () => {
    const vista = vistaDelRapido({ ...base, lectura: lectura({ estado: 'listo', lead: lead() }) })
    expect(vista).toEqual({ tipo: 'lead', lead: lead(), completo: true, fallo: false })
  })

  it('«propios» no muestra un lead que no es de su cartera aunque la base lo haya entregado', () => {
    const ajeno = lead({ enCartera: false })
    const entrada = { ...base, lectura: lectura({ estado: 'listo', lead: ajeno }) }
    expect(vistaDelRapido({ ...entrada, soloMios: true })).toEqual({ tipo: 'no_disponible' })
    expect(vistaDelRapido({ ...entrada, soloMios: false }).tipo).toBe('lead')
  })

  it('un fallo de lectura: con la fila, se sigue viendo y se avisa; sin ella, error', () => {
    const error = lectura({ estado: 'error' })
    expect(vistaDelRapido({ ...base, lectura: error, delListado: lead() })).toMatchObject({
      tipo: 'lead',
      completo: false,
      fallo: true,
    })
    expect(vistaDelRapido({ ...base, lectura: error })).toEqual({ tipo: 'error' })
  })
})
