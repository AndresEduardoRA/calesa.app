import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import { ContextoDeLaVistaPrevia } from '../../hoja/components/hueco-de-la-vista-previa'
import { calculoDePrueba } from '../../../entities/tarjeta/tarjeta.soporte'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'

vi.mock('../../../areas/tarjeta/composicion.client', () => ({
  leerTarjeta: () =>
    Promise.resolve<Resultado<LecturaDeLaTarjeta>>({
      ok: true,
      data: { estado: 'sin_plantilla' },
    }),
}))

import { ProveedorDeLaTarjeta } from './proveedor-de-la-tarjeta'

afterEach(cleanup)

function Consumidor() {
  const hueco = useContext(ContextoDeLaVistaPrevia)
  if (hueco === null) {
    return <p>sin proveedor</p>
  }
  return (
    <>
      {hueco.dibujar({
        abierta: true,
        cerrar: () => undefined,
        formulaId: '00000000-0000-4000-8000-0000000000aa',
        calculo: calculoDePrueba(),
        estado: { tipo: 'al_dia' },
        monedaBs: null,
        avisos: { difiere: false, cambiosSinGuardar: false },
      })}
    </>
  )
}

describe('<ProveedorDeLaTarjeta>', () => {
  it('sin proveedor el hueco es nulo', () => {
    render(<Consumidor />)
    expect(screen.getByText('sin proveedor')).toBeTruthy()
  })

  it('llena el hueco con el modal y le da lo que la página sabe', async () => {
    render(
      <ProveedorDeLaTarjeta
        vehiculo="Toyota Hilux 2020"
        asesor="Ana Pérez"
        numero={7}
        vencida={false}
        guardadaEl={null}
        logo={null}
      >
        <Consumidor />
      </ProveedorDeLaTarjeta>,
    )
    // El código del modal se pide al abrirse (`diferido()`): la primera vez tarda en transformarse.
    await waitFor(
      () => {
        expect(screen.getByText('Asesor: Ana Pérez')).toBeTruthy()
      },
      { timeout: 10_000 },
    )
    expect(screen.getByText('Toyota Hilux 2020')).toBeTruthy()
    expect(screen.getByText(/Cotización n\.º 7/)).toBeTruthy()
  })
})
