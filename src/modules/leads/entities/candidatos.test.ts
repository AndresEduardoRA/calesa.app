import { describe, expect, it } from 'vitest'
import {
  candidatosDesde,
  condicionesDeLaPagina,
  filtrosDeCandidatos,
  usaCandidatos,
  ventanasHasta,
} from './candidatos'
import type { CondicionDeLead } from './filtros'

const ID_A = '5a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const ID_B = '7c2e9d44-2b7a-4c53-8f10-3a9d6b5e1f22'

const busqueda = (extra: Partial<Extract<CondicionDeLead, { tipo: 'busqueda' }>> = {}) =>
  ({
    tipo: 'busqueda',
    texto: 'Gómez',
    numero: null,
    soloNumero: false,
    idsDelNumero: [],
    ...extra,
  }) satisfies CondicionDeLead

const publico: CondicionDeLead = {
  tipo: 'atributos_contienen',
  alternativas: [{ ciudad: 'lp' }, { ciudad: 'scz' }],
  columna: 'atributos_publicos',
}
const privado: CondicionDeLead = {
  tipo: 'atributos_contienen',
  alternativas: [{ direccion: 'x' }],
  columna: 'atributos',
}

describe('usaCandidatos', () => {
  it('una búsqueda por nombre o un campo público los piden', () => {
    expect(usaCandidatos([busqueda()])).toBe(true)
    expect(usaCandidatos([publico])).toBe(true)
    expect(usaCandidatos([{ tipo: 'en_cartera', desdeLaCartera: true }, busqueda()])).toBe(true)
  })

  it('«#124» es sólo el número y un campo privado va por lo recortado: no los piden', () => {
    expect(usaCandidatos([busqueda({ soloNumero: true, numero: 124, idsDelNumero: [ID_A] })])).toBe(
      false,
    )
    expect(usaCandidatos([privado])).toBe(false)
    expect(usaCandidatos([])).toBe(false)
    expect(usaCandidatos([{ tipo: 'tachado', valor: false }])).toBe(false)
  })
})

describe('filtrosDeCandidatos', () => {
  it('lleva lo que acota: el texto, «míos», el tipo, el origen y los campos públicos', () => {
    expect(
      filtrosDeCandidatos(
        [
          busqueda({ texto: 'a%_b' }),
          { tipo: 'en_cartera', desdeLaCartera: false },
          { tipo: 'columna_en', columna: 'tipo_lead_id', valores: [ID_A] },
          { tipo: 'columna_en', columna: 'origen_lead_id', valores: [ID_B] },
          publico,
        ],
        null,
        'siguiente',
      ),
    ).toEqual({
      sentido: 'siguiente',
      texto: 'a%_b',
      mios: true,
      tipos: [ID_A],
      origenes: [ID_B],
      atributos: [[{ ciudad: 'lp' }, { ciudad: 'scz' }]],
    })
  })

  it('no lleva lo que la página decide: un privado, una marca, un rango', () => {
    const filtros = filtrosDeCandidatos(
      [
        busqueda(),
        privado,
        { tipo: 'tachado', valor: false },
        { tipo: 'favorito', valor: true },
        { tipo: 'etiquetas', ids: [ID_A] },
        { tipo: 'atributo_texto', clave: 'ciudad', texto: 'x', columna: 'atributos_publicos' },
      ],
      null,
      'siguiente',
    )
    expect(Object.keys(filtros).sort()).toEqual(['sentido', 'texto'])
  })

  it('el lead con el número buscado cuenta aunque su nombre no coincida', () => {
    expect(
      filtrosDeCandidatos(
        [busqueda({ texto: '124', numero: 124, idsDelNumero: [ID_A] })],
        null,
        'siguiente',
      ),
    ).toEqual({ sentido: 'siguiente', texto: '124', extra: [ID_A] })
  })

  it('el cursor y el sentido son los de la ventana', () => {
    expect(
      filtrosDeCandidatos(
        [busqueda()],
        { creadoEn: '2026-10-18T10:00:00.123456+00:00', id: ID_A, sentido: 'anterior' },
        'anterior',
      ),
    ).toEqual({
      sentido: 'anterior',
      texto: 'Gómez',
      cursor: { creado_en: '2026-10-18T10:00:00.123456+00:00', id: ID_A },
    })
  })

  it('dos campos públicos son dos grupos: se cumplen los dos', () => {
    const otro: CondicionDeLead = {
      tipo: 'atributos_contienen',
      alternativas: [{ origen: 'web' }],
      columna: 'atributos_publicos',
    }
    expect(filtrosDeCandidatos([publico, otro], null, 'siguiente').atributos).toEqual([
      [{ ciudad: 'lp' }, { ciudad: 'scz' }],
      [{ origen: 'web' }],
    ])
  })
})

describe('condicionesDeLaPagina', () => {
  it('quita el nombre y el campo público (ya cumplidos) y deja todo lo demás', () => {
    const resto: CondicionDeLead[] = [
      { tipo: 'en_cartera', desdeLaCartera: true },
      { tipo: 'columna_en', columna: 'tipo_lead_id', valores: [ID_A] },
      privado,
      { tipo: 'tachado', valor: false },
      { tipo: 'favorito', valor: true },
      { tipo: 'etiquetas', ids: [ID_A] },
    ]
    expect(condicionesDeLaPagina([busqueda(), publico, ...resto])).toEqual(resto)
  })

  it('«#124» se queda: es lo único que filtra', () => {
    const soloNumero = busqueda({ soloNumero: true, numero: 124, idsDelNumero: [ID_A] })
    expect(condicionesDeLaPagina([soloNumero])).toEqual([soloNumero])
  })
})

describe('candidatosDesde', () => {
  it('lee la forma que devuelve la base', () => {
    expect(
      candidatosDesde({ ids: [ID_A], completa: false, hasta: { creado_en: 'x', id: ID_A } }),
    ).toEqual({
      ids: [ID_A],
      completa: false,
      hasta: { creado_en: 'x', id: ID_A },
    })
    expect(candidatosDesde({ ids: [], completa: true, hasta: null })).toEqual({
      ids: [],
      completa: true,
      hasta: null,
    })
  })

  it('una forma rota es nula: nunca «no hay candidatos»', () => {
    expect(candidatosDesde(null)).toBeNull()
    expect(candidatosDesde({ ids: ['no-es-un-id'], completa: true, hasta: null })).toBeNull()
    expect(candidatosDesde({ ids: [], completa: 'si', hasta: null })).toBeNull()
    expect(candidatosDesde({ ids: [] })).toBeNull()
  })
})

describe('ventanasHasta', () => {
  it('alcanza para llenar una página de cualquier tamaño y nunca es ilimitada', () => {
    expect(ventanasHasta(10)).toBe(3)
    expect(ventanasHasta(100)).toBe(4)
    expect(ventanasHasta(500)).toBe(8)
  })
})
