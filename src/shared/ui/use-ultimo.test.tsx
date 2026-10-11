import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useUltimo } from './use-ultimo'

function Panel({ nombre }: { nombre: string | null }) {
  const mostrado = useUltimo(nombre)
  return <p aria-label="panel">{mostrado ?? 'vacío'}</p>
}

describe('useUltimo', () => {
  it('conserva el último dato cuando el panel se cierra', () => {
    const { rerender } = render(<Panel nombre={null} />)
    expect(screen.getByLabelText('panel').textContent).toBe('vacío')
    rerender(<Panel nombre="Sofía" />)
    expect(screen.getByLabelText('panel').textContent).toBe('Sofía')
    rerender(<Panel nombre={null} />)
    expect(screen.getByLabelText('panel').textContent).toBe('Sofía')
    rerender(<Panel nombre="Rosa" />)
    expect(screen.getByLabelText('panel').textContent).toBe('Rosa')
  })
})
