import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import type { CampoDeLead } from './campo'
import {
  CLAVE_DE_EDICION,
  PANEL_EDITAR_LEAD,
  camposEditables,
  campoDeEdicion,
  hayCambios,
  origenesOfrecidos,
  primerCampoConErrorDeEdicion,
  puedeEditarLead,
  validarEdicion,
  valoresDeEdicion,
} from './edicion'
import type { TipoDeLeadEnCatalogo } from './catalogos'
import type { LeadDeFicha, OrigenConEstado } from './ficha'
import { SIN_MARCAS } from './marcas'

const ZONA = 'America/La_Paz'
const WEB = '11111111-1111-4111-8111-111111111111'
const FB = '22222222-2222-4222-8222-222222222222'
const APAGADO = '33333333-3333-4333-8333-333333333333'
const TIPO_PROSPECTO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TIPO_CLIENTE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const TIPO_VIP = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const TIPO_APAGADO = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

const ORIGENES: OrigenConEstado[] = [
  { id: WEB, clave: 'web', nombre: 'Web', activo: true },
  { id: FB, clave: 'fb', nombre: 'Facebook', activo: true },
  { id: APAGADO, clave: 'ref', nombre: 'Referido', activo: false },
]

// Los tipos de lead que trae la base: dos de fábrica, uno agregado por la empresa y uno apagado.
const TIPOS: TipoDeLeadEnCatalogo[] = [
  { id: TIPO_PROSPECTO, clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto', activo: true },
  { id: TIPO_CLIENTE, clave: 'cliente', nombre: 'Cliente', clase: 'cliente', activo: true },
  { id: TIPO_VIP, clave: 'vip', nombre: 'Cliente VIP', clase: 'cliente', activo: true },
  { id: TIPO_APAGADO, clave: 'viejo', nombre: 'Mayorista', clase: 'cliente', activo: false },
]

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
  campo({ clave: 'ciudad', etiqueta: 'Ciudad', orden: 1 }),
  campo({ clave: 'edad', etiqueta: 'Edad', tipo: 'numero', orden: 2 }),
  campo({ clave: 'ci', etiqueta: 'Cédula', tipo: 'documento', soloCartera: true, orden: 3 }),
  campo({ clave: 'viejo', etiqueta: 'Viejo', activo: false, orden: 4 }),
  campo({
    clave: 'signo',
    etiqueta: 'Signo',
    tipo: 'opcion',
    opciones: [
      { clave: 'leo', etiqueta: 'Leo' },
      { clave: 'aries', etiqueta: 'Aries' },
    ],
    orden: 5,
  }),
]

const FICHA: LeadDeFicha = {
  id: '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11',
  numeros: { numero: 12, numeroPropio: null, creadorDelPropio: null },
  nombre: 'Ana Rojas',
  telefonoCc: '+591',
  telefono: '59170011002',
  enCartera: true,
  tipoLeadId: TIPO_PROSPECTO,
  origenId: WEB,
  atributos: { ciudad: 'La Paz', edad: 31, ci: 'CI-1', viejo: 'dato guardado' },
  creadoEn: '2026-10-14T10:00:00Z',
  actualizadoEn: '2026-10-14T10:05:00Z',
  tieneId: null,
  tieneNombre: null,
  telefonos: [],
  recordatoriosVencidos: 0,
  vehiculosVinculados: 0,
  marcas: SIN_MARCAS,
}

function entrada(
  cambios: Record<string, string | boolean | null | string[]> = {},
  ficha: LeadDeFicha = FICHA,
  layout: readonly CampoDeLead[] = LAYOUT,
) {
  const campos = camposEditables(layout, ficha.enCartera)
  const iniciales = valoresDeEdicion(ficha, campos, ZONA, 'es-BO')
  return {
    ficha,
    valores: { ...iniciales, ...cambios },
    iniciales,
    campos,
    origenes: ORIGENES,
    tipos: TIPOS,
    zona: ZONA,
  }
}

describe('quién puede editar', () => {
  const todos: Permisos = [{ clave: 'leads.editar', origenId: null, alcance: 'todos' }]
  const propios: Permisos = [{ clave: 'leads.editar', origenId: null, alcance: 'propios' }]
  it('«todos» edita lo de su cartera, no cualquiera', () => {
    expect(puedeEditarLead(todos, true)).toBe(true)
    expect(puedeEditarLead(todos, false)).toBe(false)
  })
  it('«propios» sólo lo de su cartera', () => {
    expect(puedeEditarLead(propios, true)).toBe(true)
    expect(puedeEditarLead(propios, false)).toBe(false)
  })
  it('sin el permiso, nada', () => {
    expect(puedeEditarLead([], true)).toBe(false)
    expect(puedeEditarLead([{ clave: 'leads.ver', origenId: null, alcance: 'todos' }], true)).toBe(
      false,
    )
  })
  it('el valor de ?panel= es el de la edición', () => {
    expect(PANEL_EDITAR_LEAD).toBe('editar-lead')
  })
})

describe('qué campos se ofrecen', () => {
  it('los activos; un desactivado con dato no se ofrece', () => {
    const claves = camposEditables(LAYOUT, true).map((c) => c.clave)
    expect(claves).toEqual(['ciudad', 'edad', 'ci', 'signo'])
  })
  it('sin la cartera no se ofrecen los privados', () => {
    expect(camposEditables(LAYOUT, false).map((c) => c.clave)).toEqual(['ciudad', 'edad', 'signo'])
  })
})

describe('con qué arranca el formulario', () => {
  it('lo guardado, tal como se ve', () => {
    const campos = camposEditables(LAYOUT, true)
    const valores = valoresDeEdicion(FICHA, campos, ZONA, 'es-BO')
    expect(valores[CLAVE_DE_EDICION.nombre]).toBe('Ana Rojas')
    expect(valores[CLAVE_DE_EDICION.tipo]).toBe(TIPO_PROSPECTO)
    expect(valores[CLAVE_DE_EDICION.origen]).toBe(WEB)
    expect(valores['atributos.ciudad']).toBe('La Paz')
    expect(valores['atributos.edad']).toBe('31')
    expect(valores['atributos.signo']).toBe('')
    // El desactivado no entra al formulario: no se puede ni tocar.
    expect(valores['atributos.viejo']).toBeUndefined()
  })
  it('sin origen, vacío', () => {
    expect(
      valoresDeEdicion({ ...FICHA, origenId: null }, [], ZONA, 'es-BO')[CLAVE_DE_EDICION.origen],
    ).toBe('')
  })
  it('una opción que ya se sacó del campo se sigue ofreciendo', () => {
    const control = campoDeEdicion(LAYOUT[4] as CampoDeLead, 'virgo')
    expect(control.control).toMatchObject({
      tipo: 'opcion',
      opciones: expect.arrayContaining([{ valor: 'virgo', etiqueta: 'virgo (ya no se ofrece)' }]),
    })
  })
  it('un privado lo dice en la etiqueta', () => {
    expect(campoDeEdicion(LAYOUT[2] as CampoDeLead, 'CI-1').etiqueta).toBe(
      'Cédula (solo la cartera)',
    )
  })
})

describe('los orígenes que se ofrecen', () => {
  it('los activos', () => {
    expect(origenesOfrecidos(ORIGENES, WEB).map((o) => o.id)).toEqual([WEB, FB])
  })
  it('y el apagado que el lead ya tiene, marcado', () => {
    const ofrecidos = origenesOfrecidos(ORIGENES, APAGADO)
    expect(ofrecidos.map((o) => o.id)).toEqual([WEB, FB, APAGADO])
    expect(ofrecidos[2]?.activo).toBe(false)
  })
})

describe('qué viaja', () => {
  it('sin tocar nada no viaja nada', () => {
    const validacion = validarEdicion(entrada())
    expect(validacion).toEqual({ ok: true, cambios: {} })
    expect(hayCambios({})).toBe(false)
  })

  it('sólo lo que cambió, con el nombre sin espacios', () => {
    const validacion = validarEdicion(
      entrada({ nombre: '  Ana María Rojas ', 'atributos.ciudad': 'Cochabamba' }),
    )
    expect(validacion).toEqual({
      ok: true,
      cambios: { nombre: 'Ana María Rojas', atributos: { ciudad: 'Cochabamba' } },
    })
  })

  it('un número se manda como número y vaciar un campo lo quita (null)', () => {
    const validacion = validarEdicion(entrada({ 'atributos.edad': '32', 'atributos.ciudad': '' }))
    expect(validacion).toEqual({
      ok: true,
      cambios: { atributos: { edad: 32, ciudad: null } },
    })
  })

  it('el tipo y el origen', () => {
    const validacion = validarEdicion(
      entrada({ [CLAVE_DE_EDICION.tipo]: TIPO_VIP, origen_lead_id: FB }),
    )
    expect(validacion).toEqual({ ok: true, cambios: { tipoLeadId: TIPO_VIP, origenId: FB } })
    expect(hayCambios({ tipoLeadId: TIPO_VIP })).toBe(true)
  })

  it('no manda lo que el formulario no ofreció (un privado ajeno, un campo apagado)', () => {
    const ajeno: LeadDeFicha = { ...FICHA, enCartera: false, atributos: { ciudad: 'La Paz' } }
    const validacion = validarEdicion(entrada({ nombre: 'Otro' }, ajeno))
    expect(validacion).toEqual({ ok: true, cambios: { nombre: 'Otro' } })
  })
})

describe('qué no pasa', () => {
  it('un nombre vacío, o largo', () => {
    const vacio = validarEdicion(entrada({ nombre: '   ' }))
    expect(vacio).toEqual({ ok: false, porCampo: { nombre: 'Escribe el nombre.' } })
    const largo = validarEdicion(entrada({ nombre: 'x'.repeat(121) }))
    expect(largo.ok).toBe(false)
  })

  it('un dato que no cumple su tipo se dice junto al campo', () => {
    const validacion = validarEdicion(entrada({ 'atributos.edad': 'veinte' }))
    expect(validacion.ok).toBe(false)
    if (!validacion.ok) {
      expect(Object.keys(validacion.porCampo)).toEqual(['atributos.edad'])
    }
  })

  it('un requerido nuevo vacío en un lead viejo frena aunque sólo cambie el tipo', () => {
    const layout = [
      ...LAYOUT,
      campo({ clave: 'ocupacion', etiqueta: 'Ocupación', requerido: true }),
    ]
    const validacion = validarEdicion(
      entrada({ [CLAVE_DE_EDICION.tipo]: TIPO_CLIENTE }, FICHA, layout),
    )
    expect(validacion.ok).toBe(false)
    if (!validacion.ok) {
      expect(Object.keys(validacion.porCampo)).toEqual(['atributos.ocupacion'])
      expect(primerCampoConErrorDeEdicion(validacion.porCampo, camposEditables(layout, true))).toBe(
        'atributos.ocupacion',
      )
    }
  })

  it('un privado requerido no se le exige a quien no lo ve', () => {
    const layout = [campo({ clave: 'ci', etiqueta: 'Cédula', soloCartera: true, requerido: true })]
    const ajeno: LeadDeFicha = { ...FICHA, enCartera: false, atributos: {} }
    expect(validarEdicion(entrada({ nombre: 'Otro' }, ajeno, layout))).toEqual({
      ok: true,
      cambios: { nombre: 'Otro' },
    })
    // A la cartera sí: el motivo va junto al campo.
    const propio: LeadDeFicha = { ...FICHA, atributos: {} }
    expect(validarEdicion(entrada({}, propio, layout)).ok).toBe(false)
  })

  it('el origen apagado que ya tiene se conserva; pasar a otro apagado o vaciarlo no', () => {
    const conApagado: LeadDeFicha = { ...FICHA, origenId: APAGADO }
    expect(validarEdicion(entrada({ nombre: 'Otro' }, conApagado))).toEqual({
      ok: true,
      cambios: { nombre: 'Otro' },
    })
    const a = validarEdicion(entrada({ origen_lead_id: APAGADO }))
    expect(a.ok).toBe(false)
    const vaciar = validarEdicion(entrada({ origen_lead_id: '' }))
    expect(vaciar).toEqual({
      ok: false,
      porCampo: { origen_lead_id: 'Elige de dónde viene el lead.' },
    })
  })

  it('el foco va al primero en el orden de la pantalla', () => {
    expect(
      primerCampoConErrorDeEdicion(
        { 'atributos.edad': 'x', nombre: 'y' },
        camposEditables(LAYOUT, true),
      ),
    ).toBe('nombre')
    expect(primerCampoConErrorDeEdicion({}, camposEditables(LAYOUT, true))).toBeNull()
  })
})
