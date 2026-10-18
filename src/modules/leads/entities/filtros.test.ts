import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import type { TipoDeLeadEnCatalogo } from './catalogos'
import { columnaParaFiltrar, type CampoDeLead } from './campo'
import {
  condicionesDeLeads,
  esquemaDeFiltrosDeLeads,
  interpretarBusqueda,
  opcionesDeOrigen,
  privadosFiltrando,
} from './filtros'

function campo(clave: string, extra: Partial<CampoDeLead> = {}): CampoDeLead {
  return {
    id: `id-${clave}`,
    clave,
    etiqueta: clave.toUpperCase(),
    tipo: 'texto',
    opciones: [],
    requerido: false,
    valorDefecto: null,
    grupo: null,
    orden: 0,
    esSistema: false,
    activo: true,
    actualizadoEn: '2026-10-14T00:00:00Z',
    enTabla: false,
    filtrable: true,
    soloCartera: false,
    privacidadPendiente: null,
    valorDefectoEmpresa: null,
    ...extra,
  }
}

const ORIGENES = [
  { id: 'o1', clave: 'web', nombre: 'Web' },
  { id: 'o2', clave: 'facebook', nombre: 'Facebook' },
]
const CAMPOS = [
  campo('ciudad'),
  campo('edad', { tipo: 'numero' }),
  campo('ci', { tipo: 'documento', soloCartera: true }),
  campo('notas', { filtrable: false }),
  campo('apagado', { activo: false }),
  campo('signo', {
    tipo: 'opcion',
    opciones: [
      { clave: 'aries', etiqueta: 'Aries' },
      { clave: 'leo', etiqueta: 'Leo' },
    ],
  }),
]

// Los tipos de lead de la base: dos de fábrica, uno que agregó la empresa y uno apagado.
const TIPOS: TipoDeLeadEnCatalogo[] = [
  { id: 't-pro', clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto', activo: true },
  { id: 't-cli', clave: 'cliente', nombre: 'Cliente', clase: 'cliente', activo: true },
  { id: 't-vip', clave: 'vip', nombre: 'Cliente VIP', clase: 'cliente', activo: true },
  { id: 't-may', clave: 'mayorista', nombre: 'Mayorista', clase: 'cliente', activo: false },
]

const esquema = (verTodos = false) =>
  esquemaDeFiltrosDeLeads({
    campos: CAMPOS,
    origenes: ORIGENES,
    tipos: TIPOS,
    verTodos,
    etiquetas: [],
  })

describe('esquemaDeFiltrosDeLeads', () => {
  it('lleva tus marcas, tipo y origen y un filtro por cada campo filtrable activo, con su etiqueta de fila', () => {
    const claves = esquema().filtros.map((f) => f.clave)
    expect(claves).toEqual([
      'tachados',
      'favoritos',
      'tipo',
      'origen',
      'a.ciudad',
      'a.edad',
      'a.ci',
      'a.signo',
    ])
    expect(esquema().secciones?.map((s) => s.titulo)).toEqual(['Tus marcas', 'Datos del lead'])
    expect(
      esquema()
        .filtros.filter((f) => f.seccion === 'datos')
        .map((f) => f.clave),
    ).toEqual(['tipo', 'origen', 'a.ciudad', 'a.edad', 'a.ci', 'a.signo'])
    expect(esquema().busqueda?.etiqueta).toBe('Buscar por nombre o número')
    expect(esquema().filtros.find((f) => f.clave === 'a.edad')?.etiqueta).toBe('EDAD')
  })

  it('un campo sin opciones configuradas o apagado no se ofrece; sin orígenes, tampoco el filtro', () => {
    const sin = esquemaDeFiltrosDeLeads({
      campos: [campo('signo', { tipo: 'opcion' })],
      origenes: [],
      tipos: TIPOS,
      verTodos: false,
      etiquetas: [],
    })
    expect(sin.filtros.map((f) => f.clave)).toEqual(['tachados', 'favoritos', 'tipo'])
  })

  it('las opciones del filtro de tipo salen de la base: primero los activos y después los apagados «(inactivo)», con la clave en la URL', () => {
    const tipo = esquema().filtros.find((f) => f.clave === 'tipo')
    expect(tipo && 'opciones' in tipo ? tipo.opciones : null).toEqual([
      { valor: 'prospecto', etiqueta: 'Prospecto' },
      { valor: 'cliente', etiqueta: 'Cliente' },
      { valor: 'vip', etiqueta: 'Cliente VIP' },
      { valor: 'mayorista', etiqueta: 'Mayorista (inactivo)' },
    ])
  })

  it('sin ningún tipo en la base no hay filtro de tipo', () => {
    const sin = esquemaDeFiltrosDeLeads({
      campos: [],
      origenes: [],
      tipos: [],
      verTodos: false,
      etiquetas: [],
    })
    expect(sin.filtros.map((f) => f.clave)).toEqual(['tachados', 'favoritos'])
  })

  it('sólo quien ve «todos» recibe la aclaración en un filtro privado', () => {
    const delPrivado = (verTodos: boolean) =>
      esquema(verTodos).filtros.find((f) => f.clave === 'a.ci')
    expect(delPrivado(true)?.ayuda).toMatch(/solo busca en tus leads/i)
    expect(delPrivado(false)?.ayuda).toBeUndefined()
    expect(esquema(true).filtros.find((f) => f.clave === 'a.ciudad')?.ayuda).toBeUndefined()
  })
})

describe('interpretarBusqueda', () => {
  it('un número, con o sin #, busca el número y el texto; el resto, sólo el nombre', () => {
    expect(interpretarBusqueda(' 124 ')).toEqual({ texto: '124', numero: 124, soloNumero: false })
    expect(interpretarBusqueda('Ana 124')).toEqual({
      texto: 'Ana 124',
      numero: null,
      soloNumero: false,
    })
    expect(interpretarBusqueda('59170000001')).toEqual({
      texto: '59170000001',
      numero: 59170000001,
      soloNumero: false,
    })
  })

  it('«#124» busca sólo el número; un # delante de un texto no', () => {
    expect(interpretarBusqueda('#124')).toEqual({ texto: '124', numero: 124, soloNumero: true })
    expect(interpretarBusqueda('  #124 ')?.soloNumero).toBe(true)
    expect(interpretarBusqueda('#Ana')).toEqual({ texto: 'Ana', numero: null, soloNumero: false })
  })

  it('vacío no busca; un número demasiado largo no se trata como número', () => {
    expect(interpretarBusqueda('  ')).toBeNull()
    expect(interpretarBusqueda('#')).toBeNull()
    expect(interpretarBusqueda('1234567890123456')?.numero).toBeNull()
  })

  it('lo que escribió la persona viaja como texto, sin tocar (el saneado es de infra)', () => {
    expect(interpretarBusqueda('50%_, "x"')).toEqual({
      texto: '50%_, "x"',
      numero: null,
      soloNumero: false,
    })
  })
})

describe('condicionesDeLeads', () => {
  const leer = (url: string) =>
    leerFiltros(esquema(true), Object.fromEntries(new URLSearchParams(url)))

  it('sin filtros y en «todos» sólo oculta los tachados; en «míos», también la cartera', () => {
    const sinTachados = { tipo: 'tachado', valor: false }
    expect(condicionesDeLeads(CAMPOS, leer(''), { soloMios: false })).toEqual([sinTachados])
    expect(condicionesDeLeads(CAMPOS, leer(''), { soloMios: true })).toEqual([
      { tipo: 'en_cartera', desdeLaCartera: false },
      sinTachados,
    ])
  })

  it('traduce tipo, origen, campos y búsqueda', () => {
    const condiciones = condicionesDeLeads(
      CAMPOS,
      leer('q=%23124&tipo=cliente&origen=o1&a.ciudad=cruz&a.edad.min=30&a.signo=leo'),
      { soloMios: false, tipos: TIPOS },
    )
    expect(condiciones).toContainEqual({
      tipo: 'busqueda',
      texto: '124',
      numero: 124,
      soloNumero: true,
      idsDelNumero: [],
    })
    expect(condiciones).toContainEqual({
      tipo: 'columna_en',
      // La URL lleva la clave; la base filtra por el id.
      columna: 'tipo_lead_id',
      valores: ['t-cli'],
    })
    expect(condiciones).toContainEqual({
      tipo: 'columna_en',
      columna: 'origen_lead_id',
      valores: ['o1'],
    })
    expect(condiciones).toContainEqual({
      tipo: 'atributo_texto',
      clave: 'ciudad',
      texto: 'cruz',
      columna: 'atributos_publicos',
    })
    expect(condiciones).toContainEqual({
      tipo: 'atributo_rango_numero',
      clave: 'edad',
      min: 30,
      max: null,
      columna: 'atributos_publicos',
    })
    expect(condiciones).toContainEqual({
      tipo: 'atributos_contienen',
      alternativas: [{ signo: 'leo' }],
      columna: 'atributos_publicos',
    })
    // Sólo campos públicos: no hace falta acotar a la cartera.
    expect(condiciones).not.toContainEqual({ tipo: 'en_cartera' })
  })
})

describe('condicionesDeLeads: la columna de cada campo (9h)', () => {
  const leer = (url: string) =>
    leerFiltros(esquema(true), Object.fromEntries(new URLSearchParams(url)))

  it('un campo público se filtra por la copia de lo público; uno privado, por lo recortado y sólo en la cartera', () => {
    const condiciones = condicionesDeLeads(CAMPOS, leer('a.ciudad=cruz&a.ci=123'), {
      soloMios: false,
    })
    expect(condiciones).toContainEqual({
      tipo: 'atributo_texto',
      clave: 'ciudad',
      texto: 'cruz',
      columna: 'atributos_publicos',
    })
    expect(condiciones).toContainEqual({
      tipo: 'atributo_texto',
      clave: 'ci',
      texto: '123',
      columna: 'atributos',
    })
    expect(condiciones.filter((c) => c.tipo === 'en_cartera')).toHaveLength(1)
    // En «míos» la cartera ya está: no se repite.
    const mios = condicionesDeLeads(CAMPOS, leer('a.ci=123'), { soloMios: true })
    expect(mios.filter((c) => c.tipo === 'en_cartera')).toHaveLength(1)
  })

  it('un campo con un cambio de privacidad a medias se filtra por lo recortado (la copia está incompleta)', () => {
    for (const privacidadPendiente of ['a_privado', 'a_publico'] as const) {
      const ciudad = campo('ciudad', {
        soloCartera: privacidadPendiente === 'a_privado',
        privacidadPendiente,
      })
      expect(columnaParaFiltrar(ciudad)).toBe('atributos')
    }
    expect(columnaParaFiltrar(campo('ciudad'))).toBe('atributos_publicos')
    expect(columnaParaFiltrar(campo('ci', { soloCartera: true }))).toBe('atributos')
  })

  it('un origen o un tipo que no existe, o un campo apagado, no llegan a la base', () => {
    const condiciones = condicionesDeLeads(
      CAMPOS,
      leer('tipo=otro&origen=ajeno&a.apagado=x&a.notas=y&a.fantasma=z&tachados=incluir'),
      { soloMios: false, tipos: TIPOS },
    )
    expect(condiciones).toEqual([])
  })
})

describe('privadosFiltrando', () => {
  it('nombra los privados con un filtro puesto', () => {
    const valores = leerFiltros(esquema(true), { 'a.ci': '123', 'a.ciudad': 'cruz' })
    expect(privadosFiltrando(CAMPOS, valores)).toEqual(['CI'])
    expect(privadosFiltrando(CAMPOS, leerFiltros(esquema(true), { 'a.ciudad': 'cruz' }))).toEqual(
      [],
    )
  })
})

describe('opcionesDeOrigen', () => {
  it('primero los activos en su orden y después los desactivados, marcados', () => {
    expect(
      opcionesDeOrigen([
        { id: 'a', clave: 'a', nombre: 'Apagado', activo: false },
        { id: 'b', clave: 'b', nombre: 'Bueno', activo: true },
        { id: 'c', clave: 'c', nombre: 'Corriente' },
      ]),
    ).toEqual([
      { valor: 'b', etiqueta: 'Bueno' },
      { valor: 'c', etiqueta: 'Corriente' },
      { valor: 'a', etiqueta: 'Apagado (inactivo)' },
    ])
  })

  it('sin orígenes no hay opciones', () => {
    expect(opcionesDeOrigen([])).toEqual([])
  })
})
