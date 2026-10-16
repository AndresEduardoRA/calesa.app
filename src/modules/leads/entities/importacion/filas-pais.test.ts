import { describe, expect, it } from 'vitest'
import type { ContextoDeAlta } from '../alta'
import { camposDeLeadDesde } from '../campo'
import { TABLA_DE_PAISES } from '../paises/tabla'
import { prepararFilas, type EntradaDePreparacion, type FilaPreparada } from './filas'

const WEB = '11111111-1111-4111-8111-111111111111'

const CONTEXTO: ContextoDeAlta = {
  telefonoCc: '+591',
  origenes: [{ id: WEB, clave: 'web', nombre: 'Web' }],
  tiposDeSeguimiento: [],
  ultimoOrigenId: null,
  empresa: { ciudad: null, pais: 'Bolivia' },
}

const BASE = {
  opciones: [],
  requerido: false,
  valor_defecto: null,
  valor_defecto_empresa: null,
  grupo: null,
  en_tabla: false,
  filtrable: false,
  solo_cartera: false,
  es_sistema: true,
  activo: true,
  actualizado_en: '2026-10-14T20:00:00+00:00',
  id: '00000000-0000-0000-0000-000000000009',
  clave: 'pais',
  etiqueta: 'País',
  tipo: 'texto' as const,
  orden: 10,
}

const CON_PAIS = camposDeLeadDesde([{ ...BASE, valor_defecto_empresa: 'pais' }])
const PAIS_APAGADO = camposDeLeadDesde([{ ...BASE, activo: false }])

function preparar(
  filas: string[][],
  extra: Partial<EntradaDePreparacion> = {},
  destinos: (string | null)[] = ['nombre', 'telefono_principal', 'atributos.pais'],
): FilaPreparada[] {
  let n = 0
  return prepararFilas({
    filas,
    destinos,
    campos: CON_PAIS,
    contexto: CONTEXTO,
    zona: 'America/La_Paz',
    eleccion: { origenId: WEB, tipo: 'prospecto' },
    paises: TABLA_DE_PAISES,
    nuevoId: () => `id-${String((n += 1))}`,
    ...extra,
  })
}

const paisDe = (fila: FilaPreparada | undefined) => fila?.pedido?.lead.atributos['pais']

describe('«País» de la importación', () => {
  it('se completa con el del teléfono sólo donde la celda viene vacía', () => {
    const filas = preparar([
      ['Ana', '+54 9 11 5555-0000', ''],
      ['Beto', '+54 9 11 5555-0001', 'Perú'],
      ['Carla', '70011002', '   '],
    ])
    expect(paisDe(filas[0])).toBe('Argentina')
    expect(filas[0]?.paisDelTelefono).toBe('Argentina')
    // Lo que el archivo dice se respeta.
    expect(paisDe(filas[1])).toBe('Perú')
    expect(filas[1]?.paisDelTelefono).toBeNull()
    // Sin «+»: el de la empresa, con su texto.
    expect(paisDe(filas[2])).toBe('Bolivia')
  })

  it('un archivo sin la columna «País» también se completa', () => {
    const filas = preparar([['Ana', '+56 9 6123 4567']], {}, ['nombre', 'telefono_principal'])
    expect(paisDe(filas[0])).toBe('Chile')
  })

  it('un prefijo compartido o desconocido no se adivina', () => {
    const filas = preparar([
      ['Ana', '+1 305 555 0100', ''],
      ['Beto', '+999 1234 5678', ''],
    ])
    expect(filas[0]?.pedido).not.toBeNull()
    expect(paisDe(filas[0])).toBeUndefined()
    expect(paisDe(filas[1])).toBeUndefined()
    expect(filas[0]?.paisDelTelefono).toBeNull()
  })

  it('un teléfono que no es válido no completa nada y su motivo sigue siendo el de siempre', () => {
    const [fila] = preparar([['Ana', '7001abcd', '']])
    expect(fila?.pedido).toBeNull()
    expect(fila?.paisDelTelefono).toBeNull()
    expect(fila?.motivos[0]?.motivo).toContain('sólo lleva números')
  })

  it('con «País» apagado, o sin la tabla, no se completa', () => {
    const apagado = preparar([['Ana', '+54 9 11 5555-0000']], { campos: PAIS_APAGADO }, [
      'nombre',
      'telefono_principal',
    ])
    expect(paisDe(apagado[0])).toBeUndefined()
    const sinTabla = preparar([['Ana', '+54 9 11 5555-0000', '']], { paises: null })
    expect(paisDe(sinTabla[0])).toBeUndefined()
    expect(sinTabla[0]?.pedido).not.toBeNull()
  })

  it('la empresa sin código de país no inventa el de un número nacional', () => {
    const sinCodigo = { ...CONTEXTO, telefonoCc: null }
    const [nacional, internacional] = preparar(
      [
        ['Ana', '70011002', ''],
        ['Beto', '+591 70011002', ''],
      ],
      { contexto: sinCodigo },
    )
    expect(nacional?.pedido).toBeNull()
    expect(nacional?.paisDelTelefono).toBeNull()
    expect(paisDe(internacional)).toBe('Bolivia')
  })
})
