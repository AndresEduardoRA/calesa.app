import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import { PestanaDeLaTarjeta } from './pestana-de-la-tarjeta'

// El editor y el modal se sustituyen por cáscaras con estado propio: lo que se prueba es qué se remonta y qué no.
const montajes = { editor: 0, modal: 0 }
vi.mock('./diferidos', async () => {
  const { useEffect, useState } = await import('react')
  return {
    EditorDeLaPlantillaDiferido: (p: { esperada: string | null; alPublicar: () => void }) => {
      useEffect(() => {
        montajes.editor += 1
      }, [])
      return (
        <button type="button" onClick={p.alPublicar}>
          editor {p.esperada}
        </button>
      )
    },
    ModalDePublicarLaTarjetaDiferido: () => {
      const [nota, setNota] = useState('')
      useEffect(() => {
        montajes.modal += 1
      }, [])
      return (
        <input
          aria-label="nota del modal"
          value={nota}
          onChange={(e) => {
            setNota(e.target.value)
          }}
        />
      )
    },
  }
})
vi.mock('@/shared/ui/toasts', () => ({ avisarError: vi.fn() }))

const V1 = '2026-11-07T15:00:00.123456+00:00'
const V2 = '2026-11-07T16:00:00.654321+00:00'
const editor = (esperada: string): PropsDelEditor =>
  ({ origen: { id: 'o', nombre: 'Mini' }, esperada }) as unknown as PropsDelEditor

afterEach(() => {
  cleanup()
  montajes.editor = 0
  montajes.modal = 0
})

function Pestana({ esperada }: { esperada: string }) {
  return (
    <NuqsTestingAdapter searchParams="?panel=publicar-tarjeta" hasMemory>
      <PestanaDeLaTarjeta editor={editor(esperada)} />
    </NuqsTestingAdapter>
  )
}

describe('PestanaDeLaTarjeta', () => {
  it('un cambio de esperada remonta el editor y NO el modal: la nota escrita sobrevive', () => {
    const { rerender } = render(<Pestana esperada={V1} />)
    const campo = screen.getByLabelText('nota del modal') as HTMLInputElement
    act(() => {
      fireEvent.change(campo, { target: { value: 'Mi nota' } })
    })
    expect(montajes).toEqual({ editor: 1, modal: 1 })
    rerender(<Pestana esperada={V2} />)
    expect(montajes).toEqual({ editor: 2, modal: 1 })
    expect((screen.getByLabelText('nota del modal') as HTMLInputElement).value).toBe('Mi nota')
  })
})
