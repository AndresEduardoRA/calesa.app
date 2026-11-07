import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContextoDePlantilla } from '../../../entities/plantilla/validar-plantilla'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import { EditorDeLaPlantilla } from './editor-de-la-plantilla'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
const guardarBorrador = vi.fn()
vi.mock('../actions/guardar-borrador', () => ({
  guardarBorrador: (entrada: unknown) => guardarBorrador(entrada) as Promise<unknown>,
}))
vi.mock('@/shared/ui/toasts', () => ({ avisarExito: vi.fn(), avisar: vi.fn() }))

const HORA = '2026-11-07T15:00:00.123456+00:00'
const nodos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `n${i}`, etiqueta: `Nodo ${i}`, grupo: 'compra' }))
const contextoCon = (n: number): ContextoDePlantilla => ({
  definicion: {
    nodos: [...nodos(n), { id: 'total', etiqueta: 'TOTAL', salida: 'total' }],
    grupos: [
      { id: 'compra', etiqueta: 'Compra', tono: 'verde' },
      { id: 'aduana', etiqueta: 'Aduana', tono: 'naranja' },
    ],
  },
  diseno: null,
  visibilidad: Object.fromEntries([
    ...nodos(n).map((x) => [x.id, { ver: 'todos' }]),
    ['total', { ver: 'todos' }],
  ]),
  tonos: ['verde', 'naranja'],
})
const props = (extra: Partial<PropsDelEditor> = {}, n = 2): PropsDelEditor => ({
  origen: { id: 'o', nombre: 'Origen' },
  esperada: HORA,
  inicial: {
    grupos: [{ grupo: 'compra' }, { grupo: 'aduana' }],
    total: { etiqueta: 'TOTAL' },
    logo: true,
    columnas: { leyenda: false, plazo: false, tipo_cambio: false },
  },
  de: 'borrador',
  avisos: [],
  contexto: contextoCon(n),
  tonos: [
    { clave: 'verde', nombre: 'Verde' },
    { clave: 'naranja', nombre: 'Naranja' },
  ],
  publicada: null,
  guardada: {
    grupos: [{ grupo: 'compra' }, { grupo: 'aduana' }],
    total: { etiqueta: 'TOTAL' },
    logo: true,
    columnas: { leyenda: false, plazo: false, tipo_cambio: false },
  },
  ...extra,
})

const escribir = (campo: HTMLElement, valor: string) => {
  fireEvent.change(campo, { target: { value: valor } })
}
const pulsar = (boton: HTMLElement) => {
  act(() => {
    fireEvent.click(boton)
  })
}

afterEach(cleanup)

beforeEach(() => {
  guardarBorrador.mockReset()
  window.sessionStorage.clear()
})

describe('EditorDeLaPlantilla', () => {
  it('dibuja los bloques con sus campos y «Guardar» apagado sin cambios', () => {
    render(<EditorDeLaPlantilla {...props()} />)
    expect(screen.getByText('Tarjeta de Origen')).toBeTruthy()
    for (const titulo of ['Grupos', 'Total', 'Filas', 'Pie y columnas'])
      expect(screen.getAllByText(titulo, { selector: 'summary *' }).length).toBeGreaterThan(0)
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(screen.getByLabelText('Etiqueta del total')).toBeTruthy()
    expect(screen.getByLabelText('Tono de «Compra»')).toBeTruthy()
  })

  it('el contador cuenta emojis como uno y ningún campo lleva maxLength', () => {
    render(<EditorDeLaPlantilla {...props()} />)
    const campo = screen.getByLabelText('Etiqueta del total')
    escribir(campo, '')
    escribir(campo, '😀😀😀')
    expect(screen.getByText('3 de 40')).toBeTruthy()
    for (const c of document.querySelectorAll('input, textarea'))
      expect(c.hasAttribute('maxlength')).toBe(false)
  })

  it('un tono ya no existente sale seleccionado como «<clave> (ya no está)» y el aviso lo nombra', () => {
    const p = props()
    render(
      <EditorDeLaPlantilla
        {...p}
        inicial={{ ...p.inicial, grupos: [{ grupo: 'compra', tono: 'rojo' }, { grupo: 'aduana' }] }}
        guardada={null}
      />,
    )
    expect((screen.getByLabelText('Tono de «Compra»') as HTMLSelectElement).value).toBe('rojo')
    expect(screen.getByText('rojo (ya no está)')).toBeTruthy()
    expect(
      screen.getByText(/El tono «rojo» del grupo «Compra» ya no está en el catálogo/),
    ).toBeTruthy()
  })

  it('un rechazo de forma sale junto a su campo, con el bloque abierto, y apaga «Guardar»', () => {
    render(<EditorDeLaPlantilla {...props()} />)
    const campo = screen.getByLabelText('Etiqueta del total')
    escribir(campo, '')
    expect(screen.getByText('El total lleva de 1 a 40 caracteres.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  it('el motivo de porCampo de la action va junto a su campo y el foco al primero', async () => {
    guardarBorrador.mockResolvedValue({
      data: {
        ok: false,
        error: { codigo: 'validacion', mensaje: 'No se pudo.' },
        porCampo: { nota: 'Hay un carácter que no se puede guardar.' },
      },
    })
    render(<EditorDeLaPlantilla {...props()} />)
    escribir(screen.getByLabelText('Nota de la tarjeta'), 'x')
    pulsar(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Hay un carácter que no se puede guardar.')).toBeTruthy()
    expect(document.activeElement?.getAttribute('data-campo')).toBe('nota')
  })

  it('con más de 500 filas muestra 500 con el aviso, y «Buscar fila» halla la que el tope dejaba fuera', () => {
    render(<EditorDeLaPlantilla {...props({}, 600)} />)
    pulsar(screen.getByText('Filas', { selector: 'summary *' }))
    expect(screen.getByText(/Se muestran las 500 primeras filas/)).toBeTruthy()
    expect(screen.queryByLabelText('Etiqueta de «Nodo 599»')).toBeNull()
    escribir(screen.getByLabelText('Buscar fila'), 'nodo 599')
    expect(screen.getByLabelText('Etiqueta de «Nodo 599»')).toBeTruthy()
    expect(screen.queryByText(/Se muestran las 500 primeras filas/)).toBeNull()
    escribir(screen.getByLabelText('Buscar fila'), '')
    escribir(screen.getByLabelText('Buscar fila'), 'no existe')
    expect(screen.getByText('Ninguna fila coincide con «no existe».')).toBeTruthy()
  })

  it('«Buscar fila» no cuenta como cambio ni envía con Enter', () => {
    render(<EditorDeLaPlantilla {...props()} />)
    fireEvent.keyDown(screen.getByLabelText('Buscar fila'), { key: 'Enter' })
    expect(guardarBorrador).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
})
