import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProveedorRegional } from '@/shared/ui/regional'
import type { ModeloDeTarjeta } from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import { textoDeLaTarjeta } from '../../../entities/tarjeta/texto-de-la-tarjeta'

const avisos: string[] = []
vi.mock('@/shared/ui/toasts', () => ({
  avisar: (mensaje: string) => {
    avisos.push(mensaje)
  },
}))

import { CopiarTextoDeLaTarjeta } from './copiar-texto-de-la-tarjeta'

const modelo: ModeloDeTarjeta = {
  porOmision: false,
  encabezado: { titulo: null, fecha: '6 nov 2026', asesor: 'Ana', numero: 4, vencida: false },
  logo: null,
  vehiculo: null,
  grupos: [],
  total: { etiqueta: 'TOTAL', leyenda: null, usd: 1234.5, bs: null },
  aparte: [],
  nota: null,
  tonos: [],
}

const escribir = vi.fn<(texto: string) => Promise<void>>()

function dibujar(props: Partial<React.ComponentProps<typeof CopiarTextoDeLaTarjeta>> = {}) {
  return render(
    <ProveedorRegional locale="en-US" monedaBase="USD" zonaHoraria="America/La_Paz">
      <p id="desactualizado">Total desactualizado.</p>
      <CopiarTextoDeLaTarjeta
        modelo={modelo}
        aviso={null}
        idDelDesactualizado="desactualizado"
        {...props}
      />
    </ProveedorRegional>,
  )
}

const boton = () => screen.getByRole('button', { name: /Copiar texto|Copiado/ })

beforeEach(() => {
  avisos.length = 0
  escribir.mockReset()
  escribir.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: escribir },
    configurable: true,
  })
})
afterEach(cleanup)

describe('<CopiarTextoDeLaTarjeta>', () => {
  it('copia el texto de la tarjeta con el locale de la empresa y dice «Copiado» hasta perder el foco', async () => {
    dibujar()
    fireEvent.click(boton())
    await waitFor(() => {
      expect(boton().textContent).toContain('Copiado')
    })
    expect(escribir).toHaveBeenCalledWith(textoDeLaTarjeta(modelo, { locale: 'en-US' }))
    fireEvent.blur(boton())
    expect(boton().textContent).toContain('Copiar texto')
  })

  it('si el navegador no deja, lo avisa', async () => {
    escribir.mockRejectedValue(new Error('NotAllowedError'))
    dibujar()
    fireEvent.click(boton())
    await waitFor(() => {
      expect(avisos).toEqual(['No se pudo copiar el texto: tu navegador no lo permite.'])
    })
    expect(boton().textContent).toContain('Copiar texto')
  })

  it('sin tarjeta está apagado', () => {
    dibujar({ modelo: null })
    expect((boton() as HTMLButtonElement).disabled).toBe(true)
  })

  it('sin tarjeta no nombra un aviso que no está dibujado', () => {
    for (const aviso of ['sin_total', 'desactualizado'] as const) {
      const { unmount } = dibujar({ modelo: null, aviso })
      const b = boton() as HTMLButtonElement
      expect(b.disabled).toBe(true)
      expect(b.getAttribute('aria-describedby')).toBeNull()
      unmount()
    }
  })

  it('con el total desactualizado está apagado y lo nombra el aviso', () => {
    dibujar({ aviso: 'desactualizado' })
    const b = boton() as HTMLButtonElement
    expect(b.disabled).toBe(true)
    expect(b.getAttribute('aria-describedby')).toBe('desactualizado')
    fireEvent.click(b)
    expect(escribir).not.toHaveBeenCalled()
  })

  it('sin total está apagado y dice por qué', () => {
    dibujar({ aviso: 'sin_total' })
    const b = boton() as HTMLButtonElement
    expect(b.disabled).toBe(true)
    const id = b.getAttribute('aria-describedby')
    expect(id).not.toBeNull()
    expect(document.getElementById(id ?? '')?.textContent).toBe('Falta el total para copiarlo.')
  })

  it('con el total al día está encendido y sin descripción', () => {
    dibujar()
    const b = boton() as HTMLButtonElement
    expect(b.disabled).toBe(false)
    expect(b.getAttribute('aria-describedby')).toBeNull()
    expect(screen.queryByText('Falta el total para copiarlo.')).toBeNull()
  })
})
