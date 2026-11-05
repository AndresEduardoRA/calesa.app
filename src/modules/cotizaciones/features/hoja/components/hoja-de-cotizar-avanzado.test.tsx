import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

const secciones = () =>
  [...document.querySelectorAll('[data-seccion]')].map((e) => e.getAttribute('data-seccion'))

beforeEach(() => {
  window.sessionStorage.clear()
})
afterEach(cleanup)

describe('HojaDeCotizar: «Avanzado» es un modal', () => {
  it('la hoja no dibuja las secciones avanzadas: en su lugar va un botón «Avanzado» con los títulos de lo que esconde', () => {
    montar()
    expect(secciones()).toEqual(['a', 'b'])
    const boton = screen.getByRole('button', { name: /Avanzado/ })
    expect(boton.textContent).toContain('Componentes CIF · Póliza')
    // El botón va entre las dos principales, donde estaba la primera avanzada.
    const dom = [...document.querySelectorAll('[data-seccion], [data-avanzado]')].map(
      (e) => e.getAttribute('data-seccion') ?? 'avanzado',
    )
    expect(dom).toEqual(['a', 'avanzado', 'b'])
  })

  it('al abrirlo, sus secciones salen en el orden declarado con sus celdas', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Avanzado/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Avanzado' })
    const dentro = [...dialogo.querySelectorAll('[data-seccion]')].map((e) =>
      e.getAttribute('data-seccion'),
    )
    expect(dentro).toEqual(['x', 'y'])
    expect(dialogo.querySelector('[data-nodo="x1"]')).not.toBeNull()
    expect(dialogo.querySelector('[data-nodo="y1"]')).not.toBeNull()
  })

  it('recargar con ?panel=avanzado lo abre', async () => {
    montar('?panel=avanzado')
    expect(await screen.findByRole('dialog', { name: 'Avanzado' })).toBeTruthy()
  })

  it('mientras guarda, el modal no se cierra con Esc', async () => {
    const guardando: Guardado = {
      ...QUIETO,
      estado: { tipo: 'guardando' },
      ocupado: true,
    }
    montar('?panel=avanzado', guardando)
    const dialogo = await screen.findByRole('dialog', { name: 'Avanzado' })
    fireEvent.keyDown(dialogo, { key: 'Escape' })
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('dialog', { name: 'Avanzado' })).not.toBeNull()
  })
})
