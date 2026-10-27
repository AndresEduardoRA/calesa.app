import { describe, expect, it } from 'vitest'
import type { CampoDeVehiculo, TipoDeCampo } from './campo'
import { camposComunes } from './comunes'
import { validarVehiculo, type Fuentes } from './esquema'
import { formatearParaEditar } from '@/shared/lib/formato'
import { conDatosDeSubasta, valoresIniciales, type ValoresDeFormulario } from './formulario'

function campo(
  clave: string,
  tipo: TipoDeCampo,
  extra: Partial<CampoDeVehiculo> = {},
): CampoDeVehiculo {
  return {
    clave,
    etiqueta: clave,
    tipo,
    opciones: [],
    requerido: false,
    grupo: null,
    enTarjeta: false,
    filtrable: false,
    activo: true,
    valorDefecto: null,
    ...extra,
  }
}

const OPCIONES = [
  { clave: 'automatica', etiqueta: 'Automática' },
  { clave: 'manual', etiqueta: 'Manual' },
]
const CAMPOS = [
  campo('color', 'texto'),
  campo('descripcion', 'texto_largo'),
  campo('cilindros', 'numero'),
  campo('valor', 'moneda'),
  campo('llave', 'booleano'),
  campo('transmision', 'opcion', { opciones: OPCIONES }),
  campo('extras', 'multi_opcion', { opciones: OPCIONES }),
  campo('llegada', 'fecha'),
  campo('subasta', 'fecha_hora'),
  campo('ficha', 'url'),
  campo('chasis', 'vin'),
  campo('lote_interno', 'lote'),
]
const FUENTES: Fuentes = {
  comunes: camposComunes('subasta'),
  campos: CAMPOS,
  categorias: [
    { id: 'c1', nombre: 'SUV', activa: true },
    { id: 'c2', nombre: 'Vieja', activa: false },
  ],
  zona: 'America/La_Paz',
  locale: 'es-BO',
}

const vacios = (fuentes: Fuentes = FUENTES) =>
  valoresIniciales({
    comunes: fuentes.comunes,
    campos: fuentes.campos,
    vehiculo: null,
    locale: 'es-BO',
  })

function validar(cambios: ValoresDeFormulario, fuentes: Fuentes = FUENTES) {
  return validarVehiculo(fuentes, { ...vacios(fuentes), titulo: 'RAV4', ...cambios })
}

function datos(cambios: ValoresDeFormulario, fuentes: Fuentes = FUENTES) {
  const resultado = validar(cambios, fuentes)
  if (!resultado.ok) {
    throw new Error(`no validó: ${JSON.stringify(resultado.porCampo)}`)
  }
  return resultado.datos
}

function motivos(cambios: ValoresDeFormulario, fuentes: Fuentes = FUENTES) {
  const resultado = validar(cambios, fuentes)
  return resultado.ok ? {} : resultado.porCampo
}

describe('datos comunes', () => {
  it('con sólo el título alcanza, y lo vacío viaja como nulo', () => {
    const { comunes, atributos } = datos({ titulo: '  2021 Toyota RAV4  ' })
    expect(comunes.titulo).toBe('2021 Toyota RAV4')
    expect(comunes.marca).toBeNull()
    expect(comunes.anio).toBeNull()
    expect(comunes.placado).toBeNull()
    expect(Object.values(atributos).every((valor) => valor === null)).toBe(true)
  })

  it('el título es obligatorio', () => {
    expect(motivos({ titulo: '   ' })).toEqual({ titulo: 'Este dato es obligatorio.' })
  })

  it('convierte lo escrito: año y kilometraje enteros, precio con coma decimal, VIN en mayúsculas', () => {
    const { comunes } = datos({
      anio: '2021',
      kilometraje: '42000',
      precio: '24500,5',
      vin: ' jtmw1rfv8md012345 ',
      placado: true,
      precioNegociable: false,
    })
    expect(comunes).toMatchObject({
      anio: 2021,
      kilometraje: 42000,
      precio: 24500.5,
      vin: 'JTMW1RFV8MD012345',
      placado: true,
      precioNegociable: false,
    })
  })

  it('rechaza lo que la base rechazaría, diciendo por qué', () => {
    expect(motivos({ anio: '1800' })['anio']).toContain('entre 1900 y 2100')
    expect(motivos({ anio: '2021,5' })['anio']).toContain('entero')
    // 4-25: con el locale de la empresa (es-BO) un punto fuera de un grupo de 3 dice su aviso.
    expect(motivos({ anio: '2021.5' })['anio']).toBe('Usa coma para los decimales: 2021,5.')
    expect(motivos({ anio: 'dos mil' })['anio']).toBeDefined()
    expect(motivos({ precio: '-1' })['precio']).toBeDefined()
    expect(motivos({ vin: 'OOOO' })['vin']).toContain('VIN')
    expect(motivos({ urlOrigen: 'copart.com/lot/1' })['urlOrigen']).toContain('http')
    expect(motivos({ titulo: 'x'.repeat(161) })['titulo']).toContain('160')
  })

  it('la categoría tiene que ser una activa del origen, o la que ya tenía', () => {
    expect(datos({ categoriaId: 'c1' }).comunes.categoriaId).toBe('c1')
    expect(motivos({ categoriaId: 'c2' })['categoriaId']).toBeDefined()
    expect(motivos({ categoriaId: 'otra' })['categoriaId']).toBeDefined()
    const editando = { ...FUENTES, actuales: { atributos: {}, categoriaId: 'c2' } }
    expect(datos({ categoriaId: 'c2' }, editando).comunes.categoriaId).toBe('c2')
  })

  it('un origen manual no lleva lote, plataforma ni enlace', () => {
    const manual = { ...FUENTES, comunes: camposComunes('manual') }
    expect(Object.keys(datos({}, manual).comunes)).not.toContain('lote')
  })
})

describe('campos del layout', () => {
  it('cada tipo se convierte a lo que guarda la base', () => {
    const { atributos } = datos({
      'a.color': ' Gris ',
      'a.descripcion': 'Dos\nlíneas',
      'a.cilindros': '4',
      'a.valor': '9800,50',
      'a.llave': false,
      'a.transmision': 'manual',
      'a.extras': ['manual', 'automatica', 'manual'],
      'a.llegada': '2026-10-13',
      'a.subasta': '2026-10-13T14:30',
      'a.ficha': 'https://copart.com/lot/1',
      'a.chasis': 'kmhd35le5du123456',
      'a.lote_interno': 'L-1',
    })
    expect(atributos).toEqual({
      color: 'Gris',
      descripcion: 'Dos\nlíneas',
      cilindros: 4,
      valor: 9800.5,
      llave: false,
      transmision: 'manual',
      extras: ['manual', 'automatica'],
      llegada: '2026-10-13',
      // La hora escrita es la de la empresa; se guarda el instante.
      subasta: '2026-10-13T18:30:00.000Z',
      ficha: 'https://copart.com/lot/1',
      chasis: 'KMHD35LE5DU123456',
      lote_interno: 'L-1',
    })
  })

  it('rechaza un número que no es número, una fecha imposible y una opción inventada', () => {
    expect(motivos({ 'a.cilindros': 'cuatro' })['a.cilindros']).toBe('Tiene que ser un número.')
    expect(motivos({ 'a.llegada': '2026-02-31' })['a.llegada']).toBeDefined()
    expect(motivos({ 'a.subasta': 'mañana' })['a.subasta']).toBeDefined()
    expect(motivos({ 'a.transmision': 'cvt' })['a.transmision']).toBe('Elige una de las opciones.')
    expect(motivos({ 'a.extras': ['cvt'] })['a.extras']).toBeDefined()
    expect(motivos({ 'a.ficha': 'javascript:alert(1)' })['a.ficha']).toBeDefined()
  })

  it('una opción que ya se sacó del campo vale mientras el vehículo la tenga', () => {
    const editando = {
      ...FUENTES,
      actuales: { atributos: { transmision: 'cvt', extras: ['techo'] }, categoriaId: null },
    }
    expect(
      datos({ 'a.transmision': 'cvt', 'a.extras': ['techo', 'manual'] }, editando).atributos,
    ).toMatchObject({ transmision: 'cvt', extras: ['techo', 'manual'] })
    expect(motivos({ 'a.transmision': 'otra' }, editando)['a.transmision']).toBeDefined()
  })

  it('un requerido vacío no pasa, sea texto, sí o no o lista', () => {
    const conRequeridos = {
      ...FUENTES,
      campos: [
        campo('color', 'texto', { requerido: true }),
        campo('llave', 'booleano', { requerido: true }),
        campo('extras', 'multi_opcion', { opciones: OPCIONES, requerido: true }),
      ],
    }
    expect(motivos({}, conRequeridos)).toEqual({
      'a.color': 'Este dato es obligatorio.',
      'a.llave': 'Este dato es obligatorio.',
      'a.extras': 'Este dato es obligatorio.',
    })
    // Un «no» es un dato: cumple.
    expect(
      datos({ 'a.color': 'Gris', 'a.llave': false, 'a.extras': ['manual'] }, conRequeridos)
        .atributos,
    ).toEqual({ color: 'Gris', llave: false, extras: ['manual'] })
  })

  it('un campo que el formulario no trae cuenta como vacío', () => {
    const resultado = validarVehiculo(FUENTES, { titulo: 'RAV4' })
    expect(resultado.ok).toBe(true)
  })

  it('devuelve todos los campos que fallan, con un motivo cada uno', () => {
    expect(Object.keys(motivos({ titulo: '', anio: 'x', 'a.cilindros': 'y' })).sort()).toEqual([
      'a.cilindros',
      'anio',
      'titulo',
    ])
  })
})

// C14 del 4.13-3c: lo que el formulario escribe de lo guardado (con el locale) el lector lo lee igual, sin aviso.
describe('abrir lo guardado y guardar sin tocar conserva el número', () => {
  it('el precio, un campo numérico del layout y lo que trae la subasta, en es-BO y en en-US', () => {
    const campos = [
      campo('cilindros', 'numero', { valorDefecto: 2.125 }),
      campo('valor', 'moneda', { valorDefecto: 21500.25 }),
      campo('motor', 'numero'),
    ]
    for (const locale of ['es-BO', 'en-US']) {
      const fuentes: Fuentes = { ...FUENTES, campos, locale }
      const iniciales = valoresIniciales({
        comunes: fuentes.comunes,
        campos,
        vehiculo: null,
        locale,
      })
      const valores = conDatosDeSubasta(
        { ...iniciales, titulo: 'RAV4', precio: formatearParaEditar(21500.25, { locale }) },
        { columnas: { anio: 2019 }, atributos: { motor: 3.5 }, sinCoincidencia: [] },
        campos,
        { locale },
      )
      const leido = validarVehiculo(fuentes, valores)
      expect(leido.ok && leido.datos.atributos, locale).toMatchObject({
        cilindros: 2.125,
        valor: 21500.25,
        motor: 3.5,
      })
      expect(leido.ok && leido.datos.comunes, locale).toMatchObject({
        precio: 21500.25,
        anio: 2019,
      })
    }
  })
})
