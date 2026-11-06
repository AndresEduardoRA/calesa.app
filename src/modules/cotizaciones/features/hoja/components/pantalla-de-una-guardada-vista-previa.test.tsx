import { cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecalculoInicial } from '../../../entities/apertura'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { hojaDeUnaGuardadaDesde } from '../../../entities/hoja-de-una-guardada-lectura'
import { crudaDeUnaGuardada } from '../../../entities/hoja-de-una-guardada.soporte'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import type { PropsDeLaVistaPrevia } from './huecos'
import { PantallaDeUnaGuardada } from './pantalla-de-una-guardada'
import { render } from './render-con-url.soporte'

vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: vi.fn() }) }))
vi.mock('../actions/guardar-cotizacion', () => ({ guardarCotizacion: {} }))
vi.mock('../../encima/actions/cotizar-encima', () => ({ cotizarEncima: {} }))

const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const llamadas: PropsDeLaVistaPrevia[] = []
const area = {
  dibujar: (props: PropsDeLaVistaPrevia): ReactNode => {
    llamadas.push(props)
    return null
  },
}

// Lo guardado: remate 1000 y total 2350 (la base de `crudaDeUnaGuardada`). Lo de hoy: el primer recálculo.
function montar(usdDeHoy: number, valoresDeHoy: Record<string, number | string | null>) {
  const hoja = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada())
  if (!hoja) {
    throw new Error('La hoja de prueba no se leyó.')
  }
  const inicial: RecalculoInicial = {
    respuesta: respuestaDePrueba({
      usd: usdDeHoy,
      valores: valoresDeHoy,
      estados: { remate: 'activo', total: 'activo' },
    }),
    estado: { tipo: 'al_dia' },
  }
  return render(
    <ContextoDeLaVistaPrevia value={area}>
      <PantallaDeUnaGuardada hoja={hoja} inicial={inicial} personaId={PERSONA} />
    </ContextoDeLaVistaPrevia>,
    '?panel=vista-previa',
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
  llamadas.length = 0
})
afterEach(cleanup)

describe('PantallaDeUnaGuardada: la vista previa dibuja lo guardado (P5 a)', () => {
  it('con lo de hoy distinto, la tarjeta lleva lo guardado y el aviso de que difiere', () => {
    montar(405, { remate: 2000, variante: 'gasolina', cuenta: 0, total: 405 })
    const p = llamadas.at(-1)
    expect(p?.calculo.totales.usd).toBe(2350)
    expect(p?.calculo.valores.get('remate')).toBe(1000)
    expect(p?.calculo.estados?.get('remate')).toBe('activo')
    expect(p?.estado).toBeNull()
    expect(p?.avisos).toEqual({ difiere: true, cambiosSinGuardar: false })
  })

  it('con lo de hoy igual, sin aviso', () => {
    montar(2350, { remate: 1000, variante: 'gasolina', cuenta: 0, total: 2350 })
    expect(llamadas.at(-1)?.avisos.difiere).toBe(false)
    expect(llamadas.at(-1)?.calculo.totales.usd).toBe(2350)
  })
})
