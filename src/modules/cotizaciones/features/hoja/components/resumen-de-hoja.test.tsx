import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CLASE_LIVE } from '@/shared/ui/guion-live'
import { ENTRADAS_VACIAS, indiceDeHoja } from '../../../entities/entradas'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { ResumenDeHoja } from './resumen-de-hoja'

const hoja = hojaDePrueba()
const GARANTIA_ACTIVA = respuestaDePrueba({
  usd: 2350,
  valores: { garantia: 120 },
  estados: { garantia: 'activo' },
})

function resumen(modo: string | null, respuesta = GARANTIA_ACTIVA) {
  return render(
    <ResumenDeHoja
      tarjeta={hoja.tarjetaTotal}
      monedaDelTotalBs={null}
      modo={modo}
      contexto={{ indice: indiceDeHoja(hoja.secciones), entradas: ENTRADAS_VACIAS, respuesta }}
      estado={{ tipo: 'al_dia' }}
      avisoDelVehiculo={null}
      alReintentar={() => {}}
      alRecargar={() => {}}
      guardar={{ motivo: null, motivoYaDicho: false, ocupado: false, alGuardar: () => {} }}
      avisoDeGuardado={null}
    />,
  )
}

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
})

describe('ResumenDeHoja › el resumen fijo', () => {
  it('dice el modo de tipo de cambio con que se calculó, y nada si la hoja no tiene modos', () => {
    resumen('Unificado')
    expect(document.querySelector('[data-modo]')?.textContent).toBe(
      'Modo de tipo de cambio: Unificado',
    )
    cleanup()
    resumen(null)
    expect(document.querySelector('[data-modo]')).toBeNull()
  })

  it('el botón Live conmuta la clase de <html> y su aria-pressed', () => {
    resumen(null)
    const boton = screen.getByRole('button', { name: 'Modo Live: ocultar los montos' })
    expect(boton.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(boton)
    expect(document.documentElement.classList.contains(CLASE_LIVE)).toBe(true)
    expect(boton.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(boton)
    expect(document.documentElement.classList.contains(CLASE_LIVE)).toBe(false)
  })

  it('la garantía sólo sale con su valor; y el resumen es un pie de panel para los avisos', () => {
    resumen(null)
    expect(screen.getByText('Garantía')).toBeTruthy()
    expect(screen.getByLabelText('Resumen').hasAttribute('data-pie-de-panel')).toBe(true)
    cleanup()
    resumen(null, respuestaDePrueba({ usd: 2350, estados: { garantia: 'condicion_apagada' } }))
    expect(screen.queryByText('Garantía')).toBeNull()
  })
})
