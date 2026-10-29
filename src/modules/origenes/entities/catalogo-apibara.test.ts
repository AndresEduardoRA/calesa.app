import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../scripts/lib/definicion-sql'
import { CATALOGO_APIBARA, GRUPOS_DEL_CATALOGO, rutaIgnorada } from './catalogo-apibara'

function fixture(nombre: string): Record<string, unknown> {
  const texto = readFileSync(join(process.cwd(), 'e2e/fixtures/apibara', nombre), 'utf8')
  const entero = JSON.parse(texto) as { data: Record<string, unknown> }
  return entero.data
}

// Las hojas de un objeto: lo que no es objeto (las listas y los nulos incluidos), con su ruta.
function hojas(valor: unknown, ruta = ''): { ruta: string; valor: unknown }[] {
  if (valor !== null && typeof valor === 'object' && !Array.isArray(valor)) {
    return Object.entries(valor).flatMap(([clave, hijo]) =>
      hojas(hijo, ruta === '' ? clave : `${ruta}.${clave}`),
    )
  }
  return [{ ruta, valor }]
}

describe('catálogo de apibara', () => {
  const rutas = new Set(
    CATALOGO_APIBARA.flatMap((dato) => (dato.claveApibara === null ? [] : [dato.claveApibara])),
  )

  it('cada dato normalizado de las respuestas reales es un campo o se ignora a propósito', () => {
    for (const nombre of ['copart.json', 'iaai.json']) {
      const sinCampo = hojas(fixture(nombre)).filter(
        (hoja) =>
          !Array.isArray(hoja.valor) &&
          !rutaIgnorada(hoja.ruta) &&
          !rutas.has(hoja.ruta) &&
          // `series: null` en IAAI: el grupo existe en Copart con sus hijos.
          ![...rutas].some((ruta) => ruta.startsWith(`${hoja.ruta}.`)),
      )
      expect(
        sinCampo.map((hoja) => hoja.ruta),
        nombre,
      ).toEqual([])
    }
  })

  it('cada ruta del catálogo aparece en alguna respuesta real, salvo las que sólo trae uno', () => {
    const vistas = new Set(
      ['copart.json', 'iaai.json'].flatMap((nombre) =>
        hojas(fixture(nombre)).map((hoja) => hoja.ruta),
      ),
    )
    const sinVer = [...rutas].filter((ruta) => !vistas.has(ruta))
    expect(sinVer).toEqual([])
  })

  it('ningún dato extra nace público, en tarjeta o filtrable; los 17 de siempre conservan lo suyo', () => {
    const extras = CATALOGO_APIBARA.filter((dato) => !dato.esSistema)
    expect(extras.length).toBeGreaterThan(80)
    expect(extras.some((dato) => dato.publicoWeb || dato.enTarjeta || dato.filtrable)).toBe(false)
    expect(CATALOGO_APIBARA.filter((dato) => dato.esSistema)).toHaveLength(17)
  })

  it('un dato que la API no trae queda sin ruta, y nada fuerza un tipo que su valor no tiene', () => {
    const sinRuta = CATALOGO_APIBARA.filter((dato) => dato.claveApibara === null).map(
      (d) => d.clave,
    )
    expect(sinRuta.sort()).toEqual([
      'banderas_subasta',
      'cilindros',
      'enciende_y_anda',
      'nota_subasta',
    ])
    // Los de opciones sin opciones del preset pasaron a texto: un valor de la API no calza en una lista vacía.
    expect(CATALOGO_APIBARA.some((dato) => dato.tipo === 'opcion')).toBe(false)
  })

  it('tiene secciones con nombre y en orden estable', () => {
    expect(GRUPOS_DEL_CATALOGO[0]).toBe('Vehículo')
    expect(GRUPOS_DEL_CATALOGO).toContain('Registro de apibara')
    expect(new Set(CATALOGO_APIBARA.map((dato) => dato.orden)).size).toBe(CATALOGO_APIBARA.length)
  })

  it('la regla de lo que se ignora es la del SQL', () => {
    const funcion = definicionSql('_apibara_ruta_ignorada').texto
    for (const ruta of [
      'title',
      'odometer.km',
      'auction.auction_at',
      'auction.diff_minutes',
      'seller.class',
      'condition.run_condition.class_hint',
      'media.items_count',
    ]) {
      expect(rutaIgnorada(ruta), ruta).toBe(true)
      expect(funcion, ruta).toContain(`'${ruta}'`)
    }
    expect(rutaIgnorada('details.sale_status')).toBe(true)
    expect(rutaIgnorada('auction.countdown.days')).toBe(true)
    expect(rutaIgnorada('media.items')).toBe(true)
    expect(rutaIgnorada('pricing.current_bid_usd')).toBe(false)
    expect(rutaIgnorada('vehicle_specs.engine.raw')).toBe(false)
  })
})
