import { describe, expect, it } from 'vitest'
import type { ContextoDeImportacion } from './contexto'
import { preparadorDeFilas, prepararFilas, type EntradaDePreparacion } from './filas'

// Preparar por tramos (9.06-4b): la importación total de `/datos` convierte de a 500 filas y tiene que importar exactamente lo mismo que
// una pasada, con la misma numeración y los repetidos que cruzan el borde de un tramo.
const WEB = '11111111-1111-4111-8111-111111111111'
const TIPO_PRO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const CONTEXTO: ContextoDeImportacion = {
  telefonoCc: '+591',
  origenes: [{ id: WEB, clave: 'web', nombre: 'Web' }],
  tipos: [{ id: TIPO_PRO, clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto' }],
  tipoPorDefectoId: TIPO_PRO,
  tiposDeSeguimiento: [],
  ultimoOrigenId: null,
  origenPorDefectoId: null,
  topes: { origenes: 100, tipos: 100, tiposDeSeguimiento: 100 },
  empresa: { ciudad: null, pais: null },
}

function sinFilas(): Omit<EntradaDePreparacion, 'filas'> {
  let n = 0
  return {
    destinos: ['nombre', 'telefono_principal', 'tipo_lead_id'],
    campos: [],
    contexto: CONTEXTO,
    zona: 'America/La_Paz',
    locale: 'es-BO',
    eleccion: { origenId: WEB, tipoLeadId: TIPO_PRO },
    nuevoId: () => `id-${String((n += 1))}`,
  }
}

const FILAS = [
  ['Ana', '70000001', ''],
  ['Beto', '70000003', ''],
  ['Caro', '70000002', ''],
  ['Dani', '70000004', ''],
  ['Eva', '70000002', ''],
  ['Fede', '70000005', 'Inventado'],
  ['Gus', '+591 70000002', ''],
]

describe('preparadorDeFilas: por tramos, lo mismo que de una vez', () => {
  it('numera y marca los repetidos que cruzan el borde de un tramo', () => {
    const deUnaVez = prepararFilas({ ...sinFilas(), filas: FILAS })
    const preparador = preparadorDeFilas(sinFilas())
    const porTramos = [0, 3, 6].flatMap((desde) => preparador(FILAS.slice(desde, desde + 3), desde))
    expect(porTramos).toEqual(deUnaVez)
    expect(porTramos.map((f) => f.fila)).toEqual([2, 3, 4, 5, 6, 7, 8])
    expect(porTramos.map((f) => f.pedido !== null)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ])
    expect(porTramos[4]?.motivos[0]?.motivo).toBe('Este teléfono ya está en la fila 4 del archivo.')
    expect(porTramos[5]?.motivos[0]?.campo).toBe('tipo_lead_id')
    expect(porTramos[6]?.motivos[0]?.motivo).toBe('Este teléfono ya está en la fila 4 del archivo.')
  })
})
