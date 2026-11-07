import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { tarjetaDesde } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { calculoDePrueba, crudaDeLaTarjeta } from '../../../entities/tarjeta/tarjeta.soporte'

let respuesta: Resultado<LecturaDeLaTarjeta> = {
  ok: false,
  error: { codigo: 'inesperado', mensaje: 'x' },
}
vi.mock('../../../areas/tarjeta/composicion.client', () => ({
  leerTarjeta: () => Promise.resolve(respuesta),
}))

import { useModeloDeLaTarjeta, type PaginaDelModelo } from './use-modelo-de-la-tarjeta'

const pagina: PaginaDelModelo = {
  vehiculo: 'Toyota Hilux 2020',
  asesor: 'Ana Pérez',
  numero: 7,
  vencida: true,
  guardadaEl: '2026-10-11T14:00:00.000000+00:00',
  logo: null,
}
const entrada = {
  formulaId: '00000000-0000-4000-8000-0000000000aa',
  calculo: calculoDePrueba(),
  monedaBs: 'BOB',
  pagina,
}

describe('useModeloDeLaTarjeta', () => {
  it('con la lectura arma el modelo con lo que la página sabe y la fecha del guardado', async () => {
    const lectura = tarjetaDesde(crudaDeLaTarjeta())
    if (lectura === null) {
      throw new Error('no se lee')
    }
    respuesta = { ok: true, data: lectura }
    const { result } = renderHook(() => useModeloDeLaTarjeta(entrada))
    expect(result.current.modelo).toBeNull()
    await waitFor(() => {
      expect(result.current.modelo).not.toBeNull()
    })
    expect(result.current.lectura).toBe(lectura)
    expect(result.current.modelo?.encabezado).toMatchObject({
      asesor: 'Ana Pérez',
      numero: 7,
      vencida: true,
      fecha: '11 oct 2026',
    })
    expect(result.current.modelo?.vehiculo).toBe('Toyota Hilux 2020')
    expect(result.current.modelo?.total.usd).toBe(1355)
  })

  it('sin lectura el modelo es nulo y el estado dice el error', async () => {
    respuesta = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }
    const { result } = renderHook(() => useModeloDeLaTarjeta(entrada))
    await waitFor(() => {
      expect(result.current.estado.tipo).toBe('error')
    })
    expect(result.current.modelo).toBeNull()
    expect(result.current.lectura).toBeNull()
  })
})
