import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLASE_LIVE } from '@/shared/ui/guion-live'
import { MENSAJE_SIN_LA_CONSTANTE } from '../../../../entities/formula/ajuste'
import type { CeldaDeHoja } from '../../../../entities/hoja'
import {
  ejecutar,
  hojaDePrueba,
  leido,
  ok,
  ORIGEN,
  PUBLICADA,
  pedidos,
  reiniciar,
  responder,
} from '../../hooks/use-ajuste-de-constante.soporte'

vi.mock('next-safe-action/hooks', async () => {
  const soporte = await import('../../hooks/use-ajuste-de-constante.soporte')
  return { useAction: () => ({ executeAsync: soporte.ejecutar }) }
})
vi.mock('../../actions/cambiar-constante', () => ({ cambiarConstante: {} }))
vi.mock('@/modules/empresa/client', () => ({ guardarTipoCambio: {} }))
vi.mock('@/shared/ui/toasts', async () => {
  const soporte = await import('../../hooks/use-ajuste-de-constante.soporte')
  return { avisarExito: soporte.avisarExito }
})
vi.mock('../../../../areas/formula/composicion.client', async () => {
  const soporte = await import('../../hooks/use-ajuste-de-constante.soporte')
  return { leerValorPorDefecto: soporte.leerSimulado }
})

const { PanelDelAjuste } = await import('./panel-del-ajuste')

const celda = (mas: Partial<CeldaDeHoja> = {}): CeldaDeHoja => ({
  tipo: 'celda',
  nodo: 'flete',
  etiqueta: 'Flete',
  tipoDeNodo: 'constante',
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
  editable: true,
  motivo: null,
  ...mas,
})

// «Fees» (un cálculo sobrescribible, sin ⚙) con su porcentaje, una constante con ⚙.
const conPorcentaje = (editable = true) =>
  celda({
    nodo: 'fees',
    etiqueta: 'Fees',
    tipoDeNodo: 'calculo',
    ajustes: false,
    secundario: {
      nodo: 'fees_pct',
      tipoDeNodo: 'constante',
      como: 'porcentaje',
      formato: 'pct',
      ajustes: true,
      editable,
      motivo: null,
    },
  })

function montar(c: CeldaDeHoja = celda(), version = 3) {
  const { hoja } = hojaDePrueba(version)
  const cerrar = vi.fn()
  render(<PanelDelAjuste celda={c} cerrar={cerrar} hoja={hoja} origenId={ORIGEN} />)
  return { cerrar }
}

const campo = () => screen.getByRole('textbox', { name: 'Valor nuevo' })
const casilla = () => screen.queryByRole('checkbox', { name: 'Aplicar también a esta cotización' })

beforeEach(reiniciar)
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
})

describe('PanelDelAjuste: lo que muestra mientras lee', () => {
  it('se titula con la celda y, leído, dice el valor por defecto y lo que afecta', async () => {
    montar()
    expect(screen.getByRole('dialog', { name: 'Valor por defecto de Flete' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cargando el valor por defecto')).toBeInTheDocument()
    await responder(1, leido({ flete: 1200 }))
    expect(screen.getByText(/Valor por defecto:/).textContent).toBe('Valor por defecto: 1.200')
    expect(
      screen.getByText(
        'Afecta a las cotizaciones nuevas de este origen: publica una versión nueva de la fórmula.',
      ),
    ).toBeInTheDocument()
    expect(campo()).toHaveValue('1200')
  })

  it('si no se pudo leer, lo dice con «Reintentar», que vuelve a pedir', async () => {
    montar()
    await responder(1, { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(screen.getByText('No se pudo leer el valor por defecto.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await responder(2, leido({ flete: 1200 }))
    expect(campo()).toHaveValue('1200')
  })

  it('si la publicada ya no tiene la constante, lo dice sin formulario', async () => {
    montar()
    await responder(1, leido({ flete: null }))
    expect(screen.getByText(MENSAJE_SIN_LA_CONSTANTE)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('con dos constantes y una que falta, ese bloque lo dice y el otro sigue', async () => {
    montar(celda({ secundario: conPorcentaje().secundario }))
    await responder(1, leido({ flete: 1200, fees_pct: null }))
    expect(screen.getByRole('form', { name: 'Flete' })).toBeInTheDocument()
    const delPorcentaje = screen.getByRole('form', { name: 'Porcentaje de Flete' })
    expect(within(delPorcentaje).getByText(MENSAJE_SIN_LA_CONSTANTE)).toBeInTheDocument()
    expect(within(delPorcentaje).queryByRole('textbox')).not.toBeInTheDocument()
    expect(campo()).toHaveValue('1200')
  })

  it('si la hoja usa otra versión que la publicada, lo dice', async () => {
    montar(celda(), 3)
    await responder(1, leido({ flete: 1200 }, PUBLICADA, 5))
    expect(
      screen.getByText('Esta hoja usa la versión 3 de la fórmula; cambias la 5, la publicada.'),
    ).toBeInTheDocument()
  })
})

describe('PanelDelAjuste: el formulario', () => {
  it('el porcentaje de un par abre en puntos y su casilla sólo si se edita en esta hoja', async () => {
    montar(conPorcentaje(true))
    await responder(1, leido({ fees_pct: 0.13 }))
    expect(campo()).toHaveValue('13')
    expect(casilla()).toBeInTheDocument()
    cleanup()
    reiniciar()
    montar(conPorcentaje(false))
    await responder(1, leido({ fees_pct: 0.13 }))
    expect(casilla()).not.toBeInTheDocument()
  })

  it('con el Modo Live, «Valor nuevo» es un campo de contraseña con las marcas de los gestores', async () => {
    document.documentElement.classList.add(CLASE_LIVE)
    montar()
    await responder(1, leido({ flete: 1200 }))
    const entrada = screen.getByLabelText('Valor nuevo')
    expect(entrada).toHaveAttribute('type', 'password')
    expect(entrada).toHaveAttribute('autocomplete', 'off')
    expect(entrada).toHaveAttribute('inputmode', 'decimal')
    for (const marca of ['data-1p-ignore', 'data-lpignore', 'data-bwignore']) {
      expect(entrada).toHaveAttribute(marca, 'true')
    }
    expect(entrada).toHaveAttribute('data-form-type', 'other')
  })

  it('sin el Modo Live es de texto, sin las marcas', async () => {
    montar()
    await responder(1, leido({ flete: 1200 }))
    expect(campo()).toHaveAttribute('type', 'text')
    expect(campo()).not.toHaveAttribute('data-1p-ignore')
  })

  it('mientras envía, los campos, las casillas y los botones de los dos bloques quedan apagados', async () => {
    montar(celda({ secundario: conPorcentaje().secundario }))
    await responder(1, leido({ flete: 1200, fees_pct: 0.13 }))
    ejecutar.mockReturnValueOnce(new Promise(() => {}))
    const [primero] = screen.getAllByRole('textbox', { name: 'Valor nuevo' })
    fireEvent.change(primero as HTMLElement, { target: { value: '1300' } })
    await act(async () => {
      fireEvent.click(
        screen.getAllByRole('button', { name: 'Cambiar el valor por defecto' })[0] as HTMLElement,
      )
      await Promise.resolve()
    })
    for (const control of [
      ...screen.getAllByRole('textbox', { name: 'Valor nuevo' }),
      ...screen.getAllByRole('button', { name: /^Cambia/ }),
    ]) {
      expect(control).toBeDisabled()
    }
    // La casilla de Base UI es un `role="checkbox"` que se apaga con `aria-disabled`.
    for (const control of screen.getAllByRole('checkbox', {
      name: 'Aplicar también a esta cotización',
    })) {
      expect(control).toHaveAttribute('aria-disabled', 'true')
    }
  })
})

describe('PanelDelAjuste: cerrar y el tipo de cambio', () => {
  it('con algo tipeado, Esc pregunta en el pie y no cierra; sin nada, cierra', async () => {
    const { cerrar } = montar()
    await responder(1, leido({ flete: 1200 }))
    fireEvent.change(campo(), { target: { value: '1300' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(cerrar).not.toHaveBeenCalled()
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    fireEvent.change(campo(), { target: { value: '1200' } })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('con la respuesta buena se cierra', async () => {
    const { cerrar } = montar()
    await responder(1, leido({ flete: 1200 }))
    ejecutar.mockResolvedValueOnce(ok())
    fireEvent.change(campo(), { target: { value: '1300' } })
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Flete' }))
      await Promise.resolve()
    })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('en una guardada, una celda de tipo de cambio dice dónde se cambia y que conserva el suyo, sin leer nada', () => {
    const { hoja } = hojaDePrueba()
    const guardada = {
      ...hoja,
      de: { tipo: 'guardada' as const, cotizacionId: '66666666-6666-4666-8666-666666666666' },
    }
    render(
      <PanelDelAjuste
        celda={celda({ nodo: 'tc', etiqueta: 'TC', tipoDeNodo: 'tipo_cambio' })}
        cerrar={vi.fn()}
        hoja={guardada}
        origenId={ORIGEN}
      />,
    )
    expect(
      screen.getByText(
        'Los tipos de cambio son de la empresa y valen para todos los orígenes: se cambian en Configuración › Empresa › Monedas.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Esta cotización conserva el tipo de cambio con que se guardó.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Monedas' })).toHaveAttribute(
      'href',
      '/configuracion/empresa?seccion=monedas',
    )
    expect(pedidos).toHaveLength(0)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
