import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pedidoDe, type AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import { AccionesDelAviso } from './acciones-del-aviso'

const empujar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: empujar }) }))

afterEach(() => {
  cleanup()
  empujar.mockReset()
})

const dos: AccionesDeUnAviso = {
  acciones: [
    { tipo: 'ir', etiqueta: 'Quitar el vínculo', ruta: '/vehiculos/1?panel=desvincular' },
    { tipo: 'ir', etiqueta: 'Ver el lead', ruta: '/leads/9' },
  ],
  pedido: null,
}

describe('AccionesDelAviso', () => {
  it('con enfocar lleva el foco a la principal', () => {
    render(<AccionesDelAviso resueltas={dos} enfocar />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Quitar el vínculo' }))
  })

  it('sin enfocar no toma el foco', () => {
    render(<AccionesDelAviso resueltas={dos} />)
    expect(document.activeElement).toBe(document.body)
  })

  it('ir navega con el router y avisa que se eligió algo', () => {
    const alElegir = vi.fn()
    render(<AccionesDelAviso resueltas={dos} alElegir={alElegir} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver el lead' }))
    expect(empujar).toHaveBeenCalledWith('/leads/9')
    expect(alElegir).toHaveBeenCalledOnce()
  })

  it('panel abre el panel sobre la pantalla de hoy', () => {
    window.history.replaceState(null, '', '/vehiculos/1?seccion=ficha')
    render(
      <AccionesDelAviso
        resueltas={{
          acciones: [{ tipo: 'panel', etiqueta: 'Editar', panel: 'vitrina' }],
          pedido: null,
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(empujar).toHaveBeenCalledWith('/vehiculos/1?seccion=ficha&panel=vitrina')
  })

  it('reintentar y deshacer llaman a su manejador; sin él no se dibujan', () => {
    const alReintentar = vi.fn()
    const resueltas: AccionesDeUnAviso = {
      acciones: [
        { tipo: 'reintentar', etiqueta: 'Reintentar' },
        { tipo: 'deshacer', etiqueta: 'Deshacer' },
      ],
      pedido: null,
    }
    render(<AccionesDelAviso resueltas={resueltas} alReintentar={alReintentar} />)
    expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(alReintentar).toHaveBeenCalledOnce()
  })

  it('con pedido y sin acciones dibuja sólo el texto', () => {
    render(<AccionesDelAviso resueltas={{ acciones: [], pedido: pedidoDe('quitar el vínculo') }} />)
    expect(
      screen.getByText('Para quitar el vínculo, pídeselo a quien administra los roles.'),
    ).toBeDefined()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('sin acciones ni pedido no dibuja nada', () => {
    const { container } = render(<AccionesDelAviso resueltas={{ acciones: [], pedido: null }} />)
    expect(container.innerHTML).toBe('')
  })

  it('la principal va a lo ancho en el celular y las demás no', () => {
    render(<AccionesDelAviso resueltas={dos} />)
    expect(screen.getByRole('button', { name: 'Quitar el vínculo' }).className).toContain('w-full')
    expect(screen.getByRole('button', { name: 'Ver el lead' }).className).not.toContain('w-full')
  })
})
