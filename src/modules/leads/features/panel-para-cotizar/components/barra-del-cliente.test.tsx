import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarraDelCliente } from './barra-del-cliente'

const panelMontado = vi.fn()
vi.mock('./diferidos', () => ({
  PanelDelClienteDiferido: (props: { elegido: unknown }) => {
    panelMontado(props)
    return null
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const ID = '00000000-0000-4000-8000-000000000001'
const ELEGIDO = {
  id: ID,
  nombre: 'Ana Pérez',
  tipoId: null,
  numeros: { numero: 1234, numeroPropio: null, creadorDelPropio: null },
}

function montar(props: Partial<Parameters<typeof BarraDelCliente>[0]> = {}, url = '?origen=o') {
  const cambios: UrlUpdateEvent[] = []
  render(
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={(c) => cambios.push(c)} hasMemory>
      <BarraDelCliente
        elegido={null}
        puedeVer
        numeroGlobal
        puedeCrear={false}
        claveDeLaUrl="lead"
        {...props}
      />
    </NuqsTestingAdapter>,
  )
  return { cambios }
}

describe('BarraDelCliente', () => {
  it('sin cliente invita a elegir uno, con una sola parada de Tab', () => {
    montar()
    expect(screen.getByRole('button', { name: /Selecciona un cliente/ })).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('con cliente dice «Cliente:» para el lector, su nombre y su número', () => {
    montar({ elegido: ELEGIDO })
    const boton = screen.getByRole('button', { name: /Ana Pérez/ })
    expect(boton.textContent).toContain('Cliente: ')
    expect(boton.textContent).toContain('N.º 1.234')
    expect(boton.getAttribute('aria-haspopup')).toBe('dialog')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('el botón lleva `data-elige` con la clave de la URL: a él vuelve el foco al cerrar «Nuevo lead»', () => {
    montar()
    expect(
      screen.getByRole('button', { name: /Selecciona un cliente/ }).getAttribute('data-elige'),
    ).toBe('lead')
  })

  it('le pasa al panel si se puede crear un lead', () => {
    montar({ puedeCrear: true }, '?origen=o&panel=cliente')
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ puedeCrear: true }))
  })

  it('sin permiso para ver los leads dice por qué y no ofrece nada', () => {
    montar({ puedeVer: false })
    expect(screen.getByText('No puedes ver los leads.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('abre `?panel=cliente` y no monta el panel hasta que se abre', async () => {
    const { cambios } = montar()
    expect(panelMontado).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Selecciona un cliente/ }))
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?origen=o&panel=cliente'))
  })

  it('con la URL del panel le pasa al panel el elegido', () => {
    montar({ elegido: ELEGIDO }, '?origen=o&panel=cliente')
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ elegido: ELEGIDO }))
  })
})
