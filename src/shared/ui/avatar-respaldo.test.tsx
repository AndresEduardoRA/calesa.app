import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Avatar } from './avatar'

afterEach(cleanup)

describe('Avatar', () => {
  it('una foto que no carga cae a las iniciales (cierre 1)', () => {
    render(<Avatar nombre="Ana Quispe" url="https://ejemplo.test/rota.webp" />)
    fireEvent.error(screen.getByRole('img', { name: 'Ana Quispe' }))
    expect(screen.getByRole('img', { name: 'Ana Quispe' }).textContent).toBe('AQ')
  })

  it('sin foto, las iniciales', () => {
    render(<Avatar nombre="Rosa Mamani" url={null} />)
    expect(screen.getByRole('img', { name: 'Rosa Mamani' }).textContent).toBe('RM')
  })
})
