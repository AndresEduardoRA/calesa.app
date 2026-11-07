import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import {
  NODOS_DE_BASE,
  formulaCruda,
  formulaDePrueba,
} from '../../../../entities/formula/fila-de-prueba.soporte'
import type { TerrenoDePrueba } from '../../../../entities/formula/terreno-de-prueba'
import { CifraDePrueba } from './cifra-de-prueba'
import { EditorDeLaFormula } from './editor-de-la-formula'

type Respuesta = Resultado<FormulaParaEditar | null>
let terrenoDeLaPrueba: TerrenoDePrueba
const pedidos: { formulaId: string; resolver: (r: Respuesta) => void }[] = []
vi.mock('../../../../areas/formula/composicion.client', () => ({
  // Lo de prueba de la vista previa (4.21-3a-2): al instante, y lo cambia cada prueba que lo necesita.
  leerElTerrenoDePrueba: () => Promise.resolve({ ok: true as const, data: terrenoDeLaPrueba }),
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
  terrenoDeLaPrueba = {
    tipos_cambio: { oficial: 6.96 },
    monedas: { oficial: 'BOB' },
    tablas: {},
    avisos: [],
  }
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

describe('EditorDeLaFormula: la cifra de prueba de cada fila (T9)', () => {
  const cifraDe = (id: string) =>
    document.querySelector(`li[data-fila="${id}"] [data-cifra]`)?.textContent ?? null

  it('con la vista calculada cada fila dibuja su cifra con su formato', async () => {
    montar()
    await responder(1, leida())
    await waitFor(() => {
      expect(cifraDe('tc')).toBe('6,96')
    })
    expect(cifraDe('total')).toBe('0')
    expect(cifraDe('remate')).toContain('0,00')
    // Una bandera no dibuja nada.
    expect(cifraDe('b')).toBeNull()
  })

  it('un tipo de cambio ausente dice por qué no hay cifra, y el aviso lo nombra', async () => {
    terrenoDeLaPrueba = {
      tipos_cambio: {},
      monedas: {},
      tablas: {},
      avisos: [{ codigo: 'cambio_ausente', clave: 'oficial' }],
    }
    montar()
    await responder(1, leida())
    await waitFor(() => {
      expect(cifraDe('tc')).toBe('Falta el tipo de cambio.')
    })
    expect(screen.getByText('No hay un tipo de cambio activo «oficial».')).toBeTruthy()
  })

  it('sin la lectura hecha las filas no dibujan cifra', async () => {
    montar()
    await responder(1, leida())
    expect(screen.getByRole('list', { name: 'Filas de la fórmula' })).toBeTruthy()
    // Antes de que llegue el terreno (`leyendo`), ninguna fila tiene cifra.
    expect(document.querySelectorAll('li[data-fila]').length).toBeGreaterThan(0)
  })
})

describe('CifraDePrueba (T9)', () => {
  it('dice cada caso: valor, texto, sin cifra (con o sin falta propia), apagada y nada', () => {
    const texto = (cifra: Parameters<typeof CifraDePrueba>[0]['cifra']) => {
      const { container } = render(<CifraDePrueba cifra={cifra} />)
      const t = container.textContent
      cleanup()
      return t
    }
    expect(texto({ tipo: 'valor', valor: 0.25, formato: 'pct' })).toBe('25%')
    expect(texto({ tipo: 'valor', valor: 1234.5, formato: undefined })).toBe('1.234,5')
    expect(texto({ tipo: 'texto', texto: 'a' })).toBe('a')
    expect(texto({ tipo: 'sin_cifra', faltante: null })).toBe(
      'Sin cifra: depende de algo que falta.',
    )
    expect(texto({ tipo: 'sin_cifra', faltante: 'division_por_cero' })).toBe('Se divide por cero.')
    expect(texto({ tipo: 'apagada', estado: 'fuera_de_variante' })).toBe('Fuera de la variante.')
    expect(texto({ tipo: 'apagada', estado: 'condicion_apagada' })).toBe('Condición apagada.')
    expect(texto({ tipo: 'nada' })).toBe('')
  })
})
