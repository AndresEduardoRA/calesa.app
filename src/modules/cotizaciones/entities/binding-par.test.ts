import { describe, expect, it } from 'vitest'
import {
  bloqueoDeLado,
  FALTA_UN_DATO,
  propsDeCelda,
  textoDelEstado,
  textoDelFaltante,
  type ContextoDeHoja,
} from './binding'
import { ENTRADAS_VACIAS, indiceDeHoja } from './entradas'
import { hojaDesde, type HojaLista } from './hoja'
import { crudaDeLaHoja, hojaDePrueba, respuestaDePrueba } from './hoja-de-prueba.soporte'
import type { RespuestaDeRecalculo } from './recalculo'

// El candado por lado del par (4.13-3c): cada lado dice el suyo, la celda dice sólo lo que se edita en ella (P6) y los atajos miran el lado de su nodo.
const hoja = hojaDePrueba()
const indice = indiceDeHoja(hoja.secciones)
const celda = (nodo: string) => {
  const c = indice.celdas.get(nodo)
  if (!c) {
    throw new Error(`No hay la celda ${nodo}`)
  }
  return c
}
const contexto = (respuesta: RespuestaDeRecalculo | null): ContextoDeHoja => ({
  indice,
  entradas: ENTRADAS_VACIAS,
  respuesta,
})
const props = (nodo: string, c: ContextoDeHoja) => propsDeCelda(celda(nodo), c)

describe('el candado por lado del par', () => {
  const c = contexto(respuestaDePrueba())

  it('un par con el monto calculado bloquea sólo el monto: el porcentaje se edita', () => {
    expect(props('transferencia', c)).toMatchObject({
      disabledReason: 'Se calcula con los demás datos.',
      secondaryDisabledReason: undefined,
      secondaryId: 'transf_pct',
    })
  })

  it('un par con el porcentaje bloqueado bloquea sólo el porcentaje, con su motivo', () => {
    expect(props('seguro', c)).toMatchObject({
      disabledReason: undefined,
      secondaryDisabledReason: 'Lo edita quien tiene el nivel «Gerencia».',
    })
  })

  it('un par con los dos lados bloqueados lleva el motivo de cada uno y ningún error', () => {
    const cruda = crudaDeLaHoja()
    const items = cruda.secciones[0]?.items ?? []
    const seguro = items.find((i) => 'nodo' in i && i.nodo === 'seguro') as Record<string, unknown>
    seguro['editable'] = false
    seguro['motivo'] = { codigo: 'se_calcula' }
    const hojaDos = hojaDesde(cruda) as HojaLista
    const cDos: ContextoDeHoja = {
      indice: indiceDeHoja(hojaDos.secciones),
      entradas: ENTRADAS_VACIAS,
      respuesta: respuestaDePrueba(),
    }
    const celdaDos = indiceDeHoja(hojaDos.secciones).celdas.get('seguro')
    if (!celdaDos) throw new Error('No hay seguro')
    expect(propsDeCelda(celdaDos, cDos)).toMatchObject({
      disabledReason: 'Se calcula con los demás datos.',
      secondaryDisabledReason: 'Lo edita quien tiene el nivel «Gerencia».',
      error: undefined,
    })
  })

  it('un par apagado lleva el texto del estado en los dos lados y ningún error', () => {
    const r = respuestaDePrueba({ estados: { fees: 'condicion_apagada' } })
    const texto = textoDelEstado('condicion_apagada', celda('fees'), indice)
    expect(props('fees', contexto(r))).toMatchObject({
      disabledReason: texto,
      secondaryDisabledReason: texto,
      error: undefined,
    })
  })

  it('bloqueoDeLado es el candado del lado que nombra el id (lo usan los atajos)', () => {
    expect(bloqueoDeLado('del_vehiculo', c)).toBe('Viene del vehículo.')
    expect(bloqueoDeLado('remate', c)).toBeUndefined()
    expect(bloqueoDeLado('transferencia', c)).toBe('Se calcula con los demás datos.')
    expect(bloqueoDeLado('transf_pct', c)).toBeUndefined()
    expect(bloqueoDeLado('seguro', c)).toBeUndefined()
    expect(bloqueoDeLado('seguro_pct', c)).toBe('Lo edita quien tiene el nivel «Gerencia».')
    expect(bloqueoDeLado('no_existe', c)).toBeUndefined()
    const apagada = contexto(respuestaDePrueba({ estados: { fees: 'condicion_apagada' } }))
    expect(bloqueoDeLado('fees_pct', apagada)).toBe(
      textoDelEstado('condicion_apagada', celda('fees'), indice),
    )
  })
})

describe('el error del par (P6)', () => {
  it('P6: el par con el monto calculado no dice «falta un dato» por el monto; dice el faltante de su porcentaje', () => {
    const r = respuestaDePrueba({
      valores: { transferencia: null },
      faltantes: [{ codigo: 'division_por_cero', donde: 'transferencia' }],
    })
    expect(props('transferencia', contexto(r)).error).toBeUndefined()
    const conRango = respuestaDePrueba({
      valores: { transferencia: null },
      faltantes: [{ codigo: 'fuera_de_rango', donde: 'transf_pct' }],
    })
    expect(props('transferencia', contexto(conRango)).error).toBe(
      textoDelFaltante('fuera_de_rango'),
    )
  })

  it('P6: el par con el porcentaje bloqueado dice el faltante del monto y «falta un dato», no el del porcentaje', () => {
    expect(props('seguro', contexto(respuestaDePrueba({ valores: { seguro: null } }))).error).toBe(
      FALTA_UN_DATO,
    )
    const r = respuestaDePrueba({
      valores: { seguro: 10 },
      faltantes: [{ codigo: 'fuera_de_rango', donde: 'seguro_pct' }],
    })
    expect(props('seguro', contexto(r)).error).toBeUndefined()
  })
})
