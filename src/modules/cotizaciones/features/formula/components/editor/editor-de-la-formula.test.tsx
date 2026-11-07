import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import {
  NODOS_DE_BASE,
  formulaCruda,
  formulaDePrueba,
} from '../../../../entities/formula/fila-de-prueba.soporte'
import { EditorDeLaFormula } from './editor-de-la-formula'

type Respuesta = Resultado<FormulaParaEditar | null>
const pedidos: { formulaId: string; resolver: (r: Respuesta) => void }[] = []
vi.mock('../../../../areas/formula/composicion.client', () => ({
  leerDefinicionParaEditar: (pedido: { formulaId: string }) =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push({ ...pedido, resolver })
    }),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn() }))

const ORIGEN = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Japón' }
const FORMULA = '22222222-2222-4222-8222-222222222222'
const leida = (
  formula = formulaDePrueba([{ id: 'total', texto: '=remate+fees', etiqueta: 'Total' }]),
): Respuesta => ({
  ok: true,
  data: { id: FORMULA, actualizadoEn: '2026-11-07T15:00:00.123456+00:00', formula },
})

const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  await act(async () => {
    pedidos[n - 1]?.resolver(r)
    await Promise.resolve()
  })
}

const montar = (alVolver = vi.fn()) =>
  render(
    <EditorDeLaFormula
      origen={ORIGEN}
      formulaId={FORMULA}
      sobre="Sobre la versión 3 publicada."
      alVolver={alVolver}
    />,
  )

beforeEach(() => {
  pedidos.length = 0
  window.sessionStorage.clear()
})
afterEach(cleanup)

describe('EditorDeLaFormula: la lectura (T4)', () => {
  it('lee la versión pedida; mientras, el esqueleto', async () => {
    montar()
    expect(screen.getByRole('heading', { name: 'Editar la fórmula de Japón' })).toBeTruthy()
    expect(screen.getByText('Sobre la versión 3 publicada.')).toBeTruthy()
    expect(screen.getByLabelText('Cargando la lista')).toBeTruthy()
    await responder(1, leida())
    expect(pedidos.map((p) => p.formulaId)).toEqual([FORMULA])
    expect(screen.queryByLabelText('Cargando la lista')).toBeNull()
    expect(screen.getByRole('list', { name: 'Filas de la fórmula' })).toBeTruthy()
  })

  it('si falla, «Reintentar» vuelve a leer', async () => {
    montar()
    await responder(1, { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await responder(2, leida())
    expect(screen.getByRole('list', { name: 'Filas de la fórmula' })).toBeTruthy()
  })

  it('si la fila no vuelve, lo dice sin nombrar a otra persona y ofrece volver', async () => {
    const alVolver = vi.fn()
    montar(alVolver)
    await responder(1, { ok: true, data: null })
    expect(
      screen.getByText(
        'Esa versión de la fórmula ya no se puede abrir: se descartó o ya no configuras Japón.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la fórmula' }))
    expect(alVolver).toHaveBeenCalledTimes(1)
  })
})

describe('EditorDeLaFormula: las filas (T4)', () => {
  it('una fila que no es cálculo ni constante no tiene «Editar»; una con texto, sí', async () => {
    montar()
    await responder(1, leida())
    expect(screen.queryByRole('button', { name: 'Editar Tipo de cambio' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar Remate' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Editar Total' })).toBeTruthy()
    expect(screen.getByText('=remate+fees')).toBeTruthy()
  })

  it('una fila sin texto posible se muestra por sus campos, con su «Editar»', async () => {
    const formula = formulaCruda(
      [
        ...NODOS_DE_BASE,
        { id: 'antes', tipo: 'calculo', op: 'suma', de: ['despues'], etiqueta: 'Antes' },
        { id: 'despues', tipo: 'constante', etiqueta: 'Después', salida: 'total', bucket: 'b' },
      ],
      { despues: 7 },
    )
    montar()
    await responder(1, leida(formula))
    expect(screen.getByText(/Calcula: suma de/).textContent).toBe('Calcula: suma de despues')
    expect(screen.getByRole('button', { name: 'Editar Antes' })).toBeTruthy()
  })

  it('abrir una fila apaga los demás «Editar»; el texto abre con el de la fila', async () => {
    montar()
    await responder(
      1,
      leida(
        formulaDePrueba([
          { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
          { id: 'total', texto: '=base*2', etiqueta: 'Total' },
        ]),
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Editar Base' }))
    expect(
      (screen.getByRole('textbox', { name: 'Texto de Base' }) as HTMLTextAreaElement).value,
    ).toBe('=remate+fees')
    expect(
      (screen.getByRole('button', { name: 'Editar Total' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('«Buscar fila» sin coincidencias: el vacío por filtro, con su descripción y sin «Limpiar filtros»', async () => {
    montar()
    await responder(1, leida())
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar fila' }), {
      target: { value: 'zzz' },
    })
    expect(screen.getByText('Nada coincide con los filtros')).toBeTruthy()
    expect(
      screen.getByText('Ninguna fila tiene «zzz» en el nombre ni en la etiqueta.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull()
  })
})
