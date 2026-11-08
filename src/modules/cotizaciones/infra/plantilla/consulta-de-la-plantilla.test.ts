import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import {
  consultaDeLaFormulaPublicada,
  consultaDeLasPlantillas,
  consultaDeLosTonos,
} from './consulta-de-la-plantilla'

type Llamada = [string, ...unknown[]]

function clienteFalso() {
  const llamadas: Llamada[] = []
  const consulta: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'in', 'order', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      llamadas.push([metodo, ...args])
      return consulta
    }
  }
  const cliente = {
    from: (nombre: string) => {
      llamadas.push(['from', nombre])
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'

describe('consultaDeLasPlantillas', () => {
  it('el borrador y la publicada del origen, con sus columnas y a lo sumo dos filas', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeLasPlantillas(cliente, ORIGEN)
    expect(llamadas).toEqual([
      ['from', 'plantillas_tarjeta'],
      ['select', 'id, estado, version, definicion, nota, actualizado_en, publicado_en'],
      ['eq', 'origen_id', ORIGEN],
      ['in', 'estado', ['borrador', 'publicada']],
      ['limit', 2],
    ])
  })
})

describe('consultaDeLaFormulaPublicada', () => {
  it('la publicada del origen: una fila, con la definición, el diseño y la visibilidad', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeLaFormulaPublicada(cliente, ORIGEN)
    expect(llamadas).toEqual([
      ['from', 'formulas'],
      ['select', 'id, version, definicion, diseno, visibilidad'],
      ['eq', 'origen_id', ORIGEN],
      ['eq', 'estado', 'publicada'],
      ['limit', 1],
    ])
  })
})

describe('consultaDeLosTonos', () => {
  it('el catálogo por nombre, con el tope de la base (24)', () => {
    const { cliente, llamadas } = clienteFalso()
    void consultaDeLosTonos(cliente)
    expect(llamadas).toEqual([
      ['from', 'tonos'],
      [
        'select',
        'clave, nombre, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta',
      ],
      ['order', 'nombre'],
      ['limit', 24],
    ])
  })
})
