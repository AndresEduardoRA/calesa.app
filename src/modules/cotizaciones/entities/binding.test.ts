import { describe, expect, it } from 'vitest'
import {
  bloqueoDeCelda,
  FALTA_UN_DATO,
  formatoDeCelda,
  itemSeDibuja,
  monedaDeFormato,
  propsDeCelda,
  seccionSeDibuja,
  textoDelCandado,
  textoDelEstado,
  textoDelFaltante,
  type ContextoDeHoja,
} from './binding'
import { alternarBandera, ENTRADAS_VACIAS, indiceDeHoja, type Entradas } from './entradas'
import { hojaDesde, type HojaLista } from './hoja'
import { crudaDeLaHoja, hojaDePrueba, respuestaDePrueba } from './hoja-de-prueba.soporte'
import { CODIGOS_DE_FALTANTE } from './motor-contexto'
import type { RespuestaDeRecalculo } from './recalculo'

const hoja = hojaDePrueba()
const indice = indiceDeHoja(hoja.secciones)
const celda = (nodo: string) => {
  const c = indice.celdas.get(nodo)
  if (!c) {
    throw new Error(`No hay la celda ${nodo}`)
  }
  return c
}
const contexto = (
  respuesta: RespuestaDeRecalculo | null,
  entradas: Entradas = ENTRADAS_VACIAS,
): ContextoDeHoja => ({ indice, entradas, respuesta })
const props = (nodo: string, c: ContextoDeHoja) => propsDeCelda(celda(nodo), c)
const conEntradas = (e: Partial<Entradas>): Entradas => ({ ...ENTRADAS_VACIAS, ...e })

describe('propsDeCelda: el valor, el origen del valor y el tono', () => {
  it('toma el valor de la respuesta y el formato del nodo (usd en dólares; la moneda de la empresa sin código; pct; raw)', () => {
    const r = respuestaDePrueba({ valores: { remate: 9500, iva_c: 0.13 } })
    const remate = props('remate', contexto(r))
    expect(remate).toMatchObject({
      id: 'remate',
      label: 'REMATE',
      value: 9500,
      format: 'monto',
      currency: 'USD',
    })
    expect(props('iva_c', contexto(r))).toMatchObject({
      value: 0.13,
      format: 'porcentaje',
      currency: undefined,
    })
    expect(props('tc', contexto(r)).format).toBe('numero')
    expect(formatoDeCelda('moneda')).toBe('monto')
    expect(monedaDeFormato('moneda')).toBeUndefined()
  })

  it('lo tipeado manda sobre lo calculado mientras la respuesta no lo alcanza (la celda no vuelve al número viejo)', () => {
    const r = respuestaDePrueba({ valores: { remate: 9500, fees: 100 } })
    const e = conEntradas({
      inputs: new Map([['remate', 8000]]),
      overrides: new Map([['fees', 1300]]),
    })
    expect(props('remate', contexto(r, e)).value).toBe(8000)
    expect(props('fees', contexto(r, e)).value).toBe(1300)
  })

  it('sin respuesta (todavía, o falló) el valor es nulo y lo tipeado se sigue viendo', () => {
    expect(props('remate', contexto(null)).value).toBeNull()
    const e = conEntradas({ inputs: new Map([['remate', 8000]]) })
    expect(props('remate', contexto(null, e)).value).toBe(8000)
  })

  it('sugerido por la fuente; modificado por el override tipeado (y deja de ser sugerido)', () => {
    const r = respuestaDePrueba({ valores: { fees: 100 }, fuentes: { fees: 'sugerido' } })
    expect(props('fees', contexto(r))).toMatchObject({ suggested: true, overridden: false })
    const e = conEntradas({ overrides: new Map([['fees', 1300]]) })
    expect(props('fees', contexto(r, e))).toMatchObject({ suggested: false, overridden: true })
  })

  it('el par: el porcentaje es el lado secundario, y se modifica si cualquiera de sus lados tiene override', () => {
    const r = respuestaDePrueba({ valores: { fees: 1300, fees_pct: 0.1368 } })
    expect(props('fees', contexto(r))).toMatchObject({
      secondaryId: 'fees_pct',
      secondaryValue: 0.1368,
      secondaryFormat: 'porcentaje',
      overridden: false,
    })
    const e = conEntradas({ overrides: new Map([['fees_pct', 0.2]]) })
    expect(props('fees', contexto(r, e))).toMatchObject({ secondaryValue: 0.2, overridden: true })
  })

  it('«Volver al valor por defecto» sólo en una constante o un tipo de cambio; lo demás vuelve al sugerido', () => {
    const c = contexto(respuestaDePrueba())
    expect(props('iva_c', c).defaultValue).toBeNull()
    expect(props('tc', c).defaultValue).toBeNull()
    expect(props('fees', c).defaultValue).toBeUndefined()
    expect(props('remate', c).defaultValue).toBeUndefined()
  })

  it('lleva el tono de su grupo', () => {
    expect(props('fees', contexto(null)).tone).toBe('verde')
    expect(props('remate', contexto(null)).tone).toBeUndefined()
  })
})

describe('el candado: de la lectura y del recálculo, siempre con su motivo escrito', () => {
  const c = contexto(respuestaDePrueba())

  it('una celda editable no lleva motivo', () => {
    expect(props('remate', c).disabledReason).toBeUndefined()
  })

  it('cada motivo de la lectura tiene su texto, y el de nivel dice cuál', () => {
    expect(props('del_vehiculo', c).disabledReason).toBe('Viene del vehículo.')
    expect(props('de_nivel', c).disabledReason).toBe('Lo edita quien tiene el nivel «Costos».')
    expect(textoDelCandado({ codigo: 'se_calcula' })).toBe('Se calcula con los demás datos.')
    expect(textoDelCandado({ codigo: 'no_se_edita' })).toBe('No se edita en esta hoja.')
    expect(textoDelCandado(null)).toBe('No se edita en esta hoja.')
  })

  it('un par con el monto calculado se bloquea entero con el motivo del monto (la XCell tiene un solo candado: el del porcentaje por separado es del 4.13-3)', () => {
    expect(props('transferencia', c)).toMatchObject({
      disabledReason: 'Se calcula con los demás datos.',
      secondaryId: 'transf_pct',
    })
  })

  it('un par con el porcentaje bloqueado también se bloquea entero, con su motivo', () => {
    expect(props('seguro', c).disabledReason).toBe('Lo edita quien tiene el nivel «Gerencia».')
  })

  it('el estado del recálculo manda: una celda apagada lleva el motivo del estado aunque la lectura la deje editar', () => {
    const r = respuestaDePrueba({ estados: { cuenta_esp: 'condicion_apagada' } })
    expect(props('cuenta_esp', contexto(r)).disabledReason).toBe(
      'Se habilita con «Cuenta especial».',
    )
  })

  it('una celda apagada por una bandera que no llegó (el nivel la esconde) dice que está apagada, sin nombrar nada', () => {
    const r = respuestaDePrueba({ estados: { sin_bandera: 'condicion_apagada' } })
    expect(props('sin_bandera', contexto(r)).disabledReason).toBe('Está apagada en esta hoja.')
    expect(textoDelEstado('condicion_apagada', { condicion: 'oculta', soloEn: null }, indice)).toBe(
      'Está apagada en esta hoja.',
    )
  })

  it('fuera de la variante dice en cuáles es', () => {
    const r = respuestaDePrueba({ estados: { solo_moto: 'fuera_de_variante' } })
    expect(props('solo_moto', contexto(r)).disabledReason).toBe('Sólo en Moto.')
    expect(textoDelEstado('fuera_de_variante', { condicion: null, soloEn: null }, indice)).toBe(
      'No aplica a esta variante.',
    )
  })

  it('encendida la bandera y activa la celda, se edita', () => {
    const r = respuestaDePrueba({ estados: { cuenta_esp: 'activo' } })
    expect(
      props('cuenta_esp', contexto(r, alternarBandera(ENTRADAS_VACIAS, 'cuenta', true)))
        .disabledReason,
    ).toBeUndefined()
  })

  it('bloqueoDeCelda es lo mismo que el motivo de las props', () => {
    expect(bloqueoDeCelda(celda('del_vehiculo'), c)).toBe('Viene del vehículo.')
    expect(bloqueoDeCelda(celda('remate'), c)).toBeUndefined()
  })
})

describe('el error de una celda: nunca el mensaje de la base', () => {
  it('sale del faltante de su nodo, con un texto propio', () => {
    const r = respuestaDePrueba({
      valores: { remate: null },
      faltantes: [{ codigo: 'requerido_sin_valor', donde: 'remate', ref: 'cuenta' }],
    })
    expect(props('remate', contexto(r)).error).toBe('Este dato es obligatorio.')
  })

  it('un faltante del porcentaje de un par se dice en esa celda', () => {
    const r = respuestaDePrueba({ faltantes: [{ codigo: 'division_por_cero', donde: 'fees_pct' }] })
    expect(props('fees', contexto(r)).error).toBe('Se divide por cero.')
  })

  it('una celda que vale null sin ser donde nació el hueco dice que falta un dato', () => {
    const r = respuestaDePrueba({ valores: { fees: null } })
    expect(props('fees', contexto(r)).error).toBe(FALTA_UN_DATO)
  })

  it('una celda bloqueada dice su motivo, no «falta un dato» (la XCell dice el error antes que el candado)', () => {
    const r = respuestaDePrueba({ valores: { del_vehiculo: null } })
    expect(props('del_vehiculo', contexto(r))).toMatchObject({
      disabledReason: 'Viene del vehículo.',
      error: undefined,
    })
  })

  it('sin respuesta, o con la celda apagada, no hay error', () => {
    expect(props('fees', contexto(null)).error).toBeUndefined()
    const r = respuestaDePrueba({
      valores: { cuenta_esp: null },
      estados: { cuenta_esp: 'condicion_apagada' },
    })
    expect(props('cuenta_esp', contexto(r)).error).toBeUndefined()
  })

  it('cada código de faltante tiene su texto', () => {
    for (const codigo of CODIGOS_DE_FALTANTE) {
      expect(textoDelFaltante(codigo).length).toBeGreaterThan(5)
    }
  })
})

describe('qué se dibuja', () => {
  const sinGarantia = contexto(respuestaDePrueba())
  const conGarantia = contexto(
    respuestaDePrueba(),
    alternarBandera(ENTRADAS_VACIAS, 'mostrar_garantia', true),
  )
  const items = hoja.secciones[0]?.items ?? []
  const item = (nodo: string) => {
    const i = items.find((x) => x.nodo === nodo)
    if (!i) {
      throw new Error(nodo)
    }
    return i
  }

  it('una celda de una bandera de efecto «muestra» no se dibuja mientras la bandera está apagada', () => {
    expect(itemSeDibuja(item('garantia'), sinGarantia)).toBe(false)
    expect(itemSeDibuja(item('garantia'), conGarantia)).toBe(true)
  })

  it('una celda de una bandera de efecto «habilita» se dibuja siempre (deshabilitada si está apagada)', () => {
    expect(itemSeDibuja(item('cuenta_esp'), sinGarantia)).toBe(true)
  })

  it('una celda cuya bandera no llegó se dibuja: no se esconde por una ausencia', () => {
    expect(itemSeDibuja(item('sin_bandera'), sinGarantia)).toBe(true)
  })

  it('una celda con su condición a la vista pero sin interruptor en la hoja también se dibuja (deshabilitada, no escondida)', () => {
    const cruda = crudaDeLaHoja()
    const seccion = cruda.secciones[0] as { items: { nodo: string }[] }
    seccion.items = seccion.items.filter((i) => i.nodo !== 'cuenta')
    const sinInterruptor = hojaDesde(cruda) as HojaLista
    const c = { ...sinGarantia, indice: indiceDeHoja(sinInterruptor.secciones) }
    const cuentaEsp = sinInterruptor.secciones[0]?.items.find((x) => x.nodo === 'cuenta_esp')
    expect(cuentaEsp && itemSeDibuja(cuentaEsp, c)).toBe(true)
  })

  it('los atajos van con la celda de su nodo', () => {
    const atajos = items.find((x) => x.tipo === 'atajos')
    expect(atajos && itemSeDibuja(atajos, sinGarantia)).toBe(true)
  })

  it('una sección se dibuja si le queda algún ítem', () => {
    const seccion = hoja.secciones[0]
    expect(seccion && seccionSeDibuja(seccion, sinGarantia)).toBe(true)
    expect(
      seccionSeDibuja(
        { id: 'x', titulo: null, presentacion: 'principal', items: [item('garantia')] },
        sinGarantia,
      ),
    ).toBe(false)
  })

  it('la variante, los interruptores y los subtotales se dibujan siempre', () => {
    for (const nodo of ['variante', 'cuenta', 'cif']) {
      expect(itemSeDibuja(item(nodo), sinGarantia)).toBe(true)
    }
  })
})
