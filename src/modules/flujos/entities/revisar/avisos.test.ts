import { describe, expect, it } from 'vitest'
import {
  avisosDesde,
  ordenarAvisos,
  resumenDeAvisos,
  TOPE_DE_AVISOS,
  type AvisoDeRevision,
} from './avisos'

const FASE = '0b5b7a3e-4c3d-4f1e-9a2b-6c7d8e9f0a1b'

function aviso(nivel: AvisoDeRevision['nivel'], mensaje = 'm'): AvisoDeRevision {
  return { nivel, codigo: 'x', mensaje, faseId: null }
}

describe('avisosDesde', () => {
  it('lee las filas de la base, también sin fase y con un código que la app no conoce', () => {
    expect(
      avisosDesde([
        { nivel: 'error', codigo: 'sin_inicial', mensaje: 'No hay inicial.', fase_id: null },
        { nivel: 'aviso', codigo: 'codigo_nuevo', mensaje: 'Algo.', fase_id: FASE },
      ]),
    ).toEqual([
      { nivel: 'error', codigo: 'sin_inicial', mensaje: 'No hay inicial.', faseId: null },
      { nivel: 'aviso', codigo: 'codigo_nuevo', mensaje: 'Algo.', faseId: FASE },
    ])
  })

  it('una fila que no se entiende vuelve nulo, nunca una lista a medias', () => {
    expect(avisosDesde([{ nivel: 'grave', codigo: 'x', mensaje: 'm', fase_id: null }])).toBeNull()
    expect(avisosDesde([{ nivel: 'aviso', codigo: 'x', mensaje: 'm', fase_id: 'B' }])).toBeNull()
    expect(avisosDesde(null)).toBeNull()
  })
})

describe('ordenarAvisos', () => {
  it('pone error, aviso e info, y dentro del nivel por mensaje, sin tocar la entrada', () => {
    const entrada = [
      aviso('info', 'i'),
      aviso('aviso', 'b'),
      aviso('error', 'e'),
      aviso('aviso', 'a'),
    ]
    const copia = [...entrada]
    expect(ordenarAvisos(entrada).map((a) => `${a.nivel}:${a.mensaje}`)).toEqual([
      'error:e',
      'aviso:a',
      'aviso:b',
      'info:i',
    ])
    expect(entrada).toEqual(copia)
  })
})

describe('resumenDeAvisos', () => {
  const casos: [AvisoDeRevision[], string, 'error' | 'aviso' | 'ok'][] = [
    [[], 'Todo en orden', 'ok'],
    [[aviso('info'), aviso('info')], 'Todo en orden', 'ok'],
    [[aviso('aviso')], '1 aviso', 'aviso'],
    [[aviso('aviso'), aviso('aviso'), aviso('aviso')], '3 avisos', 'aviso'],
    [[aviso('error')], '1 error', 'error'],
    [[aviso('error'), aviso('error'), aviso('aviso')], '2 errores y 1 aviso', 'error'],
    [
      [
        aviso('error'),
        aviso('aviso'),
        aviso('aviso'),
        aviso('aviso'),
        aviso('info'),
        aviso('info'),
      ],
      '1 error y 3 avisos',
      'error',
    ],
  ]
  it.each(casos)('%# dice «%s»', (avisos, texto, nivel) => {
    expect(resumenDeAvisos(avisos, false)).toEqual({ texto, nivel })
  })

  it('con más del tope no dice un total', () => {
    expect(resumenDeAvisos([aviso('aviso')], true)).toEqual({
      texto: `Más de ${String(TOPE_DE_AVISOS)} avisos`,
      nivel: 'aviso',
    })
  })
})
