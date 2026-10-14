import { describe, expect, it, vi } from 'vitest'
import { falloDeApibara, type FichaDeApibara } from '../../entities/apibara'
import { ok } from '@/shared/lib/errores'
import { CONSULTAS_A_LA_VEZ, consultarLineas, type Dependencias } from './consulta'
import { lineasDePegado, type EstadoDeLinea } from './lineas'

const ficha = (lote: string, vin: string): FichaDeApibara => ({
  consulta: '00000000-0000-0000-0000-0000000000c1',
  data: { lot_number: lote, vin, platform: 'copart', title: `Vehículo ${lote}` },
  url: null,
})

function dependencias(parcial: Partial<Dependencias> = {}) {
  const cambios: [string, EstadoDeLinea['tipo']][] = []
  const base: Dependencias = {
    campos: [],
    consultarFicha: (entrada) =>
      Promise.resolve({ ok: true as const, data: ficha(entrada, `VIN${entrada}`.padEnd(17, 'A')) }),
    buscarRepetidos: () => Promise.resolve(ok([])),
    alCambiar: (clave, estado) => {
      cambios.push([clave, estado.tipo])
    },
    ...parcial,
  }
  return { base, cambios }
}

describe('consultarLineas', () => {
  it('trae cada línea y deja sus datos a mano', async () => {
    const { lineas } = lineasDePegado('58540656\n45312823')
    const { base } = dependencias()
    const finales = await consultarLineas(lineas, base)
    const primera = finales.get('0')
    expect(primera?.tipo).toBe('lista')
    expect(primera?.tipo === 'lista' && primera.datos.columnas).toMatchObject({
      titulo: 'Vehículo 58540656',
      lote: '58540656',
      plataforma: 'copart',
    })
    expect(finales.get('1')?.tipo).toBe('lista')
  })

  it('una línea que falla no frena a las demás, y dice por qué', async () => {
    const { lineas } = lineasDePegado('58540656\n11111111\n45312823')
    const { base } = dependencias({
      consultarFicha: (entrada) =>
        Promise.resolve(
          entrada === '11111111'
            ? falloDeApibara('no_encontrado')
            : { ok: true as const, data: ficha(entrada, 'JTMW1RFV8MD012345') },
        ),
    })
    const finales = await consultarLineas(lineas, base)
    expect([...finales.values()].map((estado) => estado.tipo)).toEqual([
      'lista',
      'fallida',
      'lista',
    ])
    expect(finales.get('1')).toMatchObject({ tipo: 'fallida', codigo: 'no_encontrado' })
  })

  it('con la cuota agotada no consulta las que siguen', async () => {
    const { lineas } = lineasDePegado('10000001\n10000002\n10000003\n10000004\n10000005')
    const consultarFicha = vi.fn((entrada: string) =>
      Promise.resolve(
        entrada === '10000002'
          ? falloDeApibara('cuota')
          : { ok: true as const, data: ficha(entrada, 'JTMW1RFV8MD012345') },
      ),
    )
    const { base } = dependencias({ consultarFicha })
    const finales = await consultarLineas(lineas, base)
    // De a dos: la primera y la segunda salen juntas; ninguna de las tres siguientes se consulta.
    expect(consultarFicha.mock.calls.length).toBeLessThanOrEqual(CONSULTAS_A_LA_VEZ + 1)
    expect(finales.get('4')).toMatchObject({ tipo: 'fallida', codigo: 'cuota' })
    expect(finales.get('3')).toMatchObject({ tipo: 'fallida', codigo: 'cuota' })
  })

  it('las líneas que no se entienden no consultan nada', async () => {
    const { lineas } = lineasDePegado('hola\nhttps://www.example.com/x')
    const consultarFicha = vi.fn()
    const { base } = dependencias({ consultarFicha })
    const finales = await consultarLineas(lineas, base)
    expect(consultarFicha).not.toHaveBeenCalled()
    expect(finales.size).toBe(0)
  })
})

describe('consultarLineas: repetidos', () => {
  it('marca las que ya están en el inventario, y si no se ve, dice que existe', async () => {
    const { lineas } = lineasDePegado('58540656\n45312823\n99999999')
    const buscarRepetidos = vi.fn(() =>
      Promise.resolve(
        ok([
          { posicion: 0, vehiculoId: 'vehiculo-1' },
          { posicion: 2, vehiculoId: null },
        ]),
      ),
    )
    const { base, cambios } = dependencias({ buscarRepetidos })
    const finales = await consultarLineas(lineas, base)
    expect(finales.get('0')).toMatchObject({ tipo: 'repetida', vehiculoId: 'vehiculo-1' })
    expect(finales.get('1')?.tipo).toBe('lista')
    expect(finales.get('2')).toMatchObject({ tipo: 'repetida', vehiculoId: null })
    expect(cambios.filter(([, tipo]) => tipo === 'repetida')).toHaveLength(2)
    // Busca por VIN y lote de lo traído, en una sola llamada.
    expect(buscarRepetidos).toHaveBeenCalledTimes(1)
    const [claves] = buscarRepetidos.mock.calls[0] as unknown as [{ lote?: string }[]]
    expect(claves.map((clave) => clave.lote)).toEqual(['58540656', '45312823', '99999999'])
  })

  it('si no se pudo buscar repetidos, las líneas siguen listas', async () => {
    const { lineas } = lineasDePegado('58540656')
    const { base } = dependencias({
      buscarRepetidos: () =>
        Promise.resolve({
          ok: false as const,
          error: { codigo: 'inesperado' as const, mensaje: 'x' },
        }),
    })
    const finales = await consultarLineas(lineas, base)
    expect(finales.get('0')?.tipo).toBe('lista')
  })
})
