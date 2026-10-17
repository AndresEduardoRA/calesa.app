import { describe, expect, it } from 'vitest'
import { camposDeLeadDesde, type CampoDeLead } from '../campo'
import {
  conDestino,
  emparejarColumnas,
  objetivosDeImportacion,
  objetivosSinColumna,
} from './emparejar'

function campos(): CampoDeLead[] {
  const base = {
    opciones: [],
    requerido: false,
    valor_defecto: null,
    valor_defecto_empresa: null,
    grupo: null,
    en_tabla: false,
    filtrable: false,
    solo_cartera: false,
    es_sistema: false,
    activo: true,
    actualizado_en: '2026-10-14T20:00:00+00:00',
  }
  return camposDeLeadDesde([
    {
      ...base,
      id: '00000000-0000-0000-0000-000000000001',
      clave: 'ciudad',
      etiqueta: 'Ciudad',
      tipo: 'texto',
      orden: 10,
    },
    {
      ...base,
      id: '00000000-0000-0000-0000-000000000002',
      clave: 'cedula',
      etiqueta: 'Cédula',
      tipo: 'documento',
      orden: 20,
      solo_cartera: true,
    },
    {
      ...base,
      id: '00000000-0000-0000-0000-000000000003',
      clave: 'notas',
      etiqueta: 'Notas',
      tipo: 'texto_largo',
      orden: 30,
    },
    {
      ...base,
      id: '00000000-0000-0000-0000-000000000004',
      clave: 'viejo',
      etiqueta: 'Dato viejo',
      tipo: 'texto',
      orden: 40,
      activo: false,
    },
    {
      ...base,
      id: '00000000-0000-0000-0000-000000000005',
      clave: 'edad',
      etiqueta: 'Edad',
      tipo: 'numero',
      orden: 50,
      requerido: true,
    },
  ])
}

describe('objetivosDeImportacion', () => {
  it('los cuatro fijos y los campos activos, sin los apagados', () => {
    const ids = objetivosDeImportacion(campos()).map((o) => o.id)
    expect(ids).toEqual([
      'nombre',
      'telefono_principal',
      'tipo',
      'origen_lead_id',
      'atributos.ciudad',
      'atributos.cedula',
      'atributos.notas',
      'atributos.edad',
    ])
  })
})

describe('emparejarColumnas', () => {
  const objetivos = objetivosDeImportacion(campos())

  it('por etiqueta o clave, sin mayúsculas ni tildes', () => {
    const { destinos, avisos } = emparejarColumnas(
      ['NOMBRE', 'teléfono', 'Cedula', 'ciudad', 'Notas', 'TIPO', 'Origen'],
      objetivos,
    )
    expect(destinos).toEqual([
      'nombre',
      'telefono_principal',
      'atributos.cedula',
      'atributos.ciudad',
      'atributos.notas',
      'tipo',
      'origen_lead_id',
    ])
    expect(avisos).toEqual([])
  })

  it('lo que no se empareja se ignora y se dice, también un campo apagado', () => {
    const { destinos, avisos } = emparejarColumnas(
      ['Nombre', 'Dato viejo', 'Color favorito'],
      objetivos,
    )
    expect(destinos).toEqual(['nombre', null, null])
    expect(avisos).toHaveLength(2)
    expect(avisos[0]).toContain('Dato viejo')
  })

  it('una columna repetida: la primera manda y la otra se dice', () => {
    const { destinos, avisos } = emparejarColumnas(['Nombre', 'Teléfono', 'nombre'], objetivos)
    expect(destinos).toEqual(['nombre', 'telefono_principal', null])
    expect(avisos[0]).toContain('repite')
  })

  it('un encabezado «__proto__» o «constructor» no es una clave: sólo un texto sin pareja', () => {
    const { destinos, avisos } = emparejarColumnas(
      ['__proto__', 'constructor', 'Nombre', 'toString'],
      objetivos,
    )
    expect(destinos).toEqual([null, null, 'nombre', null])
    expect(avisos).toHaveLength(3)
    // Nada se escribió en el prototipo de los objetos.
    expect(({} as Record<string, unknown>)['nombre']).toBeUndefined()
    expect(Object.keys(Object.prototype)).toEqual([])
  })

  it('un encabezado vacío se ignora sin avisar', () => {
    const { destinos, avisos } = emparejarColumnas(['Nombre', '', '  '], objetivos)
    expect(destinos).toEqual(['nombre', null, null])
    expect(avisos).toEqual([])
  })
})

describe('emparejarColumnas: el número de un lead', () => {
  const objetivos = objetivosDeImportacion(campos())

  it('una columna con el número de un lead no se importa y dice que lo pone el sistema', () => {
    const { destinos, avisos } = emparejarColumnas(
      ['N.º', 'Nombre', 'Teléfono', 'N.º propio', 'Tu n.º'],
      objetivos,
    )
    expect(destinos).toEqual([null, 'nombre', 'telefono_principal', null, null])
    expect(avisos).toEqual([
      'La columna «N.º» no se importa: el número de un lead lo pone el sistema.',
      'La columna «N.º propio» no se importa: el número de un lead lo pone el sistema.',
      'La columna «Tu n.º» no se importa: el número de un lead lo pone el sistema.',
    ])
  })

  it('un campo del layout que se llama «Número» sigue siendo un campo, no el número del lead', () => {
    const conNumero = camposDeLeadDesde([
      {
        opciones: [],
        requerido: false,
        valor_defecto: null,
        valor_defecto_empresa: null,
        grupo: null,
        en_tabla: false,
        filtrable: false,
        solo_cartera: false,
        es_sistema: false,
        activo: true,
        actualizado_en: '2026-10-14T20:00:00+00:00',
        id: '00000000-0000-0000-0000-000000000009',
        clave: 'licencia',
        etiqueta: 'Número',
        tipo: 'texto',
        orden: 10,
      },
    ])
    const { destinos, avisos } = emparejarColumnas(['Número'], objetivosDeImportacion(conNumero))
    expect(destinos).toEqual(['atributos.licencia'])
    expect(avisos).toEqual([])
  })
})

describe('conDestino', () => {
  it('un dato lo lleva una sola columna: la anterior se ignora', () => {
    expect(conDestino(['nombre', 'telefono_principal', null], 2, 'nombre')).toEqual([
      null,
      'telefono_principal',
      'nombre',
    ])
  })

  it('«ignorar» deja la columna sin destino', () => {
    expect(conDestino(['nombre', 'telefono_principal'], 1, null)).toEqual(['nombre', null])
  })
})

describe('objetivosSinColumna', () => {
  const objetivos = objetivosDeImportacion(campos())

  it('lo que se exige y nadie lleva: nombre, teléfono y los requeridos activos', () => {
    expect(objetivosSinColumna([null, null], objetivos).map((o) => o.id)).toEqual([
      'nombre',
      'telefono_principal',
      'atributos.edad',
    ])
  })

  it('con todo emparejado no falta nada', () => {
    expect(
      objetivosSinColumna(['nombre', 'telefono_principal', 'atributos.edad'], objetivos),
    ).toEqual([])
  })
})
