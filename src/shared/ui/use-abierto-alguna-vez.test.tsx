import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAbiertoAlgunaVez } from './use-abierto-alguna-vez'

function Panel({ abierto }: { abierto: boolean }) {
  return <p aria-label="panel">{useAbiertoAlgunaVez(abierto) ? 'montado' : 'sin montar'}</p>
}

afterEach(cleanup)

describe('useAbiertoAlgunaVez', () => {
  it('no monta hasta la primera apertura y después queda montado', () => {
    const { rerender } = render(<Panel abierto={false} />)
    expect(screen.getByLabelText('panel').textContent).toBe('sin montar')
    rerender(<Panel abierto />)
    expect(screen.getByLabelText('panel').textContent).toBe('montado')
    rerender(<Panel abierto={false} />)
    expect(screen.getByLabelText('panel').textContent).toBe('montado')
  })

  it('abierto desde el principio (la URL ya lo pide), se monta enseguida', () => {
    render(<Panel abierto />)
    expect(screen.getByLabelText('panel').textContent).toBe('montado')
  })
})
