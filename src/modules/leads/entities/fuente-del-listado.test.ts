import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import type { CampoDeLead } from './campo'
import { condicionesDeLeads, esquemaDeFiltrosDeLeads } from './filtros'
import { fuenteDelListado, leerMiosDeLaCartera, pideLaCartera } from './fuente-del-listado'

const busqueda = {
  tipo: 'busqueda',
  texto: 'perez',
  numero: null,
  soloNumero: false,
  idsDelNumero: [],
} as const

function campo(clave: string, soloCartera: boolean): CampoDeLead {
  return {
    id: `id-${clave}`,
    clave,
    etiqueta: clave.toUpperCase(),
    tipo: 'texto',
    opciones: [],
    requerido: false,
    valorDefecto: null,
    grupo: null,
    orden: 0,
    esSistema: false,
    activo: true,
    actualizadoEn: '2026-10-14T00:00:00Z',
    enTabla: false,
    filtrable: true,
    soloCartera,
    privacidadPendiente: null,
    valorDefectoEmpresa: null,
  }
}

describe('fuenteDelListado', () => {
  it('«míos» de quien tiene «propios» se lee de la cartera de quien mira', () => {
    expect(fuenteDelListado([{ tipo: 'en_cartera', desdeLaCartera: true }])).toBe(
      'leads_cartera_vista',
    )
    expect(fuenteDelListado([busqueda, { tipo: 'en_cartera', desdeLaCartera: true }])).toBe(
      'leads_cartera_vista',
    )
  })

  it('«míos» de quien tiene «todos», y todo lo que no es «míos», se lee de la vista de siempre', () => {
    expect(fuenteDelListado([{ tipo: 'en_cartera', desdeLaCartera: false }])).toBe('leads_vista')
    expect(fuenteDelListado([])).toBe('leads_vista')
    expect(fuenteDelListado([busqueda])).toBe('leads_vista')
    expect(fuenteDelListado([{ tipo: 'tachado', valor: false }])).toBe('leads_vista')
  })

  it('el modo «míos», y un filtro por un campo privado, caen en la cartera sólo con «propios»', () => {
    const campos = [campo('ciudad', false), campo('ci', true)]
    const esquema = esquemaDeFiltrosDeLeads({
      campos,
      origenes: [],
      tipos: [],
      verTodos: true,
      etiquetas: [],
    })
    const desde = (url: string, soloMios: boolean, desdeLaCartera?: boolean) =>
      fuenteDelListado(
        condicionesDeLeads(
          campos,
          leerFiltros(esquema, Object.fromEntries(new URLSearchParams(url))),
          {
            soloMios,
            desdeLaCartera,
          },
        ),
      )
    // «Todos» sin más filtros: la vista de siempre, también para quien ve sólo lo propio.
    expect(desde('', false, true)).toBe('leads_vista')
    expect(desde('a.ciudad=cruz', false, true)).toBe('leads_vista')
    // «Míos», o «todos» filtrando por un campo privado (sólo lo tiene la cartera): la cartera de quien tiene «propios».
    expect(desde('', true, true)).toBe('leads_cartera_vista')
    expect(desde('a.ci=123', false, true)).toBe('leads_cartera_vista')
    // Quien ve «todos» (o no lo dice) conserva su lectura de siempre.
    expect(desde('', true, false)).toBe('leads_vista')
    expect(desde('', true)).toBe('leads_vista')
    expect(desde('a.ci=123', false, false)).toBe('leads_vista')
  })
})

describe('pideLaCartera y leerMiosDeLaCartera (5a-5)', () => {
  const mios = { tipo: 'en_cartera', desdeLaCartera: false } as const

  it('sólo «míos» pide la cartera: sin esa condición, la vista de siempre es la única lectura', () => {
    expect(pideLaCartera([mios])).toBe(true)
    expect(pideLaCartera([busqueda, mios, { tipo: 'tachado', valor: false }])).toBe(true)
    expect(pideLaCartera([])).toBe(false)
    expect(pideLaCartera([busqueda, { tipo: 'tachado', valor: false }])).toBe(false)
  })

  it('pasa «míos» a la cartera y no toca lo demás', () => {
    const tachado = { tipo: 'tachado', valor: false } as const
    const leidas = leerMiosDeLaCartera([busqueda, mios, tachado])
    expect(leidas).toEqual([busqueda, { tipo: 'en_cartera', desdeLaCartera: true }, tachado])
    expect(fuenteDelListado(leidas)).toBe('leads_cartera_vista')
    // Sin «míos», nada cambia (y la fuente sigue siendo la vista de siempre).
    expect(leerMiosDeLaCartera([busqueda, tachado])).toEqual([busqueda, tachado])
    expect(fuenteDelListado(leerMiosDeLaCartera([busqueda, tachado]))).toBe('leads_vista')
  })

  it('no muta lo que recibe', () => {
    const entrada = [mios]
    leerMiosDeLaCartera(entrada)
    expect(entrada).toEqual([{ tipo: 'en_cartera', desdeLaCartera: false }])
  })
})
