import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EstadoDelGuardado } from '../../hooks/use-guardar-borrador.soporte'
import { GuardarBorrador } from './guardar-borrador'

afterEach(cleanup)

type Props = Parameters<typeof GuardarBorrador>[0]

const dibujar = (cambios: Partial<Props> = {}) => {
  const props: Props = {
    nombreDelOrigen: 'Japón',
    enCurso: false,
    estado: { tipo: 'quieto' },
    motivo: null,
    avisoDelDiseno: null,
    recargando: false,
    alGuardar: vi.fn(),
    alRecargar: vi.fn(),
    ...cambios,
  }
  render(<GuardarBorrador {...props} />)
  return props
}
const boton = () => screen.getByRole('button', { name: /^(Guardar el borrador|Guardando…)$/ })
const linea = () => screen.getByRole('status')

describe('GuardarBorrador: el botón y sus estados (C5)', () => {
  it.each([
    ['Aplica o cancela la fila abierta.'],
    ['Corrige lo marcado para guardar.'],
    ['No hay cambios por guardar.'],
  ])('con motivo «%s», apagado y lo dice', (motivo) => {
    dibujar({ motivo })
    expect(boton()).toBeDisabled()
    expect(linea()).toHaveTextContent(motivo)
  })

  it('listo: encendido y sin motivo; el clic guarda', () => {
    const props = dibujar()
    expect(boton()).toBeEnabled()
    expect(linea()).toHaveTextContent('')
    fireEvent.click(boton())
    expect(props.alGuardar).toHaveBeenCalledOnce()
  })

  it('guardando: «Guardando…», apagado', () => {
    dibujar({ enCurso: true })
    expect(boton()).toHaveTextContent('Guardando…')
    expect(boton()).toBeDisabled()
  })

  it('entró y sin cambios: «Se guardó el borrador.»', () => {
    dibujar({ estado: { tipo: 'entro' }, motivo: 'No hay cambios por guardar.' })
    expect(linea()).toHaveTextContent('Se guardó el borrador.')
  })

  it('entró y con una fila abierta: manda la fila abierta', () => {
    dibujar({ estado: { tipo: 'entro' }, motivo: 'Aplica o cancela la fila abierta.' })
    expect(linea()).toHaveTextContent('Aplica o cancela la fila abierta.')
  })

  it('un conflicto: el texto de la base, qué trae «Recargar», y el botón apagado', () => {
    const mensaje = 'Ya hay un borrador: lo empezó Ana y se guardó hace 2 min.'
    const props = dibujar({ estado: { tipo: 'conflicto', mensaje } })
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent(mensaje)
    expect(alerta).toHaveTextContent(
      'Recargar trae el borrador como quedó; lo que aplicaste y no guardaste se pierde.',
    )
    expect(boton()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(props.alRecargar).toHaveBeenCalledOnce()
  })

  it('recargando: «Recargar» espera', () => {
    dibujar({ estado: { tipo: 'conflicto', mensaje: 'x' }, recargando: true })
    expect(screen.getByRole('button', { name: 'Recargando…' })).toBeDisabled()
  })

  it.each<[EstadoDelGuardado, string]>([
    [
      { tipo: 'regla' },
      'La base no aceptó la fórmula por una regla que el editor no revisó: no se guardó.',
    ],
    [{ tipo: 'sin_permiso' }, 'Ya no configuras Japón: no se puede guardar.'],
    [{ tipo: 'sin_respuesta' }, 'No sabemos si se guardó: recarga para verlo.'],
    [{ tipo: 'error', mensaje: 'Algo falló de nuestro lado.' }, 'Algo falló de nuestro lado.'],
  ])('%o: su texto, con el botón encendido para volver a intentar', (estado, texto) => {
    dibujar({ estado })
    expect(screen.getByRole('alert')).toHaveTextContent(texto)
    expect(boton()).toBeEnabled()
  })

  it('el aviso de lo que el diseño no muestra (C6), visible mientras haya', () => {
    const aviso =
      'Para publicar, el diseño de la hoja tiene que mostrar: «Seguro de carga». Puedes guardar igual.'
    dibujar({ avisoDelDiseno: aviso })
    expect(screen.getByText(aviso)).toBeVisible()
    expect(boton()).toBeEnabled()
  })
})
