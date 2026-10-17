import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LEAD_QUE_NO_VES, type Relaciones } from '../../../entities/vinculo'
import { VinculoEInteresados } from './vinculo-e-interesados'

afterEach(cleanup)

const vinculo = (leadNombre: string | null, hasta: string | null = null) => ({
  leadId: leadNombre ?? 'oculto',
  leadNombre,
  leadNumeros: leadNombre
    ? { numero: 12, numeroPropio: null, creadorDelPropio: null }
    : { numero: null, numeroPropio: null, creadorDelPropio: null },
  desde: '2026-10-01T16:00:00+00:00',
  hasta,
  porNombre: 'Rosa Mamani',
})
const VACIO: Relaciones = {
  vinculo: null,
  historial: [],
  historialHayMas: false,
  interesados: [],
  interesadosHayMas: false,
}

describe('VinculoEInteresados', () => {
  it('sin vínculo ni interesados, lo dice', () => {
    render(<VinculoEInteresados relaciones={VACIO} />)
    expect(screen.getByText(/Sin vínculo: ningún lead es dueño/)).toBeInTheDocument()
    expect(screen.getByText(/Ninguno de los leads que ves mostró interés/)).toBeInTheDocument()
  })

  it('muestra el lead vinculado, desde cuándo y quién lo vinculó', () => {
    render(<VinculoEInteresados relaciones={{ ...VACIO, vinculo: vinculo('Ana Quispe') }} />)
    const region = within(screen.getByRole('region', { name: 'Vínculo' }))
    expect(region.getByText('Ana Quispe')).toBeInTheDocument()
    expect(region.getByText(/N\.º 12/)).toBeInTheDocument()
    expect(region.getByText(/^Desde el .* · lo vinculó Rosa Mamani$/)).toBeInTheDocument()
  })

  it('un lead que quien mira no ve no se nombra', () => {
    render(<VinculoEInteresados relaciones={{ ...VACIO, vinculo: vinculo(null) }} />)
    expect(screen.getByText(LEAD_QUE_NO_VES)).toBeInTheDocument()
    expect(screen.queryByText(/lead #/)).toBeNull()
  })

  it('lista los vínculos anteriores con su período', () => {
    const anterior = vinculo('Luis Rojas', '2026-10-05T16:00:00+00:00')
    render(<VinculoEInteresados relaciones={{ ...VACIO, historial: [anterior] }} />)
    const anteriores = within(screen.getByRole('list', { name: 'Vínculos anteriores' }))
    expect(anteriores.getByText('Luis Rojas')).toBeInTheDocument()
    expect(anteriores.getByText(/^Del .* al .*/)).toBeInTheDocument()
  })

  it('con más vínculos o interesados que el tope, lo dice al pie de cada uno (cierre 1)', () => {
    render(
      <VinculoEInteresados
        relaciones={{ ...VACIO, historialHayMas: true, interesadosHayMas: true }}
      />,
    )
    expect(screen.getByText('Mostrando los 50 vínculos más recientes.')).toBeInTheDocument()
    expect(screen.getByText('Mostrando los 100 interesados más recientes.')).toBeInTheDocument()
  })

  it('sin pasar el tope, no dice nada', () => {
    render(<VinculoEInteresados relaciones={VACIO} />)
    expect(screen.queryByText(/^Mostrando los/)).toBeNull()
  })

  it('lista los interesados con su nota', () => {
    const interesado = {
      leadId: 'a',
      leadNombre: 'Ana Quispe',
      leadNumeros: { numero: 12, numeroPropio: null, creadorDelPropio: null },
      nota: 'Lo quiere en blanco',
      creadoEn: '2026-10-05T16:00:00+00:00',
      porNombre: null,
    }
    render(<VinculoEInteresados relaciones={{ ...VACIO, interesados: [interesado] }} />)
    const region = within(screen.getByRole('region', { name: 'Interesados' }))
    expect(region.getByText('Lo quiere en blanco')).toBeInTheDocument()
    expect(region.queryByText(/lo marcó/)).toBeNull()
  })
})
