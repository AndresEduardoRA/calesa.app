import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos } from './atajos'
import { ModalDeFormulario, type FormularioDelModal } from './modal-de-formulario'

const base = (cambios: Partial<FormularioDelModal> = {}): FormularioDelModal => ({
  enCurso: false,
  hayCambios: false,
  conflicto: null,
  aviso: null,
  enLinea: true,
  esperandoConexion: false,
  enviar: vi.fn(() => Promise.resolve(true)),
  reintentar: vi.fn(),
  recargar: vi.fn(),
  descartarBorrador: vi.fn(),
  ...cambios,
})

function Prueba({
  formulario,
  alCerrar,
  noDisponible = null,
}: {
  formulario: FormularioDelModal
  alCerrar: () => void
  noDisponible?: string | null
}) {
  return (
    <ProveedorAtajos>
      <ModalDeFormulario
        id="prueba"
        abierto
        alCerrar={alCerrar}
        titulo="Anotar seguimiento"
        formulario={formulario}
        noDisponible={noDisponible}
      >
        <input aria-label="Resumen" />
      </ModalDeFormulario>
    </ProveedorAtajos>
  )
}

const esc = () => {
  const campo = screen.getByLabelText('Resumen')
  campo.focus()
  fireEvent.keyDown(campo, { key: 'Escape' })
}
const guardarConAtajo = () => {
  fireEvent.keyDown(window, { key: 's', ctrlKey: true })
}

afterEach(cleanup)

// El contrato de todo formulario que se abre en un modal por la URL (docs/DECISIONES.md, 9c y 9d).
describe('ModalDeFormulario: cerrar', () => {
  it('Esc sin cambios cierra', () => {
    const cerrar = vi.fn()
    render(<Prueba formulario={base()} alCerrar={cerrar} />)
    esc()
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('Esc con cambios pregunta en el pie; «Descartar» tira el borrador y cierra', () => {
    const cerrar = vi.fn()
    const formulario = base({ hayCambios: true })
    render(<Prueba formulario={formulario} alCerrar={cerrar} />)
    esc()
    expect(cerrar).not.toHaveBeenCalled()
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Seguir editando' }))
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(formulario.descartarBorrador).toHaveBeenCalledTimes(1)
    expect(cerrar).toHaveBeenCalledTimes(1)
  })
})

describe('ModalDeFormulario: guardar', () => {
  it('mientras pregunta, los atajos no guardan', () => {
    const formulario = base({ hayCambios: true })
    render(<Prueba formulario={formulario} alCerrar={vi.fn()} />)
    esc()
    guardarConAtajo()
    expect(formulario.enviar).not.toHaveBeenCalled()
  })

  it('el atajo guarda con el formulario a la vista', () => {
    const formulario = base()
    render(<Prueba formulario={formulario} alCerrar={vi.fn()} />)
    guardarConAtajo()
    expect(formulario.enviar).toHaveBeenCalledTimes(1)
  })

  it('mientras guarda: no cierra, los campos se apagan y el atajo no vuelve a guardar', () => {
    const cerrar = vi.fn()
    const formulario = base({ enCurso: true })
    render(<Prueba formulario={formulario} alCerrar={cerrar} />)
    esc()
    expect(cerrar).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Resumen').matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Guardando…' })).toHaveProperty('disabled', true)
    guardarConAtajo()
    expect(formulario.enviar).not.toHaveBeenCalled()
  })

  it('lo que ya no está: lo dice, apaga «Guardar» y deja lo escrito', () => {
    const formulario = base()
    render(
      <Prueba
        formulario={formulario}
        alCerrar={vi.fn()}
        noDisponible="No encontramos este seguimiento."
      />,
    )
    expect(
      screen.getByText('No encontramos este seguimiento. Lo que escribiste no se guardó.'),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveProperty('disabled', true)
    expect(screen.getByLabelText('Resumen').matches(':disabled')).toBe(false)
    guardarConAtajo()
    expect(formulario.enviar).not.toHaveBeenCalled()
  })

  it('un conflicto apaga «Guardar» y ofrece «Recargar»', () => {
    const formulario = base({ conflicto: 'Cambiaste esto hace 3 min desde otra ventana.' })
    render(<Prueba formulario={formulario} alCerrar={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(formulario.recargar).toHaveBeenCalledTimes(1)
  })

  it('un intento que no guarda lleva el foco al primer campo con motivo', async () => {
    const formulario = base({ enviar: vi.fn(() => Promise.resolve(false)) })
    render(
      <ProveedorAtajos>
        <ModalDeFormulario
          id="prueba"
          abierto
          alCerrar={vi.fn()}
          titulo="Anotar"
          formulario={formulario}
        >
          <input aria-label="Tipo" />
          <input aria-label="Resumen" aria-invalid="true" />
        </ModalDeFormulario>
      </ProveedorAtajos>,
    )
    screen.getByLabelText('Tipo').focus()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Resumen'))
    })
  })

  it('el formulario se nombra con el título', () => {
    render(<Prueba formulario={base()} alCerrar={vi.fn()} />)
    expect(screen.getByRole('form', { name: 'Anotar seguimiento' })).toBeTruthy()
  })
})

describe('ModalDeFormulario: no enviar de más', () => {
  it('con un conflicto o lo que ya no está, Enter en un campo no envía', () => {
    const formulario = base({ conflicto: 'Cambiaste esto hace 1 min.' })
    render(<Prueba formulario={formulario} alCerrar={vi.fn()} />)
    fireEvent.submit(screen.getByRole('form', { name: 'Anotar seguimiento' }))
    expect(formulario.enviar).not.toHaveBeenCalled()
  })

  it('una vez guardado, un segundo Enter no vuelve a enviar', async () => {
    const formulario = base()
    render(<Prueba formulario={formulario} alCerrar={vi.fn()} />)
    const elFormulario = screen.getByRole('form', { name: 'Anotar seguimiento' })
    fireEvent.submit(elFormulario)
    await waitFor(() => {
      expect(formulario.enviar).toHaveBeenCalledOnce()
    })
    await Promise.resolve()
    fireEvent.submit(elFormulario)
    guardarConAtajo()
    expect(formulario.enviar).toHaveBeenCalledOnce()
  })
})
