import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuscadorDelPanel } from './buscador-del-panel'

afterEach(cleanup)

function montar(props: Partial<Parameters<typeof BuscadorDelPanel>[0]> = {}) {
  const acciones = { alCambiar: vi.fn(), alCargarAMano: vi.fn(), alTraer: vi.fn() }
  render(
    <BuscadorDelPanel
      textoDeUrl=""
      aviso={null}
      alCambiar={acciones.alCambiar}
      alCargarAMano={acciones.alCargarAMano}
      conTraer={false}
      etiquetaDeTraer={null}
      alTraer={acciones.alTraer}
      {...props}
    />,
  )
  return acciones
}

describe('BuscadorDelPanel', () => {
  it('toma el foco al montarse y avisa lo que se tipea', () => {
    const { alCambiar } = montar()
    const campo = screen.getByRole('searchbox', { name: 'Buscar un vehículo' })
    expect(document.activeElement).toBe(campo)
    fireEvent.change(campo, { target: { value: 'Bronco' } })
    expect(alCambiar).toHaveBeenCalledWith('Bronco')
    expect((campo as HTMLInputElement).value).toBe('Bronco')
  })

  it('el aviso va debajo del campo y lo describe', () => {
    montar({ aviso: 'Escribe al menos 3 letras o números.' })
    const campo = screen.getByRole('searchbox')
    const aviso = screen.getByRole('status')
    expect(aviso.textContent).toBe('Escribe al menos 3 letras o números.')
    expect(campo.getAttribute('aria-describedby')).toBe(aviso.id)
  })

  it('sin alta no hay «+» ni «Traer»; con alta, «+» abre «Cargar a mano»', () => {
    montar({ alCargarAMano: null })
    expect(screen.queryByRole('button', { name: 'Cargar a mano' })).toBeNull()
    cleanup()
    const { alCargarAMano } = montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cargar a mano' }))
    expect(alCargarAMano).toHaveBeenCalledOnce()
  })

  it('«Traer» sólo aparece con algo que traer, y trae lo tipeado', () => {
    montar({ conTraer: true, etiquetaDeTraer: 'Traer el lote 58540656', textoDeUrl: '58540656' })
    expect(screen.getByRole('searchbox', { name: 'Buscar o traer un vehículo' })).toBeTruthy()
    cleanup()
    const { alTraer } = montar({
      conTraer: true,
      etiquetaDeTraer: 'Traer el lote 58540656',
      textoDeUrl: '58540656',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Traer el lote 58540656' }))
    expect(alTraer).toHaveBeenCalledWith('58540656', false)
  })

  it('sin nada que traer no hay botón', () => {
    montar({ conTraer: true })
    expect(screen.queryByRole('button', { name: /^Traer/ })).toBeNull()
  })

  it('Enter pide traer lo que hay tipeado en ese instante, aunque la URL vaya detrás', () => {
    const { alTraer } = montar({ conTraer: true })
    const campo = screen.getByRole('searchbox')
    fireEvent.change(campo, { target: { value: 'https://www.copart.com/lot/58540656/x' } })
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(alTraer).toHaveBeenCalledWith('https://www.copart.com/lot/58540656/x', true)
  })
})
