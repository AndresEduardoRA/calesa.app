import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import EditorEnriquecido from './editor-enriquecido'

afterEach(cleanup)

async function montar() {
  render(
    <EditorEnriquecido
      valor={null}
      alCambiar={() => undefined}
      etiquetaId="detalle"
      invalido={false}
      deshabilitado={false}
    />,
  )
  const barra = await screen.findByRole('toolbar', { name: 'Formato del detalle' })
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Negrita' })).toBeEnabled()
  })
  return barra
}

const botones = () => screen.getAllByRole('button')

describe('la barra del editor', () => {
  it('tiene una sola parada de Tab: la de un botón; el resto se alcanza con flechas', async () => {
    await montar()
    const paradas = botones().filter((b) => b.tabIndex === 0)
    expect(paradas).toHaveLength(1)
    expect(paradas[0]).toHaveAccessibleName('Negrita')
    expect(botones()).toHaveLength(5)
  })

  it('las flechas, Inicio y Fin recorren los botones y la parada sigue al foco', async () => {
    await montar()
    const [negrita, cursiva, , , enlace] = botones()
    negrita?.focus()
    fireEvent.keyDown(negrita as HTMLElement, { key: 'ArrowRight' })
    expect(cursiva).toHaveFocus()
    expect(cursiva?.tabIndex).toBe(0)
    expect(negrita?.tabIndex).toBe(-1)
    fireEvent.keyDown(cursiva as HTMLElement, { key: 'End' })
    expect(enlace).toHaveFocus()
    fireEvent.keyDown(enlace as HTMLElement, { key: 'ArrowRight' })
    expect(negrita).toHaveFocus()
    fireEvent.keyDown(negrita as HTMLElement, { key: 'ArrowLeft' })
    expect(enlace).toHaveFocus()
    fireEvent.keyDown(enlace as HTMLElement, { key: 'Home' })
    expect(negrita).toHaveFocus()
  })
})
