import { describe, expect, it } from 'vitest'
import type { CampoDeLead } from './campo'
import {
  CLAVE_DEL_ALTA,
  camposDelAlta,
  campoDelAlta,
  contextoDeAltaDesde,
  primerCampoConError,
  resumenDePrecargados,
  valoresIniciales,
  validarAlta,
  type ContextoDeAlta,
} from './alta'

const ZONA = 'America/La_Paz'
const AHORA = '2026-10-14T19:30:00.000Z'

const ORIGEN_WEB = '11111111-1111-4111-8111-111111111111'
const ORIGEN_FB = '22222222-2222-4222-8222-222222222222'
const TIPO_WA = '33333333-3333-4333-8333-333333333333'
const TIPO_LLAMADA = '44444444-4444-4444-8444-444444444444'

const CONTEXTO: ContextoDeAlta = {
  telefonoCc: '+591',
  origenes: [
    { id: ORIGEN_FB, clave: 'facebook', nombre: 'Facebook' },
    { id: ORIGEN_WEB, clave: 'web', nombre: 'Web' },
  ],
  tiposDeSeguimiento: [
    { id: TIPO_WA, clave: 'whatsapp', nombre: 'WhatsApp', icono: null },
    { id: TIPO_LLAMADA, clave: 'llamada', nombre: 'Llamada', icono: null },
  ],
  ultimoOrigenId: null,
  empresa: { ciudad: 'Santa Cruz', pais: 'Bolivia' },
}

function campo(cambios: Partial<CampoDeLead> & Pick<CampoDeLead, 'clave'>): CampoDeLead {
  return {
    id: `id-${cambios.clave}`,
    etiqueta: cambios.clave,
    tipo: 'texto',
    opciones: [],
    requerido: false,
    valorDefecto: null,
    valorDefectoEmpresa: null,
    grupo: null,
    orden: 0,
    enTabla: false,
    filtrable: false,
    soloCartera: false,
    esSistema: false,
    activo: true,
    actualizadoEn: '2026-10-14T10:00:00Z',
    ...cambios,
  }
}

const LAYOUT: CampoDeLead[] = [
  campo({ clave: 'ciudad', etiqueta: 'Ciudad', valorDefectoEmpresa: 'ciudad', orden: 1 }),
  campo({ clave: 'pais', etiqueta: 'País', valorDefectoEmpresa: 'pais', orden: 2 }),
  campo({ clave: 'edad', etiqueta: 'Edad', tipo: 'numero', orden: 3 }),
  campo({
    clave: 'signo',
    etiqueta: 'Signo',
    tipo: 'opcion',
    requerido: true,
    opciones: [
      { clave: 'leo', etiqueta: 'Leo' },
      { clave: 'aries', etiqueta: 'Aries' },
    ],
    orden: 4,
  }),
  campo({
    clave: 'documento',
    etiqueta: 'Documento',
    tipo: 'documento',
    soloCartera: true,
    orden: 5,
  }),
  campo({ clave: 'viejo', etiqueta: 'Viejo', activo: false, requerido: true, orden: 6 }),
]

describe('contextoDeAltaDesde', () => {
  it('lee lo que devuelve lead_alta_contexto()', () => {
    const contexto = contextoDeAltaDesde({
      telefono_cc: '+591',
      origenes: [{ id: ORIGEN_WEB, clave: 'web', nombre: 'Web' }],
      tipos_seguimiento: [{ id: TIPO_WA, clave: 'whatsapp', nombre: 'WhatsApp', icono: 'm' }],
      ultimo_origen_id: ORIGEN_WEB,
      empresa: { ciudad: null, pais: 'Bolivia' },
    })
    expect(contexto).toMatchObject({
      telefonoCc: '+591',
      ultimoOrigenId: ORIGEN_WEB,
      empresa: { ciudad: null, pais: 'Bolivia' },
    })
    expect(contexto.tiposDeSeguimiento[0]?.nombre).toBe('WhatsApp')
  })

  it('lo que no calza es un error', () => {
    expect(() => contextoDeAltaDesde({})).toThrow()
  })
})

describe('camposDelAlta', () => {
  it('pide arriba los requeridos activos, también los propios, y pliega el resto', () => {
    const { principales, masDatos } = camposDelAlta(LAYOUT)
    expect(principales.map((c) => c.clave)).toEqual(['signo'])
    expect(masDatos.map((c) => c.clave)).toEqual(['ciudad', 'pais', 'edad', 'documento'])
  })

  it('un campo desactivado no se pide aunque sea requerido', () => {
    const { principales, masDatos } = camposDelAlta(LAYOUT)
    expect([...principales, ...masDatos].some((c) => c.clave === 'viejo')).toBe(false)
  })
})

describe('campoDelAlta', () => {
  it('un privado lo dice en su etiqueta, y la clave es la del hint de la base', () => {
    const control = campoDelAlta(LAYOUT[4] as CampoDeLead)
    expect(control.etiqueta).toBe('Documento (solo la cartera)')
    expect(control.clave).toBe('atributos.documento')
    expect(campoDelAlta(LAYOUT[0] as CampoDeLead).etiqueta).toBe('Ciudad')
  })
})

describe('valoresIniciales', () => {
  it('arranca con el primer origen, prospecto, el primer tipo de seguimiento y la ciudad de la empresa', () => {
    const v = valoresIniciales(CONTEXTO, LAYOUT, ZONA)
    expect(v[CLAVE_DEL_ALTA.origen]).toBe(ORIGEN_FB)
    expect(v[CLAVE_DEL_ALTA.tipo]).toBe('prospecto')
    expect(v[CLAVE_DEL_ALTA.tipoDeSeguimiento]).toBe(TIPO_WA)
    expect(v['atributos.ciudad']).toBe('Santa Cruz')
    expect(v['atributos.pais']).toBe('Bolivia')
    expect(v['atributos.edad']).toBe('')
    expect('atributos.viejo' in v).toBe(false)
  })

  it('el último origen usado gana', () => {
    const v = valoresIniciales({ ...CONTEXTO, ultimoOrigenId: ORIGEN_WEB }, LAYOUT, ZONA)
    expect(v[CLAVE_DEL_ALTA.origen]).toBe(ORIGEN_WEB)
  })

  it('sin orígenes activos no hay origen, y sin dato de la empresa la ciudad queda vacía', () => {
    const v = valoresIniciales(
      { ...CONTEXTO, origenes: [], empresa: { ciudad: null, pais: null } },
      LAYOUT,
      ZONA,
    )
    expect(v[CLAVE_DEL_ALTA.origen]).toBe('')
    expect(v['atributos.ciudad']).toBe('')
  })
})

describe('resumenDePrecargados', () => {
  it('dice lo que ya viene cargado para no tener que abrir el bloque', () => {
    const { masDatos } = camposDelAlta(LAYOUT)
    const v = valoresIniciales(CONTEXTO, LAYOUT, ZONA)
    expect(resumenDePrecargados(masDatos, v)).toBe('Ciudad: Santa Cruz · País: Bolivia')
  })

  it('con más de tres, cuenta el resto; sin nada, queda vacío', () => {
    const muchos = ['a', 'b', 'c', 'd', 'e'].map((clave) => campo({ clave, etiqueta: clave }))
    const valores = Object.fromEntries(muchos.map((c) => [`atributos.${c.clave}`, 'x']))
    expect(resumenDePrecargados(muchos, valores)).toBe('a: x · b: x · c: x · y 2 más')
    expect(resumenDePrecargados(muchos, {})).toBe('')
  })

  it('una opción se lee por su etiqueta y un sí o no como «Sí»', () => {
    const signo = LAYOUT[3] as CampoDeLead
    const vip = campo({ clave: 'vip', etiqueta: 'VIP', tipo: 'booleano' })
    expect(
      resumenDePrecargados([signo, vip], { 'atributos.signo': 'leo', 'atributos.vip': true }),
    ).toBe('Signo: Leo · VIP: Sí')
  })
})

const base = () => ({
  ...valoresIniciales(CONTEXTO, LAYOUT, ZONA),
  [CLAVE_DEL_ALTA.telefono]: '700 11 002',
  [CLAVE_DEL_ALTA.nombre]: ' Ana Quispe ',
  'atributos.signo': 'leo',
})
const entrada = (
  valores: Record<string, string | boolean | null | string[]>,
  conSeguimiento = false,
) => ({
  valores,
  layout: LAYOUT,
  contexto: CONTEXTO,
  zona: ZONA,
  ahora: AHORA,
  conSeguimiento,
})

describe('validarAlta: lo que pasa', () => {
  it('el paso de los datos: lo escrito, limpio, y sólo lo que tiene valor', () => {
    const r = validarAlta(entrada(base()))
    expect(r).toEqual({
      ok: true,
      datos: {
        telefono: '700 11 002',
        nombre: 'Ana Quispe',
        origenId: ORIGEN_FB,
        tipo: 'prospecto',
        atributos: { ciudad: 'Santa Cruz', pais: 'Bolivia', signo: 'leo' },
        seguimiento: null,
        recordatorio: null,
      },
    })
  })

  it('con el seguimiento y un recordatorio', () => {
    const r = validarAlta(
      entrada(
        {
          ...base(),
          [CLAVE_DEL_ALTA.resumen]: ' Pidió precio ',
          [CLAVE_DEL_ALTA.detalle]: 'Lo vio en Facebook',
          [CLAVE_DEL_ALTA.recordatorio]: '2026-10-15T09:00',
        },
        true,
      ),
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.datos.seguimiento).toEqual({
        tipoId: TIPO_WA,
        titulo: 'Pidió precio',
        detalle: 'Lo vio en Facebook',
      })
      expect(r.datos.recordatorio).toEqual({ recordarEn: '2026-10-15T13:00:00.000Z' })
    }
  })
})

describe('validarAlta: lo que no pasa', () => {
  it('cada dato que no pasa dice su motivo en su lugar', () => {
    const r = validarAlta(
      entrada({
        ...base(),
        [CLAVE_DEL_ALTA.telefono]: '70abc',
        [CLAVE_DEL_ALTA.nombre]: '  ',
        [CLAVE_DEL_ALTA.origen]: '',
        'atributos.signo': '',
        'atributos.edad': 'mucha',
        'atributos.documento': '#',
      }),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.porCampo).sort()).toEqual(
        [
          'atributos.documento',
          'atributos.edad',
          'atributos.signo',
          'nombre',
          'origen_lead_id',
          'telefono_principal',
        ].sort(),
      )
      expect(r.porCampo['atributos.signo']).toBe('Este dato es obligatorio.')
      expect(r.porCampo[CLAVE_DEL_ALTA.origen]).toBe('Elige de dónde viene el lead.')
    }
  })

  it('un recordatorio en el pasado y un resumen vacío se dicen junto a su campo', () => {
    const r = validarAlta(
      entrada({ ...base(), [CLAVE_DEL_ALTA.recordatorio]: '2026-10-14T08:00' }, true),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.porCampo[CLAVE_DEL_ALTA.recordatorio]).toBe(
        'El recordatorio tiene que ser en el futuro.',
      )
      expect(r.porCampo[CLAVE_DEL_ALTA.resumen]).toBe('Escribe un resumen del seguimiento.')
    }
  })

  it('el seguimiento no se mira en el primer paso', () => {
    const r = validarAlta(entrada({ ...base(), [CLAVE_DEL_ALTA.resumen]: '' }))
    expect(r.ok).toBe(true)
  })

  it('sin origen activo se guarda sin origen; sin código de país el teléfono pide «+»', () => {
    const sinOrigen = validarAlta({
      ...entrada(base()),
      contexto: { ...CONTEXTO, origenes: [] },
    })
    expect(sinOrigen).toMatchObject({ ok: true, datos: { origenId: null } })
    const sinCodigo = validarAlta({
      ...entrada(base()),
      contexto: { ...CONTEXTO, telefonoCc: null },
    })
    expect(sinCodigo.ok).toBe(false)
    const conMas = validarAlta({
      ...entrada({ ...base(), [CLAVE_DEL_ALTA.telefono]: '+54 11 5555-0000' }),
      contexto: { ...CONTEXTO, telefonoCc: null },
    })
    expect(conMas.ok).toBe(true)
  })

  it('un campo desactivado no se valida ni viaja', () => {
    const r = validarAlta(entrada({ ...base(), 'atributos.viejo': '' }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect('viejo' in r.datos.atributos).toBe(false)
    }
  })
})

describe('primerCampoConError', () => {
  it('el primero en el orden del formulario: fijos, requeridos propios, el resto, seguimiento', () => {
    const errores = {
      'atributos.edad': 'x',
      'atributos.signo': 'x',
      'seguimiento.titulo': 'x',
    }
    expect(primerCampoConError(errores, LAYOUT)).toBe('atributos.signo')
    expect(primerCampoConError({ 'atributos.edad': 'x', nombre: 'x' }, LAYOUT)).toBe('nombre')
    expect(primerCampoConError({ 'seguimiento.titulo': 'x' }, LAYOUT)).toBe('seguimiento.titulo')
    expect(primerCampoConError({}, LAYOUT)).toBeNull()
  })
})
