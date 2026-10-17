import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { FormularioDeCampo } from '@/shared/ui/campos/formulario-de-campo'
import type { EdicionesDeCampos } from '@/shared/ui/campos'
import { avisar } from '@/shared/ui/toasts'
import type { CambiosDeCampoDeLead } from '../../entities/cambios-de-campo'
import type { CampoDeLead } from '../../entities/campo'
import { configuracionDeLeads } from './configuracion'
import type { esquemaCrearCampo } from './schemas/campos'
import type { z } from 'zod'

vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn(), avisarError: vi.fn() }))

const listo = () => Promise.resolve(ok(undefined))
const ediciones: EdicionesDeCampos<CambiosDeCampoDeLead, z.input<typeof esquemaCrearCampo>> = {
  crear: listo,
  guardar: listo,
  cambiarBandera: listo,
  cambiarActivo: listo,
  mover: listo,
  eliminar: listo,
  vistaPrevia: () => Promise.resolve(ok({ total: 0, conValor: 0, sinValor: 0, porOpcion: {} })),
  enCurso: false,
  errores: { crear: undefined },
}

const CAMPO: CampoDeLead = {
  id: '5f0c3a5e-7a52-4f7e-8f3e-3f1b2b6a1c11',
  clave: 'ciudad_de_obra',
  etiqueta: 'Ciudad de obra',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  valorDefecto: null,
  grupo: 'Obra',
  orden: 1,
  esSistema: false,
  activo: true,
  actualizadoEn: 'v1',
  enTabla: false,
  filtrable: false,
  soloCartera: false,
  privacidadPendiente: null,
  valorDefectoEmpresa: 'pais',
}

const configuracion = configuracionDeLeads({
  campos: [CAMPO],
  empresa: { ciudad: 'La Paz', pais: 'Bolivia' },
})

beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(avisar).mockClear()
})
afterEach(cleanup)

describe('el formulario de un campo de lead, en una carga limpia', () => {
  it.each([
    { nombre: 'un campo con el dato de la empresa elegido', campo: CAMPO },
    { nombre: 'un campo sin dato de la empresa', campo: { ...CAMPO, valorDefectoEmpresa: null } },
    { nombre: 'un campo nuevo', campo: null },
  ])('$nombre: sin borrador ni aviso', ({ campo }) => {
    render(
      <FormularioDeCampo
        campo={campo}
        todos={campo ? [campo] : []}
        puedeGestionar
        configuracion={configuracion}
        ediciones={ediciones}
        alCerrar={vi.fn()}
      />,
    )
    expect(window.sessionStorage.length).toBe(0)
    expect(avisar).not.toHaveBeenCalled()
  })
})
