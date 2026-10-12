import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import { MOTIVO_MONEDA_BASE_CON_DATOS, MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { CamposDeEmpresa } from './campos-de-empresa'

// El campo del logo prepara archivos con el cliente de Storage: acá no se sube nada.
vi.mock('../../../composicion.client', () => ({ prepararLogo: vi.fn() }))

const ajustes: AjustesEmpresa = {
  nombre: 'Importadora Andina',
  razonSocial: null,
  nit: null,
  direccion: null,
  ciudad: null,
  pais: 'Bolivia',
  telefono: null,
  whatsapp: null,
  email: null,
  logoRuta: null,
  colorAcento: null,
  iconos: null,
  locale: 'es-BO',
  zonaHoraria: 'America/La_Paz',
  monedaBase: 'USD',
  registroAbierto: false,
  papeleraDias: 30,
  actividadDias: 14,
  actualizadoEn: '2026-10-12T14:00:00+00:00',
}

function campos(props: Partial<Parameters<typeof CamposDeEmpresa>[0]> = {}) {
  render(
    <CamposDeEmpresa
      ajustes={ajustes}
      logoUrl={null}
      monedas={[
        {
          codigo: 'USD',
          nombre: 'Dólar',
          simbolo: '$',
          decimales: 2,
          activa: true,
          actualizadoEn: 'v',
        },
      ]}
      zonas={['America/La_Paz']}
      conDatosCargados={false}
      puedeEditar
      logo={{ tipo: 'igual' }}
      alCambiarLogo={vi.fn()}
      registroAbierto={false}
      alCambiarRegistro={vi.fn()}
      errores={undefined}
      {...props}
    />,
  )
}

afterEach(cleanup)

describe('CamposDeEmpresa', () => {
  it('con permiso, los campos se editan y no hay aviso', () => {
    campos()
    expect(screen.getByLabelText<HTMLInputElement>('Nombre de la empresa').value).toBe(
      'Importadora Andina',
    )
    expect(screen.getByRole('group', { name: 'Ajustes de la empresa' }).matches(':disabled')).toBe(
      false,
    )
    expect(screen.queryByText(MOTIVO_SIN_PERMISO_AJUSTES)).toBeNull()
  })

  it('sin permiso se ve todo, deshabilitado y con el motivo', () => {
    campos({ puedeEditar: false })
    expect(screen.getByText(MOTIVO_SIN_PERMISO_AJUSTES)).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Ajustes de la empresa' }).matches(':disabled')).toBe(
      true,
    )
    expect(screen.getByLabelText('Nombre de la empresa').matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Subir logo' }).matches(':disabled')).toBe(true)
  })

  it('con datos cargados la moneda base queda deshabilitada y dice por qué', () => {
    campos({ conDatosCargados: true })
    expect(screen.getByLabelText('Moneda base').matches(':disabled')).toBe(true)
    expect(screen.getByText(MOTIVO_MONEDA_BASE_CON_DATOS)).toBeTruthy()
    // El resto del formulario sigue editable.
    expect(screen.getByLabelText('Zona horaria').matches(':disabled')).toBe(false)
  })

  it('muestra el error de un campo al lado del campo', () => {
    campos({ errores: { zonaHoraria: ['Esa zona horaria no existe.'] } })
    expect(screen.getByLabelText('Zona horaria').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Esa zona horaria no existe.')).toBeTruthy()
  })
})
