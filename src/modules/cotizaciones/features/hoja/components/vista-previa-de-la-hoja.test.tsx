import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculoDePrueba } from '../../../entities/calculo-de-la-tarjeta.soporte'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import type { PropsDeLaVistaPrevia } from './huecos'
import { VistaPreviaDeLaHoja } from './vista-previa-de-la-hoja'

const FORMULA = '00000000-0000-4000-8000-0000000000aa'
const llamadas: PropsDeLaVistaPrevia[] = []
const area = {
  dibujar: (props: PropsDeLaVistaPrevia): ReactNode => {
    llamadas.push(props)
    return <div data-vista-previa-espia={String(props.abierta)} />
  },
}

const montar = (conArea: boolean, busqueda = '') => {
  const alActualizar = vi.fn<OnUrlUpdateFunction>()
  const vista = (
    <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={alActualizar}>
      <VistaPreviaDeLaHoja
        formulaId={FORMULA}
        calculo={calculoDePrueba()}
        estado={{ tipo: 'al_dia' }}
        monedaBs="BOB"
        avisos={{ difiere: false, cambiosSinGuardar: false }}
      />
    </NuqsTestingAdapter>
  )
  const salida = render(
    conArea ? <ContextoDeLaVistaPrevia value={area}>{vista}</ContextoDeLaVistaPrevia> : vista,
  )
  return { ...salida, alActualizar }
}

beforeEach(() => {
  llamadas.length = 0
})
afterEach(cleanup)

describe('<VistaPreviaDeLaHoja>: el botón del resumen', () => {
  it('sin proveedor del área no dibuja nada: ni botón ni nodos', () => {
    const { container } = montar(false)
    expect(container.innerHTML).toBe('')
  })

  it('con el hueco dibuja «Vista previa» y no monta el modal hasta abrirlo', () => {
    montar(true)
    expect(screen.getByRole('button', { name: 'Vista previa' })).toBeTruthy()
    expect(llamadas).toHaveLength(0)
  })

  it('abrirlo escribe ?panel=vista-previa y monta el modal con la versión y el cálculo', async () => {
    const { alActualizar } = montar(true)
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }))
    await vi.waitFor(() => {
      expect(alActualizar).toHaveBeenCalled()
    })
    expect(alActualizar.mock.calls.at(-1)?.[0].searchParams.get('panel')).toBe('vista-previa')
    const abierta = llamadas.at(-1)
    expect(abierta?.abierta).toBe(true)
    expect(abierta?.formulaId).toBe(FORMULA)
    expect(abierta?.calculo.totales.usd).toBe(1355)
    expect(abierta?.monedaBs).toBe('BOB')
  })

  it('recargar con ?panel=vista-previa lo abre; con otro panel, no lo monta', () => {
    montar(true, '?panel=vista-previa')
    expect(llamadas.at(-1)?.abierta).toBe(true)
    cleanup()
    llamadas.length = 0
    montar(true, '?panel=avanzado')
    expect(llamadas).toHaveLength(0)
  })

  it('cerrar desde el modal quita el panel de la URL', async () => {
    const { alActualizar } = montar(true, '?panel=vista-previa')
    llamadas.at(-1)?.cerrar()
    await vi.waitFor(() => {
      expect(alActualizar).toHaveBeenCalled()
    })
    expect(alActualizar.mock.calls.at(-1)?.[0].searchParams.get('panel')).toBeNull()
  })
})
