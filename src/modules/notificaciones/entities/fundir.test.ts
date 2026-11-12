import { describe, expect, it } from 'vitest'
import { fundirPagina, sumarPagina } from './fundir'
import { notificacionDesde, type Notificacion } from './notificacion'

function aviso(id: number, creado: string, extra: Record<string, unknown> = {}): Notificacion {
  const n = notificacionDesde({
    id,
    tipo: 'tarea_asignada',
    titulo: `aviso ${id}`,
    cuerpo: null,
    referencia_tipo: null,
    referencia_id: null,
    ruta: null,
    requiere_accion: false,
    leida_en: null,
    accionada_en: null,
    creado_en: creado,
    ...extra,
  })
  if (!n) {
    throw new Error('fila de prueba inválida')
  }
  return n
}

const ids = (filas: readonly Notificacion[]) => filas.map((n) => n.id)

describe('fundirPagina', () => {
  it('pone lo nuevo arriba y conserva lo cargado de «Ver más»', () => {
    const cargadas = [
      aviso(5, '2026-11-05T10:00:00Z'),
      aviso(4, '2026-11-04T10:00:00Z'),
      aviso(1, '2026-11-01T10:00:00Z'),
    ]
    const frescas = [
      aviso(6, '2026-11-06T10:00:00Z'),
      aviso(5, '2026-11-05T10:00:00Z'),
      aviso(4, '2026-11-04T10:00:00Z'),
    ]
    expect(ids(fundirPagina(cargadas, frescas, true))).toEqual([6, 5, 4, 1])
  })

  it('el estado fresco manda sobre el cargado con el mismo id', () => {
    const cargadas = [aviso(2, '2026-11-02T10:00:00Z')]
    const frescas = [aviso(2, '2026-11-02T10:00:00Z', { leida_en: '2026-11-03T00:00:00Z' })]
    expect(fundirPagina(cargadas, frescas, false)[0]?.leida).toBe(true)
  })

  it('quita lo cargado que cae dentro del tramo fresco y no vino (ya no cumple el filtro)', () => {
    const cargadas = [
      aviso(9, '2026-11-09T10:00:00Z'),
      aviso(8, '2026-11-08T10:00:00Z'),
      aviso(3, '2026-11-03T10:00:00Z'),
    ]
    const frescas = [aviso(9, '2026-11-09T10:00:00Z'), aviso(7, '2026-11-07T10:00:00Z')]
    expect(ids(fundirPagina(cargadas, frescas, true))).toEqual([9, 7, 3])
  })

  it('sin nada más allá de lo fresco, lo que no vino ya no está', () => {
    const cargadas = [aviso(2, '2026-11-02T10:00:00Z'), aviso(1, '2026-11-01T10:00:00Z')]
    const frescas = [aviso(2, '2026-11-02T10:00:00Z')]
    expect(ids(fundirPagina(cargadas, frescas, false))).toEqual([2])
  })

  it('desempata por id con la misma fecha', () => {
    const frescas = [aviso(3, '2026-11-02T10:00:00Z'), aviso(2, '2026-11-02T10:00:00Z')]
    expect(ids(fundirPagina([], frescas, false))).toEqual([3, 2])
  })
})

describe('sumarPagina', () => {
  it('no repite lo que una fusión ya trajo', () => {
    const cargadas = [aviso(3, '2026-11-03T10:00:00Z'), aviso(2, '2026-11-02T10:00:00Z')]
    const siguientes = [aviso(2, '2026-11-02T10:00:00Z'), aviso(1, '2026-11-01T10:00:00Z')]
    expect(ids(sumarPagina(cargadas, siguientes))).toEqual([3, 2, 1])
  })
})
