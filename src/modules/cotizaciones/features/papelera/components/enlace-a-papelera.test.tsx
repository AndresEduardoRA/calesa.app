import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { HUECOS_DE_PAPELERA_EN_EL_LISTADO } from './huecos-en-el-listado'

afterEach(cleanup)

const con = (...claves: string[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const })) as Permisos

function dibujar(permisos: Permisos) {
  const { Junto } = HUECOS_DE_PAPELERA_EN_EL_LISTADO
  if (!Junto) {
    throw new Error('El área papelera no llena `Junto`')
  }
  return render(<Junto permisos={permisos} />)
}

describe('el enlace a la papelera junto a «Nueva cotización»', () => {
  it('lleva «Papelera» a la papelera de cotizaciones a quien puede enviar', () => {
    dibujar(con('cotizaciones.editar'))
    expect(screen.getByRole('link', { name: 'Papelera' }).getAttribute('href')).toBe(
      '/cotizaciones/papelera',
    )
  })

  it('también a quien puede vaciarla', () => {
    dibujar(con('cotizaciones.papelera.purgar'))
    expect(screen.getByRole('link', { name: 'Papelera' })).toBeTruthy()
  })

  it('a quien modera o gestiona finales', () => {
    dibujar(con('cotizaciones.moderar'))
    expect(screen.getByRole('link', { name: 'Papelera' })).toBeTruthy()
    cleanup()
    dibujar(con('cotizaciones.final.gestionar'))
    expect(screen.getByRole('link', { name: 'Papelera' })).toBeTruthy()
  })

  it('no a quien sólo ve o crea', () => {
    const { container } = dibujar(con('cotizaciones.ver', 'cotizaciones.crear'))
    expect(screen.queryByRole('link', { name: 'Papelera' })).toBeNull()
    expect(container.textContent).toBe('')
  })
})
