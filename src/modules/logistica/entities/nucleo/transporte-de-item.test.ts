import { describe, expect, it } from 'vitest'
import {
  TEXTO_DEL_TRANSPORTE_QUE_SIGUE_AL_VEHICULO,
  TEXTO_DEL_TRANSPORTE_SIN_VEHICULO,
  textoDelTransporteDelItem,
} from './transporte-de-item'

describe('el transporte de un ítem de repuesto', () => {
  it('con vehículo en el proyecto, sigue al vehículo', () => {
    expect(textoDelTransporteDelItem({ id: 'p', vehiculoId: 'v' })).toBe(
      TEXTO_DEL_TRANSPORTE_QUE_SIGUE_AL_VEHICULO,
    )
  })

  it('sin vehículo o sin proyecto, dice que el propio todavía no se carga', () => {
    expect(textoDelTransporteDelItem({ id: 'p', vehiculoId: null })).toBe(
      TEXTO_DEL_TRANSPORTE_SIN_VEHICULO,
    )
    expect(textoDelTransporteDelItem(undefined)).toBe(TEXTO_DEL_TRANSPORTE_SIN_VEHICULO)
  })
})
