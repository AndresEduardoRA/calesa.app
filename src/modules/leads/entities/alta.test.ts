import { describe, expect, it } from 'vitest'
import type { CampoDeLead } from './campo'
import {
  CLAVE_DEL_ALTA,
  avisoDelPieDelAlta,
  camposDelAlta,
  campoDelAlta,
  primerCampoConError,
  resumenDePrecargados,
  textoDeLeadGuardado,
  valoresIniciales,
  validarAlta,
  type ContextoDeAlta,
} from './alta'

const ZONA = 'America/La_Paz'

const ORIGEN_WEB = '11111111-1111-4111-8111-111111111111'
const ORIGEN_FB = '22222222-2222-4222-8222-222222222222'
const TIPO_WA = '33333333-3333-4333-8333-333333333333'
const TIPO_LLAMADA = '44444444-4444-4444-8444-444444444444'
const TIPO_PRO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TIPO_CLI = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const CONTEXTO: ContextoDeAlta = {
  telefonoCc: '+591',
  origenes: [
    { id: ORIGEN_FB, nombre: 'Facebook' },
    { id: ORIGEN_WEB, nombre: 'Web' },
  ],
  tipos: [
    { id: TIPO_PRO, nombre: 'Prospecto', clase: 'prospecto' },
    { id: TIPO_CLI, nombre: 'Cliente', clase: 'cliente' },
  ],
  tipoPorDefectoId: TIPO_PRO,
  tiposDeSeguimiento: [
    { id: TIPO_WA, nombre: 'WhatsApp' },
    { id: TIPO_LLAMADA, nombre: 'Llamada' },
  ],
  ultimoOrigenId: null,
  origenPorDefectoId: null,
  topes: { origenes: 100, tipos: 100, tiposDeSeguimiento: 100 },
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
    privacidadPendiente: null,
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
  it('arranca con el primer origen, el tipo que propone la base y la ciudad de la empresa', () => {
    const v = valoresIniciales(CONTEXTO, LAYOUT, ZONA, 'es-BO')
    expect(v[CLAVE_DEL_ALTA.origen]).toBe(ORIGEN_FB)
    expect(v[CLAVE_DEL_ALTA.tipo]).toBe(TIPO_PRO)
    expect(Object.keys(v).some((clave) => clave.startsWith('seguimiento'))).toBe(false)
    expect(v['atributos.ciudad']).toBe('Santa Cruz')
    expect(v['atributos.pais']).toBe('Bolivia')
    expect(v['atributos.edad']).toBe('')
    expect('atributos.viejo' in v).toBe(false)
  })

  it('el último origen usado gana', () => {
    const v = valoresIniciales({ ...CONTEXTO, ultimoOrigenId: ORIGEN_WEB }, LAYOUT, ZONA, 'es-BO')
    expect(v[CLAVE_DEL_ALTA.origen]).toBe(ORIGEN_WEB)
  })

  it('sin orígenes activos no hay origen, y sin dato de la empresa la ciudad queda vacía', () => {
    const v = valoresIniciales(
      { ...CONTEXTO, origenes: [], empresa: { ciudad: null, pais: null } },
      LAYOUT,
      ZONA,
      'es-BO',
    )
    expect(v[CLAVE_DEL_ALTA.origen]).toBe('')
    expect(v['atributos.ciudad']).toBe('')
  })
})

describe('resumenDePrecargados', () => {
  it('dice lo que ya viene cargado para no tener que abrir el bloque', () => {
    const { masDatos } = camposDelAlta(LAYOUT)
    const v = valoresIniciales(CONTEXTO, LAYOUT, ZONA, 'es-BO')
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
  ...valoresIniciales(CONTEXTO, LAYOUT, ZONA, 'es-BO'),
  [CLAVE_DEL_ALTA.telefono]: '700 11 002',
  [CLAVE_DEL_ALTA.nombre]: ' Ana Quispe ',
  'atributos.signo': 'leo',
})
const entrada = (valores: Record<string, string | boolean | null | string[]>) => ({
  valores,
  layout: LAYOUT,
  contexto: CONTEXTO,
  zona: ZONA,
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
        tipoLeadId: TIPO_PRO,
        atributos: { ciudad: 'Santa Cruz', pais: 'Bolivia', signo: 'leo' },
        seguimiento: null,
        recordatorio: null,
      },
    })
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

  it('el primer seguimiento no es de esta validación: viaja vacío', () => {
    const r = validarAlta(entrada(base()))
    expect(r).toMatchObject({ ok: true, datos: { seguimiento: null, recordatorio: null } })
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
  it('el primero en el orden del formulario: fijos, requeridos propios y el resto', () => {
    const errores = { 'atributos.edad': 'x', 'atributos.signo': 'x' }
    expect(primerCampoConError(errores, LAYOUT)).toBe('atributos.signo')
    expect(primerCampoConError({ 'atributos.edad': 'x', nombre: 'x' }, LAYOUT)).toBe('nombre')
    expect(primerCampoConError({}, LAYOUT)).toBeNull()
  })
})

describe('el pie del drawer y el aviso de un lead guardado', () => {
  it('sin nada escrito dice que se crea sin seguimiento y que se anota después desde la ficha', () => {
    expect(avisoDelPieDelAlta({ hayTipos: true, hayAlgoEscrito: false })).toBe(
      'Se creará sin primer seguimiento. Podrás anotarlo después desde la ficha.',
    )
  })

  it('con algo escrito dice que se guarda con él', () => {
    expect(avisoDelPieDelAlta({ hayTipos: true, hayAlgoEscrito: true })).toBe(
      'Se guardará con el primer seguimiento que escribiste.',
    )
  })

  it('sin tipos activos lo dice y no bloquea', () => {
    expect(avisoDelPieDelAlta({ hayTipos: false, hayAlgoEscrito: false })).toBe(
      'No hay tipos de seguimiento activos: se creará sin primer seguimiento. Podrás anotarlo después desde la ficha.',
    )
  })

  it('el lead guardado dice si entró sin seguimiento y si se tomó', () => {
    const base = {
      numeros: { numero: 124, numeroPropio: 12, creadorDelPropio: null },
      adoptado: false,
      conSeguimiento: true,
    }
    expect(textoDeLeadGuardado(base)).toBe('Lead creado · N.º 124')
    expect(textoDeLeadGuardado({ ...base, adoptado: true })).toBe('Lead tomado · N.º 124')
    expect(textoDeLeadGuardado({ ...base, conSeguimiento: false })).toBe(
      'Lead creado sin seguimiento · N.º 124',
    )
    expect(textoDeLeadGuardado({ ...base, adoptado: true, conSeguimiento: false })).toBe(
      'Lead tomado sin seguimiento · N.º 124',
    )
  })
})
