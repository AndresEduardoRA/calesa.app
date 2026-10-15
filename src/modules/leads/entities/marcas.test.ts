import { describe, expect, it } from 'vitest'
import {
  SIN_MARCAS,
  conEtiquetaPuesta,
  conFavorito,
  conTachado,
  firmaDeMarcas,
  marcasDesde,
  respuestaDeEtiquetasDelLeadDesde,
  respuestaDeMarcaDesde,
} from './marcas'

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'

describe('marcasDesde', () => {
  it('lee las columnas de la vista o las claves de la ficha', () => {
    expect(marcasDesde({ es_favorito: true, esta_tachado: false, etiquetas: [A] })).toEqual({
      esFavorito: true,
      estaTachado: false,
      etiquetas: [A],
    })
  })

  it('un nulo o una ausencia es «no»; una forma rota, ninguna marca', () => {
    expect(marcasDesde({ es_favorito: null, etiquetas: null })).toEqual(SIN_MARCAS)
    expect(marcasDesde({ etiquetas: ['no-es-un-id'] })).toEqual(SIN_MARCAS)
    expect(marcasDesde(null)).toEqual(SIN_MARCAS)
  })
})

describe('las respuestas de las RPC', () => {
  it('poner favorito o tachado', () => {
    expect(respuestaDeMarcaDesde({ resultado: 'puesto', valor: true })).toEqual({
      resultado: 'puesto',
      valor: true,
    })
    expect(respuestaDeMarcaDesde({ resultado: 'otro', valor: true })).toBeNull()
  })

  it('poner etiquetas', () => {
    expect(respuestaDeEtiquetasDelLeadDesde({ resultado: 'quitado', etiquetas: [B] })).toEqual({
      resultado: 'quitado',
      etiquetas: [B],
    })
    expect(respuestaDeEtiquetasDelLeadDesde({ resultado: 'quitado' })).toBeNull()
  })
})

describe('lo que se ve mientras viaja', () => {
  it('pone y quita sin duplicar', () => {
    const base = { esFavorito: false, estaTachado: false, etiquetas: [A] }
    expect(conFavorito(base, true).esFavorito).toBe(true)
    expect(conTachado(base, true).estaTachado).toBe(true)
    expect(conEtiquetaPuesta(base, A, true).etiquetas).toEqual([A])
    expect(conEtiquetaPuesta(base, B, true).etiquetas).toEqual([A, B])
    expect(conEtiquetaPuesta(base, A, false).etiquetas).toEqual([])
  })

  it('la firma no depende del orden de las etiquetas', () => {
    const uno = { esFavorito: true, estaTachado: false, etiquetas: [A, B] }
    expect(firmaDeMarcas(uno)).toBe(firmaDeMarcas({ ...uno, etiquetas: [B, A] }))
    expect(firmaDeMarcas(uno)).not.toBe(firmaDeMarcas({ ...uno, esFavorito: false }))
  })
})
