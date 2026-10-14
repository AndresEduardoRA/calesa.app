import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  atributosDesdeSubasta,
  columnasDesdeSubasta,
  columnasDeEntrada,
  datosDesdeSubasta,
  entradaDeRefresco,
  esEstadoDeSubasta,
  etiquetaDeEstado,
  numeroEnRuta,
  valorEnRuta,
  type CampoConRuta,
} from './subasta'

function ficha(nombre: string): { data: Record<string, unknown>; url: string | null } {
  const texto = readFileSync(join(process.cwd(), 'e2e/fixtures/apibara', nombre), 'utf8')
  const entero = JSON.parse(texto) as { data: Record<string, unknown>; url?: string }
  return { data: entero.data, url: entero.url ?? null }
}

const COPART = ficha('copart.json')
const IAAI = ficha('iaai.json')

const campo = (
  parcial: Partial<CampoConRuta> & Pick<CampoConRuta, 'clave' | 'tipo'>,
): CampoConRuta => ({
  etiqueta: parcial.clave,
  opciones: [],
  activo: true,
  claveApibara: null,
  ...parcial,
})

describe('valorEnRuta', () => {
  it('sigue la ruta con puntos y dice undefined si no está', () => {
    expect(valorEnRuta(COPART.data, 'vehicle_specs.exterior_color')).toBe('Gray')
    expect(valorEnRuta(COPART.data, 'pricing.estimated_cost.median')).toBe(16150)
    expect(valorEnRuta(COPART.data, 'vehicle_specs.nada.mas')).toBeUndefined()
    expect(valorEnRuta(null, 'a')).toBeUndefined()
    expect(valorEnRuta({ a: 'texto' }, 'a.b')).toBeUndefined()
  })
})

describe('columnasDesdeSubasta', () => {
  it('llena la identidad del vehículo desde la respuesta real', () => {
    expect(columnasDesdeSubasta(COPART.data, 'https://www.copart.com/lot/58540656')).toEqual({
      titulo: '2024 FORD BRONCO BIG BEND',
      marca: 'FORD',
      modelo: 'BRONCO',
      anio: 2024,
      vin: '3FMCR9B64RRE04601',
      lote: '58540656',
      plataforma: 'copart',
      kilometraje: 51776,
      url_origen: 'https://www.copart.com/lot/58540656',
    })
  })

  it('no inventa lo que falta ni acepta lo que la base rechazaría', () => {
    expect(columnasDesdeSubasta({})).toEqual({})
    expect(
      columnasDesdeSubasta({ vin: '123', year: 1800, odometer: { km: null }, title: '   ' }),
    ).toEqual({})
    expect(columnasDesdeSubasta(COPART.data, 'javascript:alert(1)').url_origen).toBeUndefined()
  })

  it('el precio de lista nunca sale de la puja', () => {
    expect('precio' in columnasDesdeSubasta(COPART.data)).toBe(false)
  })
})

describe('atributosDesdeSubasta', () => {
  const campos: CampoConRuta[] = [
    campo({ clave: 'color', tipo: 'texto', claveApibara: 'vehicle_specs.exterior_color' }),
    campo({ clave: 'puja', tipo: 'moneda', claveApibara: 'pricing.current_bid_usd' }),
    campo({ clave: 'llave', tipo: 'booleano', claveApibara: 'condition.has_key' }),
    campo({ clave: 'subasta', tipo: 'fecha_hora', claveApibara: 'auction.auction_at' }),
    campo({ clave: 'vendido_dia', tipo: 'fecha', claveApibara: 'auction.last_sold_day' }),
    campo({ clave: 'cilindrada', tipo: 'texto', claveApibara: 'vehicle_specs.engine.size_l' }),
    campo({ clave: 'apagado', tipo: 'texto', claveApibara: 'type', activo: false }),
    campo({ clave: 'manual', tipo: 'texto' }),
  ]

  it('convierte cada dato a la forma de su campo y se salta lo apagado y lo manual', () => {
    const { atributos, sinCoincidencia } = atributosDesdeSubasta(COPART.data, campos)
    expect(atributos).toEqual({
      color: 'Gray',
      puja: 2500,
      llave: true,
      subasta: '2026-10-14T18:00:00.000Z',
    })
    expect(sinCoincidencia).toEqual([])
  })

  it('un número que la API manda como texto sigue siendo número, y no se guardan nulos', () => {
    const { atributos } = atributosDesdeSubasta({ engine: { size_l: '3.5' }, a: { b: null } }, [
      campo({ clave: 'litros', tipo: 'numero', claveApibara: 'engine.size_l' }),
      campo({ clave: 'vacio', tipo: 'texto', claveApibara: 'a.b' }),
    ])
    expect(atributos).toEqual({ litros: 3.5 })
  })

  it('una fecha se guarda como día y una fecha rota no se escribe', () => {
    const { atributos } = atributosDesdeSubasta(
      { dia: '2026-10-01T10:00:00+00:00', roto: 'no es fecha' },
      [
        campo({ clave: 'dia', tipo: 'fecha', claveApibara: 'dia' }),
        campo({ clave: 'roto', tipo: 'fecha_hora', claveApibara: 'roto' }),
      ],
    )
    expect(atributos).toEqual({ dia: '2026-10-01' })
  })

  it('una opción se busca por clave o etiqueta, sin importar mayúsculas ni tildes', () => {
    const opciones = [
      { clave: 'auto', etiqueta: 'Automática' },
      { clave: 'man', etiqueta: 'Manual' },
    ]
    const raw = { t: 'AUTOMATICA', u: 'CVT' }
    const { atributos, sinCoincidencia } = atributosDesdeSubasta(raw, [
      campo({ clave: 'tr', tipo: 'opcion', opciones, claveApibara: 't', etiqueta: 'Transmisión' }),
      campo({ clave: 'otra', tipo: 'opcion', opciones, claveApibara: 'u', etiqueta: 'Otra' }),
    ])
    expect(atributos).toEqual({ tr: 'auto' })
    expect(sinCoincidencia).toEqual([{ clave: 'otra', etiqueta: 'Otra', valor: 'CVT' }])
  })

  it('una lista de opciones se queda con las que coinciden', () => {
    const { atributos } = atributosDesdeSubasta({ banderas: 'Runs;Keys;Raro' }, [
      campo({
        clave: 'banderas',
        tipo: 'multi_opcion',
        claveApibara: 'banderas',
        opciones: [
          { clave: 'runs', etiqueta: 'Runs' },
          { clave: 'keys', etiqueta: 'Keys' },
        ],
      }),
    ])
    expect(atributos).toEqual({ banderas: ['runs', 'keys'] })
  })

  it('lo de IAAI llega igual por las mismas rutas', () => {
    const { atributos } = atributosDesdeSubasta(IAAI.data, [
      campo({ clave: 'motor', tipo: 'texto', claveApibara: 'vehicle_specs.engine.raw' }),
      campo({ clave: 'hp', tipo: 'numero', claveApibara: 'vehicle_specs.engine.hp' }),
    ])
    expect(atributos).toEqual({ motor: '3.5L V-6 DOHC, VVT, 268HP', hp: 268 })
  })
})

describe('datosDesdeSubasta', () => {
  it('junta columnas y atributos', () => {
    const datos = datosDesdeSubasta(
      COPART.data,
      [campo({ clave: 'color', tipo: 'texto', claveApibara: 'vehicle_specs.exterior_color' })],
      COPART.url,
    )
    expect(datos.columnas.lote).toBe('58540656')
    expect(datos.atributos).toEqual({ color: 'Gray' })
  })
})

describe('estados', () => {
  it('cuatro estados con su etiqueta', () => {
    expect(etiquetaDeEstado('en_vivo')).toBe('En vivo')
    expect(esEstadoDeSubasta('vendida')).toBe(true)
    expect(esEstadoDeSubasta('SOLD')).toBe(false)
  })
})

describe('columnasDeEntrada', () => {
  it('conserva lo pegado para seguir a mano', () => {
    expect(
      columnasDeEntrada({
        tipo: 'enlace',
        valor: 'https://www.copart.com/lot/1',
        plataforma: 'copart',
      }),
    ).toEqual({ url_origen: 'https://www.copart.com/lot/1', plataforma: 'copart' })
    expect(columnasDeEntrada({ tipo: 'vin', valor: '3FMCR9B64RRE04601' })).toEqual({
      vin: '3FMCR9B64RRE04601',
    })
    expect(columnasDeEntrada({ tipo: 'lote', valor: '58540656' })).toEqual({ lote: '58540656' })
  })
})

describe('numeroEnRuta', () => {
  it('lee un número de la respuesta o dice que no hay', () => {
    expect(numeroEnRuta(COPART.data, 'pricing.current_bid_usd')).toBe(2500)
    expect(numeroEnRuta(COPART.data, 'pricing.buy_now_usd')).toBeNull()
    expect(numeroEnRuta(COPART.data, 'nada.de.esto')).toBeNull()
  })
})

describe('entradaDeRefresco', () => {
  it('prefiere el enlace, después el lote y después el VIN', () => {
    const base = { urlOrigen: null, lote: null, vin: null }
    expect(
      entradaDeRefresco({ ...base, urlOrigen: 'https://www.copart.com/lot/1', lote: '58540656' }),
    ).toBe('https://www.copart.com/lot/1')
    expect(entradaDeRefresco({ ...base, lote: '58540656', vin: '3FMCR9B64RRE04601' })).toBe(
      '58540656',
    )
    expect(entradaDeRefresco({ ...base, vin: '3FMCR9B64RRE04601' })).toBe('3FMCR9B64RRE04601')
  })

  it('un enlace de otro sitio o un lote que no es número no sirven; sin nada, null', () => {
    expect(
      entradaDeRefresco({ urlOrigen: 'https://www.example.com/x', lote: 'AB-1', vin: null }),
    ).toBeNull()
    expect(
      entradaDeRefresco({
        urlOrigen: 'https://www.example.com/x',
        lote: null,
        vin: '3FMCR9B64RRE04601',
      }),
    ).toBe('3FMCR9B64RRE04601')
    expect(entradaDeRefresco({ urlOrigen: null, lote: null, vin: null })).toBeNull()
  })
})
