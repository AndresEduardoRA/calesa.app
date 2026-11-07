import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLASE_LIVE } from '@/shared/ui/guion-live'
import type { CeldaDeHoja } from '../../../../entities/hoja'
import {
  ejecutar,
  hojaDePrueba,
  leida,
  ok,
  pedidos,
  reiniciar,
  responder,
} from '../../hooks/use-ajuste-de-tipo-cambio.soporte'

vi.mock('next-safe-action/hooks', async () => {
  const soporte = await import('../../hooks/use-ajuste-de-tipo-cambio.soporte')
  return { useAction: () => ({ executeAsync: soporte.ejecutar }) }
})
vi.mock('@/modules/empresa/client', () => ({ guardarTipoCambio: {} }))
vi.mock('../../actions/cambiar-constante', () => ({ cambiarConstante: {} }))
vi.mock('@/shared/ui/toasts', async () => {
  const soporte = await import('../../hooks/use-ajuste-de-tipo-cambio.soporte')
  return { avisarExito: soporte.avisarExito }
})
vi.mock('../../../../areas/formula/composicion.client', async () => {
  const soporte = await import('../../hooks/use-ajuste-de-tipo-cambio.soporte')
  return { leerTipoCambioDelNodo: soporte.leerSimulado }
})

const { PanelDelAjuste } = await import('./panel-del-ajuste')

const CELDA: CeldaDeHoja = {
  tipo: 'celda',
  nodo: 'tc',
  etiqueta: 'TC',
  tipoDeNodo: 'tipo_cambio',
  formato: 'raw',
  ancho: 'completo',
  tono: null,
  ajustes: true,
  ayuda: null,
  datoDelVehiculo: null,
  soloEn: null,
  condicion: null,
  requeridoSi: null,
  secundario: null,
  editable: false,
  motivo: null,
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'

function montar(tipo: 'abierta' | 'guardada' = 'abierta') {
  const { hoja, alConfirmar } = hojaDePrueba(tipo)
  const cerrar = vi.fn()
  render(<PanelDelAjuste celda={CELDA} cerrar={cerrar} hoja={hoja} origenId={ORIGEN} />)
  return { cerrar, alConfirmar }
}

const campo = () => screen.getByLabelText('Valor nuevo')
const boton = () => screen.getByRole('button', { name: 'Cambiar el tipo de cambio' })
const MONEDAS = 'Configuración › Empresa › Monedas'

beforeEach(reiniciar)
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
})

describe('PanelDelAjuste de un tipo de cambio: lo que muestra mientras lee', () => {
  it('se titula «Tipo de cambio de <celda>» y, mientras lee, sólo el esqueleto', () => {
    montar()
    expect(screen.getByRole('dialog', { name: 'Tipo de cambio de TC' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cargando el tipo de cambio')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Valor nuevo')).not.toBeInTheDocument()
  })

  it('leído, dice el valor de hoy por <Monto> y lo que afecta, con el campo abierto en el valor de hoy', async () => {
    montar()
    await responder(1, leida())
    const formulario = screen.getByRole('form', { name: 'Oficial' })
    const hoy = formulario.querySelector('[data-monto-valor]')
    expect(screen.getByText(/Valor de hoy:/).textContent).toContain('1 USD =')
    expect(hoy?.textContent.replace(/\s/g, ' ')).toBe('Bs 11,68')
    expect(
      screen.getByText(
        'Afecta a toda la empresa: las cotizaciones nuevas de todos los orígenes lo usan desde ya; las guardadas conservan el suyo.',
      ),
    ).toBeInTheDocument()
    expect(campo()).toHaveValue('11,68')
    expect(
      screen.queryByRole('checkbox', { name: 'Aplicar también a esta cotización' }),
    ).not.toBeInTheDocument()
  })

  it('si no se pudo leer, lo dice con «Reintentar», que vuelve a pedir', async () => {
    montar()
    await responder(1, { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(screen.getByText('No se pudo leer el tipo de cambio.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await responder(2, leida())
    expect(campo()).toHaveValue('11,68')
  })

  it('sin fila, dice que no lo encontró y dónde se cambia, sin formulario', async () => {
    montar()
    await responder(1, { ok: true, data: null })
    expect(screen.getByText('No encontramos el tipo de cambio de esta celda.')).toBeInTheDocument()
    expect(screen.getByText(new RegExp(MONEDAS))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Monedas' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Valor nuevo')).not.toBeInTheDocument()
  })

  it('desactivado, dice dónde se activa, sin formulario', async () => {
    montar()
    await responder(1, leida({ activo: false }))
    expect(
      screen.getByText(`Oficial está desactivado: se activa en ${MONEDAS}.`),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Monedas' })).toHaveAttribute(
      'href',
      '/configuracion/empresa?seccion=monedas',
    )
    expect(screen.queryByLabelText('Valor nuevo')).not.toBeInTheDocument()
  })
})

describe('PanelDelAjuste de un tipo de cambio: el formulario', () => {
  it('con el Modo Live, «Valor nuevo» es de contraseña con las marcas de los gestores', async () => {
    document.documentElement.classList.add(CLASE_LIVE)
    montar()
    await responder(1, leida())
    expect(campo()).toHaveAttribute('type', 'password')
    expect(campo()).toHaveAttribute('autocomplete', 'off')
    expect(campo()).toHaveAttribute('inputmode', 'decimal')
    for (const marca of ['data-1p-ignore', 'data-lpignore', 'data-bwignore']) {
      expect(campo()).toHaveAttribute(marca, 'true')
    }
    expect(campo()).toHaveAttribute('data-form-type', 'other')
  })

  it('sin el Modo Live es de texto, sin las marcas', async () => {
    montar()
    await responder(1, leida())
    expect(campo()).toHaveAttribute('type', 'text')
    expect(campo()).not.toHaveAttribute('data-1p-ignore')
  })

  it('mientras envía, el campo y el botón quedan apagados', async () => {
    montar()
    await responder(1, leida())
    ejecutar.mockReturnValueOnce(new Promise(() => {}))
    fireEvent.change(campo(), { target: { value: '12' } })
    await act(async () => {
      fireEvent.click(boton())
      await Promise.resolve()
    })
    expect(campo()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cambiando…' })).toBeDisabled()
  })

  it('un aviso de la base va arriba con «Volver a leer» y el botón espera la relectura', async () => {
    montar()
    await responder(1, leida())
    ejecutar.mockResolvedValueOnce({
      data: { ok: false, error: { codigo: 'conflicto', mensaje: 'Otra persona lo cambió.' } },
    })
    fireEvent.change(campo(), { target: { value: '12' } })
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Oficial' }))
      await Promise.resolve()
    })
    expect(screen.getByText('Otra persona lo cambió.')).toBeInTheDocument()
    expect(boton()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a leer' }))
    await responder(2, leida({ valor: 12.5 }))
    expect(campo()).toHaveValue('12')
    expect(boton()).toBeEnabled()
  })

  it('con algo tipeado, Esc pregunta en el pie y no cierra; con la respuesta buena se cierra', async () => {
    const { cerrar, alConfirmar } = montar()
    await responder(1, leida())
    fireEvent.change(campo(), { target: { value: '12' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(cerrar).not.toHaveBeenCalled()
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    ejecutar.mockResolvedValueOnce(ok())
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Oficial' }))
      await Promise.resolve()
    })
    expect(cerrar).toHaveBeenCalledTimes(1)
    expect(alConfirmar).not.toHaveBeenCalled()
  })
})

describe('PanelDelAjuste de un tipo de cambio en una guardada', () => {
  it('dice dónde se cambia y que la cotización conserva el suyo, sin leer nada', () => {
    montar('guardada')
    expect(screen.getByRole('dialog', { name: 'Tipo de cambio de TC' })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(MONEDAS))).toBeInTheDocument()
    expect(
      screen.getByText('Esta cotización conserva el tipo de cambio con que se guardó.'),
    ).toBeInTheDocument()
    expect(pedidos).toHaveLength(0)
    expect(screen.queryByLabelText('Valor nuevo')).not.toBeInTheDocument()
  })
})
