import { describe, expect, it } from 'vitest'
import type { DiffDeActividad } from './actividad'
import { presentarDiff } from './diff'
import { etiquetaDeCampo, verboDeLaAccion } from './etiquetas'

function diff(
  tabla: string,
  cambios: Record<string, { antes: unknown; despues: unknown }>,
): DiffDeActividad {
  return {
    id: 7,
    visible: true,
    accion: `${tabla}.update`,
    tabla,
    registroId: '00000000-0000-4000-8000-000000000001',
    actorId: null,
    actorNombre: null,
    creadoEn: '2026-11-12T15:00:00.000Z',
    cambios,
  }
}

const etiquetasDeAtributos = new Map([
  ['color', { etiqueta: 'Color', tipo: 'opcion' as const }],
  ['valor_fob', { etiqueta: 'Valor FOB', tipo: 'moneda' as const }],
])

function porClave(cambios: ReturnType<typeof presentarDiff>, clave: string) {
  return cambios.find((c) => c.clave === clave)
}

describe('presentarDiff', () => {
  it('T1 · sólo presenta lo que cambió, también dentro de los atributos', () => {
    const cambios = presentarDiff(
      diff('vehiculos', {
        nombre: { antes: 'Corolla', despues: 'Corolla 2020' },
        estado: { antes: 'activo', despues: 'activo' },
        notas: { antes: null, despues: undefined },
        atributos: {
          antes: { color: 'rojo', km: 10, extras: ['a', 'b'] },
          despues: { color: 'azul', km: 10, extras: ['a', 'b'] },
        },
      }),
      { etiquetasDeAtributos },
    )
    expect(cambios.map((c) => c.clave)).toEqual(['nombre', 'atributos.color'])
    expect(porClave(cambios, 'atributos.color')?.etiqueta).toBe('Color')
    expect(porClave(cambios, 'atributos.color')?.despues).toEqual({ tipo: 'texto', texto: 'azul' })
  })

  it('T2 · un monto sale como monto, cada lado en su moneda', () => {
    const cambios = presentarDiff(
      diff('gastos', {
        monto: { antes: 1500, despues: 1750.5 },
        moneda: { antes: 'BOB', despues: 'USD' },
      }),
    )
    const monto = porClave(cambios, 'monto')
    expect(monto?.antes).toEqual({
      tipo: 'monto',
      valor: 1500,
      moneda: 'BOB',
      enMonedaBase: false,
      monedaConocida: true,
    })
    expect(monto?.despues).toEqual({
      tipo: 'monto',
      valor: 1750.5,
      moneda: 'USD',
      enMonedaBase: false,
      monedaConocida: true,
    })

    const comoTexto = porClave(
      presentarDiff(diff('pagos', { monto: { antes: '1500.50', despues: null } }), {
        monedaAntes: 'USD',
      }),
      'monto',
    )
    expect(comoTexto?.antes).toEqual({
      tipo: 'monto',
      valor: 1500.5,
      moneda: 'USD',
      enMonedaBase: false,
      monedaConocida: true,
    })
    expect(comoTexto?.despues).toEqual({ tipo: 'vacio' })

    const atributo = porClave(
      presentarDiff(
        diff('vehiculos', {
          atributos: { antes: { valor_fob: 9000 }, despues: { valor_fob: 9500 } },
        }),
        {
          etiquetasDeAtributos,
        },
      ),
      'atributos.valor_fob',
    )
    expect(atributo?.despues).toMatchObject({ tipo: 'monto', valor: 9500 })
  })
})

describe('presentarDiff: moneda y lo oculto', () => {
  it('T3 · sin moneda conocida no la inventa; la base va marcada', () => {
    const sinMoneda = porClave(
      presentarDiff(diff('gastos', { monto: { antes: 10, despues: 20 } })),
      'monto',
    )
    expect(sinMoneda?.despues).toEqual({
      tipo: 'monto',
      valor: 20,
      moneda: null,
      enMonedaBase: false,
      monedaConocida: false,
    })

    const porOpcion = porClave(
      presentarDiff(diff('gastos', { monto: { antes: 10, despues: 20 } }), {
        monedaAntes: 'BOB',
        monedaDespues: 'USD',
      }),
      'monto',
    )
    expect(porOpcion?.antes).toMatchObject({ moneda: 'BOB', monedaConocida: true })
    expect(porOpcion?.despues).toMatchObject({ moneda: 'USD', monedaConocida: true })

    expect(
      porClave(presentarDiff(diff('vehiculos', { precio: { antes: 1, despues: 2 } })), 'precio')
        ?.despues,
    ).toMatchObject({
      tipo: 'monto',
      enMonedaBase: true,
      monedaConocida: true,
    })
    expect(
      porClave(
        presentarDiff(diff('gastos', { monto_base: { antes: 1, despues: 2 } })),
        'monto_base',
      )?.despues,
    ).toMatchObject({
      tipo: 'monto',
      enMonedaBase: true,
    })
  })

  it('T4 · nada de lo oculto', () => {
    expect(presentarDiff({ id: 7, visible: false })).toEqual([])
    expect(presentarDiff(diff('gastos', {}))).toEqual([])
  })
})

describe('etiquetas', () => {
  it('T5 · el término del glosario, la etiqueta del atributo o la clave humanizada', () => {
    expect(etiquetaDeCampo('vehiculos', 'precio_web')).toBe('Precio público')
    expect(etiquetaDeCampo('leads', 'nombre')).toBe('Nombre')
    expect(etiquetaDeCampo('vehiculos', 'atributos.color', etiquetasDeAtributos)).toBe('Color')
    expect(etiquetaDeCampo('vehiculos', 'precio_web_nota')).toBe('Precio web nota')
    expect(verboDeLaAccion('leads.update')).toBe('Cambió')
    expect(verboDeLaAccion('fase.mover')).toBe('Fase mover')
  })
})
