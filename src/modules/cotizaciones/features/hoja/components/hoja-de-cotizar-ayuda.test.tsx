import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDesde, type HojaLista } from '../../../entities/hoja'
import { crudaDeLaHoja, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { Guardado } from '../hooks/use-guardado'
import { HojaDeCotizar } from './hoja-de-cotizar'

vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const QUIETO: Guardado = {
  estado: { tipo: 'listo' },
  enLinea: true,
  hayPendiente: false,
  ocupado: false,
  guardar: () => {},
  guardarConLaAbierta: () => {},
  olvidarAviso: () => {},
  reiniciar: () => {},
}

const celda = (nodo: string, mas: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  etiqueta: nodo.toUpperCase(),
  tipo_nodo: 'input',
  ajustes: false,
  ancho: 'completo',
  formato: 'usd',
  editable: true,
  ...mas,
})

// Principal, avanzada, principal, avanzada: «Avanzado» va donde estaba la primera, con las dos adentro.
function hojaDeAvanzado(): HojaLista {
  const hoja = hojaDesde({
    ...crudaDeLaHoja(),
    secciones: [
      { id: 'a', titulo: 'Subasta', presentacion: 'principal', items: [celda('a1')] },
      {
        id: 'x',
        titulo: 'Componentes CIF',
        presentacion: 'avanzado',
        items: [celda('x1', { ayuda: { texto: 'Cómo se usa x1' } })],
      },
      {
        id: 'b',
        titulo: 'Aduana',
        presentacion: 'principal',
        items: [
          celda('b1', { ayuda: { texto: 'Cómo se usa b1' } }),
          celda('b2', { ayuda: { tabla: 'aduana' } }),
        ],
      },
      { id: 'y', titulo: 'Póliza', presentacion: 'avanzado', items: [celda('y1')] },
    ],
  })
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}

const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ valores: { a1: 1, x1: 2, b1: 3, b2: 4, y1: 5 } }),
  estado: { tipo: 'al_dia' },
}

const montar = (busqueda = '', guardado: Guardado = QUIETO) =>
  render(
    <NuqsTestingAdapter searchParams={busqueda}>
      <HojaDeCotizar
        hoja={hojaDeAvanzado()}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={null}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={guardado}
      />
    </NuqsTestingAdapter>,
  )

beforeEach(() => {
  window.sessionStorage.clear()
})
afterEach(cleanup)

describe('HojaDeCotizar: la ayuda de texto', () => {
  it('una celda con ayuda de texto tiene «Ayuda de X» y abre el texto', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda de B1' }))
    const panel = await screen.findByRole('dialog', { name: 'Ayuda de B1' })
    expect(within(panel).getByText('Cómo se usa b1')).toBeTruthy()
  })

  it('una celda con ayuda de tabla tiene su botón y una sin ayuda no', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Ayuda de B2' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ayuda de A1' })).toBeNull()
  })

  it('?ayuda=texto&nodo= abre la ayuda de una celda de la hoja; un nodo que no se dibuja no abre nada', async () => {
    montar('?ayuda=texto&nodo=b1')
    expect(await screen.findByRole('dialog', { name: 'Ayuda de B1' })).toBeTruthy()
    cleanup()
    montar('?ayuda=texto&nodo=x1')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(screen.queryByText('Cómo se usa x1')).toBeNull()
  })
})
