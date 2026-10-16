import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CampoBase } from '@/shared/lib/campos'
import { fallo, ok } from '@/shared/lib/errores'
import { Campo } from '@/shared/ui/campo'
import { avisar } from '@/shared/ui/toasts'
import { FormularioDeCampo } from './formulario-de-campo'
import type { ConfiguracionDeCampos, EdicionesDeCampos } from './tipos'

vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn(), avisarError: vi.fn() }))

type Cambios = { etiqueta?: string }
type Nuevo = { etiqueta: string }

const CAMPO: CampoBase = {
  id: 'c1',
  clave: 'color',
  etiqueta: 'Color',
  tipo: 'texto',
  opciones: [],
  requerido: false,
  valorDefecto: null,
  grupo: 'Datos',
  orden: 1,
  esSistema: false,
  activo: true,
  actualizadoEn: 'v1',
}

// Un módulo con un texto propio en el hueco, como los de leads y de orígenes.
const configuracion: ConfiguracionDeCampos<CampoBase, Cambios, Nuevo> = {
  textos: {
    titulo: 'Campos',
    vacioTitulo: '',
    vacioDescripcion: '',
    motivoSinPermiso: 'Sin permiso.',
    panelNuevo: 'Campo nuevo',
    panelDescripcionNuevo: '',
    panelDescripcionExistente: '',
    claveDuplicada: 'Repetido.',
    borrador: 'prueba-campo',
  },
  banderas: [],
  tipos: ['texto'],
  textosLibres: ['nota'],
  valoresIniciales: (campo) => ({
    etiqueta: campo?.etiqueta ?? '',
    clave: campo?.clave ?? '',
    tipo: campo?.tipo ?? 'texto',
    opciones: [],
    grupo: campo?.grupo ?? '',
    activo: true,
    valorDefecto: null,
    banderas: {},
    textos: { nota: 'Una nota' },
  }),
  claveDe: (etiqueta) => etiqueta.toLowerCase(),
  paraCrear: (valores) => ({ etiqueta: valores.etiqueta.trim() }),
  cambiosDe: (campo, valores) =>
    valores.etiqueta.trim() === campo.etiqueta ? {} : { etiqueta: valores.etiqueta.trim() },
  conBandera: () => ({}),
  necesitaVistaPrevia: () => false,
  resumenDeImpacto: () => ({ bloquea: false, avisos: [] }),
  resumenDeEliminacion: () => ({ bloquea: false, avisos: [] }),
  hueco: ({ valores, cambiarTexto }) => (
    <Campo
      nombre="nota"
      etiqueta="Nota"
      value={valores.textos['nota'] ?? ''}
      onChange={(evento) => {
        cambiarTexto('nota', evento.target.value)
      }}
    />
  ),
}

function ediciones(parcial: Partial<EdicionesDeCampos<Cambios, Nuevo>> = {}) {
  const listo = () => Promise.resolve(ok(undefined))
  const edicion: EdicionesDeCampos<Cambios, Nuevo> = {
    crear: vi.fn(listo),
    guardar: vi.fn(listo),
    cambiarBandera: vi.fn(listo),
    cambiarActivo: vi.fn(listo),
    mover: vi.fn(listo),
    eliminar: vi.fn(listo),
    vistaPrevia: vi.fn(() =>
      Promise.resolve(ok({ total: 0, conValor: 0, sinValor: 0, porOpcion: {} })),
    ),
    enCurso: false,
    errores: { crear: undefined },
  }
  return { ...edicion, ...parcial }
}

function montar(campo: CampoBase | null, edicion = ediciones()) {
  const alCerrar = vi.fn()
  render(
    <FormularioDeCampo
      campo={campo}
      todos={campo ? [campo] : []}
      puedeGestionar
      configuracion={configuracion}
      ediciones={edicion}
      alCerrar={alCerrar}
    />,
  )
  return { alCerrar, edicion }
}

const almacen = (clave: string) => window.sessionStorage.getItem(`borrador:${clave}`)
const escribir = (nombre: string, valor: string) => {
  fireEvent.change(screen.getByLabelText(nombre), { target: { value: valor } })
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(avisar).mockClear()
})
afterEach(cleanup)

describe('FormularioDeCampo: el borrador', () => {
  it('en una carga limpia no escribe borrador ni avisa', () => {
    montar(CAMPO)
    expect(almacen('prueba-campo-c1')).toBeNull()
    expect(avisar).not.toHaveBeenCalled()
  })

  it('en una carga limpia de un campo nuevo tampoco', () => {
    montar(null)
    expect(almacen('prueba-campo-nuevo')).toBeNull()
    expect(avisar).not.toHaveBeenCalled()
  })

  it('guarda lo tipeado mientras se escribe, sin «recuperarlo» en cada render', () => {
    montar(CAMPO)
    escribir('Nombre', 'Colores')
    escribir('Nota', 'Otra nota')
    expect(JSON.parse(almacen('prueba-campo-c1') ?? 'null')).toMatchObject({
      etiqueta: 'Colores',
      nota: 'Otra nota',
    })
    expect(avisar).not.toHaveBeenCalled()
  })
})

describe('FormularioDeCampo: al terminar', () => {
  it('al guardar un campo, el borrador se va', async () => {
    const { alCerrar, edicion } = montar(CAMPO)
    escribir('Nombre', 'Colores')
    expect(almacen('prueba-campo-c1')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      expect(edicion.guardar).toHaveBeenCalledWith(CAMPO, { etiqueta: 'Colores' })
    })
    await waitFor(() => {
      expect(almacen('prueba-campo-c1')).toBeNull()
    })
    expect(alCerrar).toHaveBeenCalled()
  })

  it('al crear un campo, el borrador se va', async () => {
    const { edicion } = montar(null)
    escribir('Nombre', 'Nuevo')
    expect(almacen('prueba-campo-nuevo')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Crear campo' }))
    await waitFor(() => {
      expect(edicion.crear).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(almacen('prueba-campo-nuevo')).toBeNull()
    })
  })

  it('si el guardado falla, lo tipeado queda en el borrador', async () => {
    const { alCerrar, edicion } = montar(
      CAMPO,
      ediciones({ guardar: vi.fn(() => Promise.resolve(fallo('regla', 'No se puede.'))) }),
    )
    escribir('Nombre', 'Colores')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      expect(edicion.guardar).toHaveBeenCalled()
    })
    expect(almacen('prueba-campo-c1')).not.toBeNull()
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('un guardado que pregunta antes (hay un aviso de impacto) todavía no borra nada', async () => {
    const conPregunta: ConfiguracionDeCampos<CampoBase, Cambios, Nuevo> = {
      ...configuracion,
      necesitaVistaPrevia: () => true,
      resumenDeImpacto: () => ({ bloquea: false, avisos: ['Cambia 3 registros.'] }),
    }
    const edicion = ediciones()
    render(
      <FormularioDeCampo
        campo={CAMPO}
        todos={[CAMPO]}
        puedeGestionar
        configuracion={conPregunta}
        ediciones={edicion}
        alCerrar={vi.fn()}
      />,
    )
    escribir('Nombre', 'Colores')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Cambia 3 registros.')).toBeTruthy()
    expect(edicion.guardar).not.toHaveBeenCalled()
    expect(almacen('prueba-campo-c1')).not.toBeNull()
  })
})
