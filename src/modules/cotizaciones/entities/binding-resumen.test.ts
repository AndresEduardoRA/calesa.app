import { describe, expect, it } from 'vitest'
import {
  secundariosDelResumen,
  totalDelResumen,
  valorDeSubtotal,
  type ContextoDeHoja,
} from './binding'
import { ENTRADAS_VACIAS, indiceDeHoja } from './entradas'
import { hojaDePrueba, respuestaDePrueba } from './hoja-de-prueba.soporte'
import type { RespuestaDeRecalculo } from './recalculo'

const hoja = hojaDePrueba()
const indice = indiceDeHoja(hoja.secciones)
const contexto = (respuesta: RespuestaDeRecalculo | null): ContextoDeHoja => ({
  indice,
  entradas: ENTRADAS_VACIAS,
  respuesta,
})

describe('el resumen', () => {
  it('sin respuesta no hay total; con ella, el total en dólares', () => {
    expect(totalDelResumen(contexto(null))).toEqual({ tipo: 'sin_calcular' })
    expect(totalDelResumen(contexto(respuestaDePrueba({ usd: 2350 })))).toEqual({
      tipo: 'valor',
      usd: 2350,
    })
  })

  it('sin total porque algo falta: si nace en una celda dibujada, «revisa las celdas»; si no, que la hoja no lo muestra', () => {
    const enCelda = respuestaDePrueba({
      usd: null,
      faltantes: [{ codigo: 'requerido_sin_valor', donde: 'remate' }],
    })
    expect(totalDelResumen(contexto(enCelda))).toEqual({
      tipo: 'faltante',
      motivo: 'Revisa las celdas con aviso.',
    })
    const enSubtotal = respuestaDePrueba({
      usd: null,
      faltantes: [{ codigo: 'division_por_cero', donde: 'cif' }],
    })
    expect(totalDelResumen(contexto(enSubtotal))).toEqual({
      tipo: 'faltante',
      motivo: 'Revisa las celdas con aviso.',
    })
    const fueraDeLaHoja = respuestaDePrueba({
      usd: null,
      faltantes: [{ codigo: 'division_por_cero', donde: 'total' }],
    })
    expect(totalDelResumen(contexto(fueraDeLaHoja))).toEqual({
      tipo: 'faltante',
      motivo: 'Falta un dato que esta hoja no muestra.',
    })
    const oculto = respuestaDePrueba({ usd: null, hayFaltantesOcultos: true })
    expect(totalDelResumen(contexto(oculto))).toEqual({
      tipo: 'faltante',
      motivo: 'Falta un dato que esta hoja no muestra.',
    })
  })

  it('lo que la tarjeta suma aparte sólo se muestra si está activo y tiene valor', () => {
    const tarjeta = hoja.tarjetaTotal.secundarios
    expect(
      secundariosDelResumen(
        tarjeta,
        respuestaDePrueba({ valores: { garantia: 50 }, estados: { garantia: 'activo' } }),
      ),
    ).toEqual([{ nodo: 'garantia', etiqueta: 'Garantía', formato: 'usd', valor: 50 }])
    expect(
      secundariosDelResumen(
        tarjeta,
        respuestaDePrueba({ valores: { garantia: 0 }, estados: { garantia: 'condicion_apagada' } }),
      ),
    ).toEqual([])
    expect(secundariosDelResumen(tarjeta, null)).toEqual([])
  })

  it('el valor de un subtotal es el de la respuesta o nada', () => {
    expect(valorDeSubtotal('cif', respuestaDePrueba({ valores: { cif: 70 } }))).toBe(70)
    expect(valorDeSubtotal('cif', null)).toBeNull()
  })
})
