import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecalculoInicial } from '../../../entities/apertura'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { calculoDePrueba } from '../../../entities/calculo-de-la-tarjeta.soporte'
import { HojaDeCotizar } from './hoja-de-cotizar'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import type { PropsDeLaVistaPrevia } from './huecos'

vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const llamadas: PropsDeLaVistaPrevia[] = []
const area = {
  dibujar: (props: PropsDeLaVistaPrevia): ReactNode => {
    llamadas.push(props)
    return null
  },
}

const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ valores: { total: 321 }, usd: 321 }),
  estado: { tipo: 'al_dia' },
}

function montar(
  {
    conArea = true,
    soloLectura = false,
    deLoGuardado,
  }: {
    conArea?: boolean
    soloLectura?: boolean
    deLoGuardado?: { calculo: CalculoDeLaTarjeta; difiere: boolean }
  } = {},
  busqueda = '',
) {
  const hoja = (
    <NuqsTestingAdapter searchParams={busqueda}>
      <HojaDeCotizar
        hoja={hojaDePrueba()}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={null}
        guardado={null}
        soloLectura={soloLectura}
        {...(deLoGuardado ? { deLoGuardado } : {})}
      />
    </NuqsTestingAdapter>
  )
  return render(
    conArea ? <ContextoDeLaVistaPrevia value={area}>{hoja}</ContextoDeLaVistaPrevia> : hoja,
  )
}

const nodosDeLaHoja = () => document.querySelector('[data-hoja]')?.querySelectorAll('*').length ?? 0

beforeEach(() => {
  window.sessionStorage.clear()
  llamadas.length = 0
})
afterEach(cleanup)

describe('HojaDeCotizar: «Vista previa» en el pie del resumen', () => {
  it('sin proveedor no hay botón y el botón es un solo nodo más con él', () => {
    montar({ conArea: false })
    expect(screen.queryByRole('button', { name: 'Vista previa' })).toBeNull()
    const sin = nodosDeLaHoja()
    cleanup()
    montar()
    expect(screen.getByRole('button', { name: 'Vista previa' })).toBeTruthy()
    expect(nodosDeLaHoja()).toBe(sin + 1)
  })

  it('la hoja nueva dibuja lo que la hoja calcula ahora, con su estado y sin avisos', () => {
    montar({}, '?panel=vista-previa')
    const p = llamadas.at(-1)
    expect(p?.calculo.totales.usd).toBe(321)
    expect(p?.calculo.valores.get('total')).toBe(321)
    expect(p?.estado).toEqual({ tipo: 'al_dia' })
    expect(p?.avisos).toEqual({ difiere: false, cambiosSinGuardar: false })
    expect(p?.formulaId).toBe(hojaDePrueba().formula.id)
  })

  it('con calculoDeLaTarjeta, ése y los avisos (sin estado: lo guardado no se desactualiza)', () => {
    const guardado = calculoDePrueba({ totales: { usd: 205, bs: null } })
    montar({ deLoGuardado: { calculo: guardado, difiere: true } }, '?panel=vista-previa')
    const p = llamadas.at(-1)
    expect(p?.calculo).toBe(guardado)
    expect(p?.calculo.totales.usd).toBe(205)
    expect(p?.estado).toBeNull()
    expect(p?.avisos.difiere).toBe(true)
  })

  it('quien sólo ve la cotización también tiene el botón: ver la tarjeta no es guardar', () => {
    montar({ soloLectura: true })
    expect(screen.getByRole('button', { name: 'Vista previa' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }))
  })
})
