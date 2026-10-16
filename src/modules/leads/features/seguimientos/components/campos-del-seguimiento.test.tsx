import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Seguimiento } from '../../../entities/seguimiento'
import { valoresDeSeguimientoNuevo } from '../../../entities/seguimiento-nuevo'
import { CamposDelSeguimiento } from './campos-del-seguimiento'

// El editor es otro chunk: acá basta con saber que se monta.
vi.mock('./editor-diferido', () => ({
  EditorDiferido: () => <div role="textbox" aria-label="editor" />,
}))

const TIPOS = [
  { id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', clave: 'llamada', nombre: 'Llamada', icono: null },
]

function montar(extra: Partial<Parameters<typeof CamposDelSeguimiento>[0]> = {}) {
  return render(
    <CamposDelSeguimiento
      id="c"
      valores={valoresDeSeguimientoNuevo(TIPOS)}
      errores={{}}
      cambiar={() => undefined}
      tipos={TIPOS}
      zona="America/La_Paz"
      deshabilitado={false}
      original={null}
      {...extra}
    />,
  )
}

afterEach(cleanup)

describe('CamposDelSeguimiento', () => {
  it('tipo, cuándo fue, resumen, detalle y próximo contacto plegado; sin «Visible» ni vehículo', () => {
    montar()
    expect(screen.getByLabelText('Tipo de seguimiento')).toBeInTheDocument()
    expect(screen.getByText('Cuándo fue')).toBeInTheDocument()
    expect(screen.getByLabelText('Resumen')).toBeInTheDocument()
    expect(screen.getByText('Detalle (opcional)')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'editor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Programar próximo contacto' })).toBeInTheDocument()
    expect(screen.queryByText('Visible para el cliente')).toBeNull()
    expect(screen.queryByText('Recordatorio (opcional)')).toBeNull()
  })

  it('«Visible para el cliente» sólo si el contenedor lo pide', () => {
    montar({ conVisible: true })
    expect(screen.getByText('Visible para el cliente')).toBeInTheDocument()
  })

  it('al editar no hay próximo contacto', () => {
    montar({
      original: {
        tipoId: TIPOS[0]?.id,
        tipoNombre: 'Llamada',
        ocurridoEn: '2026-10-10T12:00:00Z',
      } as unknown as Seguimiento,
    })
    expect(screen.queryByRole('button', { name: 'Programar próximo contacto' })).toBeNull()
  })

  it('los motivos van junto a su campo', () => {
    montar({ errores: { titulo: 'Escribe un resumen del seguimiento.', detalle: 'Muy largo.' } })
    expect(screen.getByText('Escribe un resumen del seguimiento.')).toBeInTheDocument()
    expect(screen.getByText('Muy largo.')).toBeInTheDocument()
  })

  it('sin tipos activos al anotar lo dice y deshabilita el selector', () => {
    montar({ tipos: [], valores: valoresDeSeguimientoNuevo([]) })
    expect(screen.getByText('No hay tipos de seguimiento activos.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de seguimiento')).toBeDisabled()
  })
})
