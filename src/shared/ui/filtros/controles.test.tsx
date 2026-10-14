import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DefFiltro } from '@/shared/lib/filtros'
import { FiltroDeOpciones } from './controles'

afterEach(cleanup)

const opciones = (cuantas: number) =>
  Array.from({ length: cuantas }, (_, i) => ({ valor: `v${i}`, etiqueta: `Ciudad ${i}` }))

const def = (cuantas: number): Extract<DefFiltro, { tipo: 'opciones' }> => ({
  tipo: 'opciones',
  clave: 'a.ciudad',
  etiqueta: 'Ciudad',
  opciones: opciones(cuantas),
})

describe('FiltroDeOpciones', () => {
  it('con pocas opciones no ofrece buscar', () => {
    render(<FiltroDeOpciones def={def(5)} valor={null} alCambiar={vi.fn()} />)
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  })

  it('con muchas opciones se busca dentro y sólo quedan las que coinciden', () => {
    render(<FiltroDeOpciones def={def(60)} valor={null} alCambiar={vi.fn()} />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar en Ciudad' }), {
      target: { value: 'ciudad 5' },
    })
    // «Ciudad 5», y «Ciudad 50» a «Ciudad 59».
    expect(screen.getAllByRole('checkbox')).toHaveLength(11)
  })

  it('sin coincidencias lo dice, y elegir una opción filtrada avisa el valor', () => {
    const alCambiar = vi.fn()
    render(<FiltroDeOpciones def={def(60)} valor={null} alCambiar={alCambiar} />)
    const caja = screen.getByRole('searchbox')
    fireEvent.change(caja, { target: { value: 'zzz' } })
    expect(screen.getByRole('status').textContent).toBe('Ninguna opción coincide.')
    fireEvent.change(caja, { target: { value: 'ciudad 42' } })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(alCambiar).toHaveBeenCalledWith({ tipo: 'opciones', valores: ['v42'] })
  })
})
