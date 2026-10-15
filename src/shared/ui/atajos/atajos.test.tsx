import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos, useAtajo } from './index'

function Panel({ alCerrar, activo = true }: { alCerrar: () => void; activo?: boolean }) {
  useAtajo('cerrar', alCerrar, activo)
  return null
}

function Nuevo({ alCrear }: { alCrear: () => void }) {
  useAtajo('nuevo', alCrear)
  return <input aria-label="campo" />
}

describe('atajos globales', () => {
  it('Esc llama al panel registrado', () => {
    const cerrar = vi.fn()
    render(
      <ProveedorAtajos>
        <Panel alCerrar={cerrar} />
      </ProveedorAtajos>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('con dos paneles, Esc cierra sólo el de más arriba', () => {
    const fondo = vi.fn()
    const frente = vi.fn()
    const { rerender } = render(
      <ProveedorAtajos>
        <Panel alCerrar={fondo} />
        <Panel alCerrar={frente} />
      </ProveedorAtajos>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(frente).toHaveBeenCalledTimes(1)
    expect(fondo).not.toHaveBeenCalled()

    // Al cerrarse el de arriba, el siguiente Esc le toca al de abajo.
    rerender(
      <ProveedorAtajos>
        <Panel alCerrar={fondo} />
        <Panel alCerrar={frente} activo={false} />
      </ProveedorAtajos>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(fondo).toHaveBeenCalledTimes(1)
    expect(frente).toHaveBeenCalledTimes(1)
  })

  it('N no se dispara mientras se escribe en un campo', () => {
    const crear = vi.fn()
    render(
      <ProveedorAtajos>
        <Nuevo alCrear={crear} />
      </ProveedorAtajos>,
    )
    fireEvent.keyDown(screen.getByLabelText('campo'), { key: 'n' })
    expect(crear).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'n' })
    expect(crear).toHaveBeenCalledTimes(1)
  })

  it('un atajo sin nadie registrado deja pasar la tecla', () => {
    render(
      <ProveedorAtajos>
        <span />
      </ProveedorAtajos>,
    )
    const evento = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true })
    window.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)
  })
})

describe('atajos de respaldo', () => {
  it('un atajo de respaldo cede ante el de la pantalla aunque se registre después', () => {
    const pantalla = vi.fn()
    const respaldo = vi.fn()
    function Respaldo() {
      useAtajo('nuevo', respaldo, true, { respaldo: true })
      return null
    }
    function Pantalla() {
      useAtajo('nuevo', pantalla)
      return null
    }
    const { rerender } = render(
      <ProveedorAtajos>
        <Pantalla />
        <Respaldo />
      </ProveedorAtajos>,
    )
    fireEvent.keyDown(window, { key: 'n' })
    expect(pantalla).toHaveBeenCalledTimes(1)
    expect(respaldo).not.toHaveBeenCalled()

    // Sin la pantalla, responde el de respaldo.
    rerender(
      <ProveedorAtajos>
        <Respaldo />
      </ProveedorAtajos>,
    )
    fireEvent.keyDown(window, { key: 'n' })
    expect(respaldo).toHaveBeenCalledTimes(1)
  })
})
