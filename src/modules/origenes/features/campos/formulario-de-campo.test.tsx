import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { FormularioDeCampo } from '@/shared/ui/campos/formulario-de-campo'
import type { ConfiguracionDeCampos, EdicionesDeCampos } from '@/shared/ui/campos'
import { avisar } from '@/shared/ui/toasts'
import type { CampoDeLayout } from '../../entities/campo'
import { configuracionDeOrigen } from './configuracion'

vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn(), avisarError: vi.fn() }))

type Configuracion = ReturnType<typeof configuracionDeOrigen>
type Ediciones =
  Configuracion extends ConfiguracionDeCampos<CampoDeLayout, infer Cambios, infer Nuevo>
    ? EdicionesDeCampos<Cambios, Nuevo>
    : never

const listo = () => Promise.resolve(ok(undefined))
const ediciones: Ediciones = {
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

const CAMPO: CampoDeLayout = {
  id: '5f0c3a5e-7a52-4f7e-8f3e-3f1b2b6a1c22',
  origenId: '5f0c3a5e-7a52-4f7e-8f3e-3f1b2b6a1c23',
  clave: 'millaje',
  etiqueta: 'Millaje',
  tipo: 'numero',
  opciones: [],
  requerido: false,
  valorDefecto: null,
  grupo: 'Motor',
  orden: 1,
  esSistema: false,
  activo: true,
  actualizadoEn: 'v1',
  enTarjeta: false,
  filtrable: false,
  publicoWeb: false,
  claveApibara: 'odometer',
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(avisar).mockClear()
})
afterEach(cleanup)

describe('el formulario de un campo de origen, en una carga limpia', () => {
  it.each([
    { nombre: 'una subasta, con la ruta de apibara', tipo: 'subasta', campo: CAMPO },
    {
      nombre: 'una subasta, sin ruta de apibara',
      tipo: 'subasta',
      campo: { ...CAMPO, claveApibara: null },
    },
    { nombre: 'una subasta, campo nuevo', tipo: 'subasta', campo: null },
    { nombre: 'otro tipo de origen, sin el hueco de apibara', tipo: 'manual', campo: CAMPO },
  ] as const)('$nombre: sin borrador ni aviso', ({ tipo, campo }) => {
    const configuracion = configuracionDeOrigen({ origenId: CAMPO.origenId, tipoDeOrigen: tipo })
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
