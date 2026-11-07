import { readFileSync } from 'node:fs'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  conEtiqueta,
  conNota,
  conColumna,
} from '../../../entities/plantilla/cambios-de-la-plantilla'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import {
  juegoDePlantilla,
  RUTA_DEL_JUEGO,
} from '../../../entities/plantilla/juego-de-plantilla.soporte'
import type { ContextoDePlantilla } from '../../../entities/plantilla/validar-plantilla'
import { useEditorDeLaPlantilla } from './use-editor-de-la-plantilla'

const ruta = `../../../entities/plantilla/${RUTA_DEL_JUEGO.slice(2)}`
const juego = juegoDePlantilla(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
const mini = juego.formulas['mini']!
const contexto = (visibilidad?: Record<string, unknown>): ContextoDePlantilla => ({
  definicion: mini.definicion,
  diseno: mini.diseno,
  visibilidad: visibilidad ?? mini.visibilidad,
  tonos: juego.tonos,
})
const MINIMA: Plantilla = {
  grupos: [{ grupo: 'compra' }, { grupo: 'logistica' }, { grupo: 'aduana' }],
  total: { etiqueta: 'TOTAL' },
  logo: true,
  columnas: { leyenda: false, plazo: false, tipo_cambio: false },
}
const HORA = '2026-11-07T15:00:00.123456+00:00'

type Args = Partial<Parameters<typeof useEditorDeLaPlantilla>[0]>
const montar = (args: Args = {}) =>
  renderHook(
    (props: Args) =>
      useEditorDeLaPlantilla({
        origenId: 'o',
        esperada: HORA,
        inicial: MINIMA,
        guardada: MINIMA,
        contexto: contexto(),
        ...props,
      }),
    { initialProps: args },
  )

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('useEditorDeLaPlantilla', () => {
  it('con borrador guardado, sin cambios no hay qué guardar y al cambiar algo sí', () => {
    const { result } = montar()
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.cambiar((p) => conNota(p, 'Hola'))
    })
    expect(result.current.hayCambios).toBe(true)
    act(() => {
      result.current.cambiar((p) => conNota(p, ''))
    })
    expect(result.current.hayCambios).toBe(false)
  })

  it('sin borrador, «Guardar» está activo desde el principio', () => {
    expect(montar({ guardada: null }).result.current.hayCambios).toBe(true)
  })

  it('lo alineado por la fórmula cuenta como cambio: inicial distinta de lo guardado', () => {
    const alineada = { ...MINIMA, grupos: MINIMA.grupos.slice(0, 2) }
    expect(montar({ guardada: alineada }).result.current.hayCambios).toBe(true)
  })

  it('la forma rechazada se dice y apaga lo que depende de ella', () => {
    const { result } = montar()
    act(() => {
      result.current.cambiar((p) => conEtiqueta(p, 'fees', 'x'.repeat(61)))
    })
    expect(result.current.rechazoDeForma?.donde).toBe('etiquetas.fees')
    expect(result.current.rechazoParaPublicar).toBeNull()
    expect(result.current.puedeGuardar).toBe(false)
  })

  it('un rechazo que sólo ve la fórmula (nodo del nivel costos) no es de forma: avisa que no se podría publicar y «Guardar» no se apaga', () => {
    // V15: `fees` es miembro de `compra` y no es del nivel «todos»: sobrevive a la alineación.
    const { result } = montar({
      contexto: contexto({ ...mini.visibilidad, fees: { ver: 'costos' } }),
    })
    act(() => {
      result.current.cambiar((p) => conNota(p, 'Nota'))
    })
    expect(result.current.rechazoDeForma).toBeNull()
    expect(result.current.rechazoParaPublicar?.mensaje).toBe(
      'La tarjeta no puede mostrar «fees»: no es del nivel «todos».',
    )
    expect(result.current.puedeGuardar).toBe(true)
  })

  it('el tipo de cambio de un bucket restringido también sólo avisa', () => {
    const { result } = montar({
      contexto: contexto({ ...mini.visibilidad, tc_adu: { ver: 'costos' } }),
    })
    act(() => {
      result.current.cambiar((p) => conColumna(p, 'tipo_cambio', true))
    })
    expect(result.current.rechazoDeForma).toBeNull()
    expect(result.current.rechazoParaPublicar?.mensaje).toBe(
      'La tarjeta no puede nombrar el tipo de cambio de «tc_adu»: no es del nivel «todos».',
    )
    expect(result.current.puedeGuardar).toBe(true)
  })

  it('el borrador de estado se repone sólo con la misma versión', () => {
    const a = montar()
    act(() => {
      a.result.current.cambiar((p) => conNota(p, 'Sin guardar'))
    })
    a.unmount()
    // La misma versión: vuelve lo escrito.
    expect(montar().result.current.plantilla.nota).toBe('Sin guardar')
    // Otra versión (otra hora de la esperada): no se repone.
    const otra = montar({ esperada: '2026-11-07T16:00:00.000001+00:00' })
    expect(otra.result.current.plantilla.nota).toBeUndefined()
  })
})
