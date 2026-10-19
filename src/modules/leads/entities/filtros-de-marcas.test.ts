import { describe, expect, it } from 'vitest'
import { leerFiltros, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { Etiqueta } from './etiqueta'
import {
  FILTRO_ETIQUETA,
  condicionesDeMarcas,
  etiquetasDescartadas,
  filtrosDeMarcas,
  modoDeTachados,
  ocultaTachados,
} from './filtros-de-marcas'
import { filtrosDescartados, textoDeFiltroDescartado } from './filtros-descartados'

const VIP: Etiqueta = {
  id: '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90',
  nombre: 'VIP',
  color: 'rojo',
  actualizadoEn: 'v',
}
const LLAMAR: Etiqueta = { ...VIP, id: '2d3e4f50-6172-4839-9a0b-1c2d3e4f5061', nombre: 'Llamar' }
const AJENA = '11111111-1111-4111-8111-111111111111'

const esquema = (etiquetas: Etiqueta[] = [VIP, LLAMAR]): EsquemaDeFiltros => ({
  busqueda: { clave: 'q', etiqueta: 'Buscar' },
  filtros: filtrosDeMarcas(etiquetas),
})
const leer = (url: string, etiquetas?: Etiqueta[]) =>
  leerFiltros(esquema(etiquetas), Object.fromEntries(new URLSearchParams(url)))

describe('filtrosDeMarcas', () => {
  it('tachados (ocultos por defecto), favoritos y, si hay, etiquetas con el color del token', () => {
    const filtros = filtrosDeMarcas([VIP])
    expect(filtros.map((f) => f.clave)).toEqual(['tachados', 'favoritos', 'etiqueta'])
    expect(filtros.every((f) => f.seccion === 'marcas')).toBe(true)
    expect(filtros[0]).toMatchObject({ tipo: 'eleccion', porDefecto: 'ocultar' })
    expect(filtros[2]).toMatchObject({
      opciones: [{ valor: VIP.id, etiqueta: 'VIP', color: 'var(--etiqueta-rojo)' }],
    })
    expect(filtrosDeMarcas([]).map((f) => f.clave)).toEqual(['tachados', 'favoritos'])
  })
})

describe('tachados', () => {
  it('sin decir nada (o algo que no vale) se ocultan', () => {
    for (const url of ['', 'tachados=ocultar', 'tachados=raro']) {
      expect(modoDeTachados(leer(url))).toBe('ocultar')
      expect(condicionesDeMarcas(leer(url))).toEqual([{ tipo: 'tachado', valor: false }])
    }
  })

  it('«incluir» no pide nada y «solo» pide sólo los tachados', () => {
    expect(condicionesDeMarcas(leer('tachados=incluir'))).toEqual([])
    expect(condicionesDeMarcas(leer('tachados=solo'))).toEqual([{ tipo: 'tachado', valor: true }])
  })

  it('mientras se busca, ocultar no se aplica; «solo» sí', () => {
    expect(ocultaTachados(leer('q=ana'))).toBe(false)
    expect(condicionesDeMarcas(leer('q=ana'))).toEqual([])
    expect(condicionesDeMarcas(leer('q=ana&tachados=solo'))).toEqual([
      { tipo: 'tachado', valor: true },
    ])
    expect(ocultaTachados(leer(''))).toBe(true)
  })

  it('un texto que no alcanza para buscar (?q=ab) no es una búsqueda: los tachados siguen ocultos', () => {
    expect(ocultaTachados(leer('q=ab'))).toBe(true)
    expect(ocultaTachados(leer('q=a_b'))).toBe(true)
    expect(condicionesDeMarcas(leer('q=ab'))).toEqual([{ tipo: 'tachado', valor: false }])
    // Un número de 1 o 2 dígitos sí busca (por número).
    expect(ocultaTachados(leer('q=12'))).toBe(false)
  })
})

describe('favoritos y etiquetas', () => {
  it('favoritos=si y «cualquiera de» las etiquetas propias', () => {
    expect(
      condicionesDeMarcas(leer(`tachados=incluir&favoritos=si&etiqueta=${VIP.id},${LLAMAR.id}`)),
    ).toEqual([
      { tipo: 'favorito', valor: true },
      { tipo: 'etiquetas', ids: [VIP.id, LLAMAR.id] },
    ])
  })

  it('una etiqueta que no es de quien mira no llega a la base', () => {
    expect(condicionesDeMarcas(leer(`tachados=incluir&etiqueta=${AJENA},no-es-un-id`))).toEqual([])
  })
})

describe('etiquetas descartadas', () => {
  it('dice cuántas ya no valen y con qué queda el parámetro', () => {
    expect(etiquetasDescartadas({ [FILTRO_ETIQUETA]: `${VIP.id},${AJENA},basura` }, [VIP])).toEqual(
      {
        cuantas: 2,
        quedan: VIP.id,
      },
    )
    expect(etiquetasDescartadas({ [FILTRO_ETIQUETA]: AJENA }, [VIP])).toEqual({
      cuantas: 1,
      quedan: null,
    })
    expect(etiquetasDescartadas({ [FILTRO_ETIQUETA]: VIP.id }, [VIP])).toBeNull()
    expect(etiquetasDescartadas({}, [VIP])).toBeNull()
  })

  it('el aviso de filtros que ya no valen lo dice junto a los de campos', () => {
    const [uno] = filtrosDescartados([], { [FILTRO_ETIQUETA]: `${VIP.id},${AJENA}` }, [VIP])
    expect(uno).toMatchObject({ motivo: 'etiqueta', parametros: ['etiqueta'], queda: VIP.id })
    expect(textoDeFiltroDescartado(uno!)).toBe('Se quitó del filtro una etiqueta que ya no existe.')
    const [dos] = filtrosDescartados([], { [FILTRO_ETIQUETA]: `${AJENA},x` }, [VIP])
    expect(textoDeFiltroDescartado(dos!)).toBe(
      'Se quitaron del filtro 2 etiquetas que ya no existen.',
    )
  })
})
