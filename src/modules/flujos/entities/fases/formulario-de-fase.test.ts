import { describe, expect, it } from 'vitest'
import type { FaseParaConfigurar } from '../flujo'
import {
  VALORES_DE_FASE_NUEVA,
  cambiosParaGuardar,
  datosParaCrear,
  errorDeEnvio,
  erroresDeFaseNueva,
  valoresDeFase,
} from './formulario-de-fase'
import {
  validarFase,
  type ContextoDeFase,
  type DatosDeFase,
  type ValoresDeFase,
} from './reglas-de-fase'

const FASE: FaseParaConfigurar = {
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'En puerto',
  descripcion: 'Espera la nave',
  color: '#465fff',
  icono: null,
  orden: 10,
  activa: true,
  esInicial: false,
  esFinal: false,
  esLogistica: true,
  demoraDias: 5,
  alertaCadaHoras: null,
  notaObligatoria: false,
  permiteContenedor: true,
  permiteAduana: false,
  cuentaLlegadaRepuestos: false,
  publicaWeb: false,
  visiblePortal: false,
  aliasPortal: null,
  descripcionPortal: null,
}
const CONTEXTO: ContextoDeFase = {
  ambito: 'vehiculos',
  reglas: ['vitrina_web', 'portal_cliente', 'aduana', 'logistica'].map((regla) => ({
    regla,
    activa: true,
  })),
}

function datos(cambios: Partial<ValoresDeFase> = {}): DatosDeFase {
  const r = validarFase({ ...valoresDeFase(FASE), ...cambios }, CONTEXTO)
  if (!r.ok) {
    throw new Error(JSON.stringify(r.errores))
  }
  return r.datos
}

describe('valoresDeFase', () => {
  it('pone los nulos como campos vacíos y los números como texto', () => {
    expect(valoresDeFase(FASE)).toMatchObject({
      icono: '',
      aliasPortal: '',
      demoraDias: '5',
      alertaCadaHoras: '',
      descripcion: 'Espera la nave',
    })
  })
})

describe('cambiosParaGuardar', () => {
  it('sin cambios no hay pedido', () => {
    expect(cambiosParaGuardar(FASE, datos())).toBeNull()
  })

  it('manda sólo lo que cambió, con las claves de la base', () => {
    expect(
      cambiosParaGuardar(FASE, datos({ nombre: '  Nuevo  ', esFinal: true, demoraDias: '' })),
    ).toEqual({ nombre: 'Nuevo', es_final: true, demora_dias: null })
  })

  it('un texto opcional vaciado viaja nulo', () => {
    expect(cambiosParaGuardar(FASE, datos({ descripcion: '   ' }))).toEqual({ descripcion: null })
  })

  it('nunca manda activa, orden ni flujo_id', () => {
    const todo = cambiosParaGuardar(
      FASE,
      datos({
        nombre: 'A',
        descripcion: 'b',
        color: '#000000',
        icono: 'x',
        demoraDias: '1',
        alertaCadaHoras: '2',
        esInicial: true,
        esLogistica: false,
        notaObligatoria: true,
        permiteContenedor: false,
        permiteAduana: true,
        cuentaLlegadaRepuestos: true,
        publicaWeb: true,
        visiblePortal: true,
        aliasPortal: 'c',
        descripcionPortal: 'd',
      }),
    )
    expect(Object.keys(todo ?? {})).toHaveLength(16) // todo menos «es_final», que no se tocó
    expect(Object.keys(todo ?? {})).not.toEqual(expect.arrayContaining(['activa']))
    expect(Object.keys(todo ?? {})).not.toEqual(expect.arrayContaining(['orden']))
    expect(Object.keys(todo ?? {})).not.toEqual(expect.arrayContaining(['flujo_id']))
  })
})

describe('datosParaCrear', () => {
  it('sólo nombre y color si es intermedia', () => {
    expect(datosParaCrear({ ...VALORES_DE_FASE_NUEVA, nombre: '  Pagada ' })).toEqual({
      nombre: 'Pagada',
      color: '#717c93',
    })
  })

  it('la inicial y la final marcan su campo', () => {
    expect(datosParaCrear({ nombre: 'A', color: '#465fff', tipo: 'inicial' })).toEqual({
      nombre: 'A',
      color: '#465fff',
      es_inicial: true,
    })
    expect(datosParaCrear({ nombre: 'B', color: '#465fff', tipo: 'final' })).toMatchObject({
      es_final: true,
    })
  })
})

describe('erroresDeFaseNueva y errorDeEnvio', () => {
  it('pide el nombre (recortado) y un color válido', () => {
    expect(
      erroresDeFaseNueva({ nombre: '  ', color: '#717c93', tipo: 'intermedia' }),
    ).toHaveProperty('nombre')
    expect(erroresDeFaseNueva({ nombre: 'Aduana', color: 'rojo', tipo: 'final' })).toHaveProperty(
      'color',
    )
    expect(erroresDeFaseNueva({ nombre: 'Aduana', color: '#717c93', tipo: 'final' })).toEqual({})
  })

  it('el campo del modal va junto a su campo; otro motivo, arriba', () => {
    expect(errorDeEnvio({ nombre: 'Ya hay una fase.' }, 'Ya hay una fase.')).toEqual({
      errores: { nombre: 'Ya hay una fase.' },
      aviso: null,
    })
    expect(
      errorDeEnvio({ publica_web: 'La vitrina web está apagada.' }, 'Vitrina apagada.'),
    ).toEqual({
      errores: {},
      aviso: 'Vitrina apagada.',
    })
    expect(errorDeEnvio(undefined, 'Algo.')).toEqual({ errores: {}, aviso: 'Algo.' })
  })
})
