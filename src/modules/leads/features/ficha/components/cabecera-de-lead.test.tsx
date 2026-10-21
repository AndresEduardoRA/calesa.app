import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { LeadDeFicha } from '../../../entities/ficha'
import { CabeceraDeLead } from './cabecera-de-lead'

afterEach(cleanup)

const ficha = {
  id: 'l-1',
  nombre: 'Ana Prieto',
  numeros: { numero: 12, numeroPropio: null, creadorDelPropio: null },
  telefono: '+591 ••••••04',
  telefonoCc: null,
} as unknown as LeadDeFicha

describe('CabeceraDeLead: el origen apagado', () => {
  it('se lee «Facebook (inactivo)» de corrido: el espacio es texto y no sólo el hueco entre cajas', () => {
    const { container } = render(
      <CabeceraDeLead
        ficha={ficha}
        origen={{ nombre: 'Facebook', activo: false, icono: 'compartir' }}
        tipo={null}
        quien={null}
      />,
    )
    expect(container.textContent).toContain('Facebook (inactivo)')
  })

  it('uno activo no lleva marca', () => {
    const { container } = render(
      <CabeceraDeLead
        ficha={ficha}
        origen={{ nombre: 'Facebook', activo: true, icono: null }}
        tipo={null}
        quien={null}
      />,
    )
    expect(container.textContent).toContain('Facebook')
    expect(container.textContent).not.toContain('(inactivo)')
  })
})
