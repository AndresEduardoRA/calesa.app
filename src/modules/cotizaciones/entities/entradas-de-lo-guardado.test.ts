import { describe, expect, it } from 'vitest'
import { indiceDeHoja } from './entradas'
import { entradasDeLoGuardado } from './entradas-de-lo-guardado'
import { hojaDePrueba } from './hoja-de-prueba.soporte'
import type { LoGuardado } from './hoja-de-una-guardada'

// Lo que la hoja manda de lo guardado para que abrir y guardar sin tocar nada no cambie nada (C4): el espejo de `_cotizacion_entradas_de` (`base.sql:1450-1476`) sobre lo que la hoja
// dibuja.
const hoja = hojaDePrueba({ modos: [{ clave: 'unificado', nombre: 'Unificado' }] })
const indice = indiceDeHoja(hoja.secciones, hoja.cabecera.modos)

type Valor = number | string | null
const guardado = (
  valores: Record<string, Valor>,
  fuentes: Record<string, string> = {},
): LoGuardado => ({
  valores: new Map(Object.entries(valores)),
  fuentes: new Map(Object.entries(fuentes)),
  totalUsd: 100,
})
const entradas = (g: LoGuardado, modoTc: string | null = null) =>
  entradasDeLoGuardado(indice, g, { modoTc })
const como = (m: ReadonlyMap<string, number>) => Object.fromEntries(m)

describe('entradasDeLoGuardado: inputs', () => {
  it('un input tipeado y uno sobrescrito entran; uno por defecto no', () => {
    const e = entradas(
      guardado(
        { remate: 1000, cuenta_esp: 50, sin_bandera: 7 },
        { remate: 'input', cuenta_esp: 'override', sin_bandera: 'default' },
      ),
    )
    expect(como(e.inputs)).toEqual({ remate: 1000, cuenta_esp: 50 })
    expect(como(e.overrides)).toEqual({})
  })

  it('un valor que no es número no entra, aunque la fuente sea input', () => {
    const e = entradas(guardado({ remate: 'mil' }, { remate: 'input' }))
    expect(e.inputs.size).toBe(0)
  })

  it('un nodo que la hoja no dibuja no entra: la base lo conserva', () => {
    const e = entradas(
      guardado({ fantasma: 5, oculto: 3 }, { fantasma: 'override', oculto: 'input' }),
    )
    expect(e.inputs.size).toBe(0)
    expect(e.overrides.size).toBe(0)
  })
})

describe('entradasDeLoGuardado: overrides', () => {
  it('un override de una constante y el de un monto calculado entran', () => {
    const e = entradas(
      guardado({ iva_c: 0.13, fees: 500 }, { iva_c: 'override', fees: 'override' }),
    )
    expect(como(e.overrides)).toEqual({ iva_c: 0.13, fees: 500 })
  })

  it('un nodo del vehículo no se manda aunque diga override', () => {
    const e = entradas(guardado({ del_vehiculo: 9 }, { del_vehiculo: 'override' }))
    expect(e.overrides.size).toBe(0)
  })

  it('un tipo de cambio sobrescrito entra aunque su valor no sea un número, con 0 (espejo de la base)', () => {
    expect(como(entradas(guardado({ tc: 6.96 }, { tc: 'override' })).overrides)).toEqual({
      tc: 6.96,
    })
    expect(como(entradas(guardado({ tc: null }, { tc: 'override' })).overrides)).toEqual({ tc: 0 })
  })

  it('una constante sobrescrita con un valor que no es número no entra', () => {
    expect(entradas(guardado({ iva_c: null }, { iva_c: 'override' })).overrides.size).toBe(0)
  })
})

describe('entradasDeLoGuardado: el par porcentaje-monto', () => {
  it('el porcentaje input de un par entra a inputs, con el monto sin pisar', () => {
    const e = entradas(guardado({ seguro_pct: 0.05, seguro: 10 }, { seguro_pct: 'input' }))
    expect(como(e.inputs)).toEqual({ seguro_pct: 0.05 })
  })

  it('con el monto pisado (override) el porcentaje input no entra y el monto sí', () => {
    const e = entradas(
      guardado({ seguro_pct: 0.05, seguro: 99 }, { seguro_pct: 'input', seguro: 'override' }),
    )
    expect(e.inputs.size).toBe(0)
    expect(como(e.overrides)).toEqual({ seguro: 99 })
  })

  it('el porcentaje constante sobrescrito entra a overrides (4-31) y, con el monto pisado, no', () => {
    const solo = entradas(guardado({ fees_pct: 0.1, fees: 10 }, { fees_pct: 'override' }))
    expect(como(solo.overrides)).toEqual({ fees_pct: 0.1 })
    const pisado = entradas(
      guardado({ fees_pct: 0.1, fees: 99 }, { fees_pct: 'override', fees: 'override' }),
    )
    expect(como(pisado.overrides)).toEqual({ fees: 99 })
  })
})

describe('entradasDeLoGuardado: banderas, variante y modo', () => {
  it('una bandera encendida (1) entra; apagada (0) o ausente, no', () => {
    const e = entradas(guardado({ cuenta: 1, mostrar_garantia: 0 }))
    expect([...e.banderas]).toEqual(['cuenta'])
  })

  it('la variante guardada entra si es una opción de la hoja; si no, nula', () => {
    expect(entradas(guardado({ variante: 'moto' })).variante).toBe('moto')
    expect(entradas(guardado({ variante: 'camion' })).variante).toBeNull()
    expect(entradas(guardado({})).variante).toBeNull()
    expect(entradas(guardado({ variante: 3 })).variante).toBeNull()
  })

  it('el modo es el de la cotización, tal cual, también nulo; sin atajos', () => {
    expect(entradas(guardado({}), null).modoTc).toBeNull()
    expect(entradas(guardado({}), 'unificado').modoTc).toBe('unificado')
    expect(entradas(guardado({})).atajos.size).toBe(0)
  })
})
