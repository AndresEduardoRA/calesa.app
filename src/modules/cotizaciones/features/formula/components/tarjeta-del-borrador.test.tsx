import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TarjetaDelBorrador } from './tarjeta-del-borrador'

afterEach(cleanup)

const V2 = '00000000-0000-4000-8000-000000000002'
const V3 = '00000000-0000-4000-8000-000000000003'
const borrador = (versionOrigenId: string | null, versionDeOrigen: number | null) => ({
  id: '00000000-0000-4000-8000-000000000050',
  nota: 'Subo el flete',
  creadoPor: null,
  actualizadoEn: new Date().toISOString(),
  versionOrigenId,
  versionDeOrigen,
  autor: 'Ana Pérez',
})

describe('TarjetaDelBorrador', () => {
  it('dice de quién es, cuándo se guardó y sobre qué versión empezó', () => {
    render(<TarjetaDelBorrador borrador={borrador(V3, 3)} publicada={{ id: V3, version: 3 }} />)
    expect(screen.getByRole('heading').textContent).toMatch(/^Borrador de Ana Pérez · guardado /)
    expect(screen.getByText('Subo el flete')).toBeTruthy()
    expect(screen.getByText('Empezó sobre la versión 3.')).toBeTruthy()
    expect(screen.queryByText(/publicarlo dará conflicto/)).toBeNull()
  })

  it('atrasado: se publicó otra después de que empezó', () => {
    render(<TarjetaDelBorrador borrador={borrador(V2, 2)} publicada={{ id: V3, version: 3 }} />)
    expect(
      screen.getByText(
        'Después de que empezó, se publicó la versión 3: publicarlo dará conflicto.',
      ),
    ).toBeTruthy()
  })

  it('sin versión de origen no dice sobre cuál empezó ni que está atrasado', () => {
    render(
      <TarjetaDelBorrador borrador={borrador(null, null)} publicada={{ id: V3, version: 3 }} />,
    )
    expect(screen.queryByText(/Empezó sobre/)).toBeNull()
    expect(screen.queryByText(/publicarlo dará conflicto/)).toBeNull()
  })
})
