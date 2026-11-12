import { describe, expect, it } from 'vitest'
import { ordenDeLaRueda } from './orden-de-la-rueda'
import type { FilaDelTablero } from './tablero'

let n = 0
function fila(cambios: Partial<FilaDelTablero>): FilaDelTablero {
  n += 1
  return {
    usuarioId: `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`,
    nombre: `Persona ${String(n)}`,
    enLaRueda: true,
    cuentaActiva: true,
    faltaWhatsapp: false,
    disponible: true,
    prioridad: 0,
    orden: 0,
    maxAbiertas: null,
    cupo: 3,
    abiertas: 0,
    asignadasTotal: 0,
    contactadasTotal: 0,
    vencidasTotal: 0,
    tasaContactoPct: null,
    ultimaAsignacionEn: '2026-11-10T10:00:00+00:00',
    ...cambios,
  }
}

const nombres = (filas: readonly FilaDelTablero[]) => filas.map((f) => f.nombre)

describe('ordenDeLaRueda: espejo del paso 5 de web.solicitar_asesor', () => {
  it('O1 · la de cupo lleno va detrás aunque tenga menos abiertas', () => {
    const llena = fila({ nombre: 'Llena', abiertas: 1, cupo: 1 })
    const conLugar = fila({ nombre: 'Con lugar', abiertas: 2, cupo: 3 })
    expect(nombres(ordenDeLaRueda([llena, conLugar]).elegibles)).toEqual(['Con lugar', 'Llena'])
  })

  it('O2 · la carga es división entera: prioridad 1 con 2 abiertas empata con prioridad 0 con 1 y desempata la última asignación', () => {
    const prioritaria = fila({
      nombre: 'Prioritaria',
      prioridad: 1,
      abiertas: 2,
      ultimaAsignacionEn: '2026-11-10T09:00:00+00:00',
    })
    const comun = fila({
      nombre: 'Común',
      prioridad: 0,
      abiertas: 1,
      ultimaAsignacionEn: '2026-11-10T11:00:00+00:00',
    })
    const cargada = fila({ nombre: 'Cargada', prioridad: 0, abiertas: 2 })
    expect(nombres(ordenDeLaRueda([cargada, comun, prioritaria]).elegibles)).toEqual([
      'Prioritaria',
      'Común',
      'Cargada',
    ])
    // Con 3 abiertas y prioridad 1 la carga es floor(3/2) = 1: sigue empatada con la común.
    const conTres = fila({
      nombre: 'Con tres',
      prioridad: 1,
      abiertas: 3,
      cupo: 5,
      ultimaAsignacionEn: '2026-11-10T08:00:00+00:00',
    })
    expect(nombres(ordenDeLaRueda([comun, conTres]).elegibles)).toEqual(['Con tres', 'Común'])
  })

  it('O3 · la que nunca recibió un turno va primero; las fechas se comparan como instantes', () => {
    const nunca = fila({ nombre: 'Nunca', ultimaAsignacionEn: null })
    // 10:00 en La Paz son las 14:00 UTC: va después de las 13:30 UTC aunque el texto diga «10».
    const tarde = fila({ nombre: 'Tarde', ultimaAsignacionEn: '2026-11-10T10:00:00-04:00' })
    const temprano = fila({ nombre: 'Temprano', ultimaAsignacionEn: '2026-11-10T13:30:00+00:00' })
    expect(nombres(ordenDeLaRueda([tarde, temprano, nunca]).elegibles)).toEqual([
      'Nunca',
      'Temprano',
      'Tarde',
    ])
  })

  it('O4 · en empate total decide `orden` y después el id', () => {
    const b = fila({ nombre: 'B', orden: 1, usuarioId: 'aaaaaaaa-0000-4000-8000-000000000000' })
    const a = fila({ nombre: 'A', orden: 0, usuarioId: 'ffffffff-0000-4000-8000-000000000000' })
    const c = fila({ nombre: 'C', orden: 1, usuarioId: '0aaaaaaa-0000-4000-8000-000000000000' })
    expect(nombres(ordenDeLaRueda([b, a, c]).elegibles)).toEqual(['A', 'C', 'B'])
  })

  it('O5 · sin WhatsApp o no disponible quedan fuera, por nombre, y le falta el WhatsApp gana', () => {
    const zoe = fila({ nombre: 'Zoe', disponible: false })
    const ana = fila({ nombre: 'Ana', faltaWhatsapp: true, disponible: false })
    const lista = fila({ nombre: 'Lista' })
    const orden = ordenDeLaRueda([zoe, lista, ana])
    expect(nombres(orden.elegibles)).toEqual(['Lista'])
    expect(orden.fuera.map((f) => [f.fila.nombre, f.motivo])).toEqual([
      ['Ana', 'falta_whatsapp'],
      ['Zoe', 'no_disponible'],
    ])
  })

  it('O6 · la que no está en la rueda no aparece en ninguna de las dos', () => {
    const sinRol = fila({ nombre: 'Sin rol', enLaRueda: false })
    const sinRolNiWhatsapp = fila({ nombre: 'Sin nada', enLaRueda: false, faltaWhatsapp: true })
    const orden = ordenDeLaRueda([sinRol, sinRolNiWhatsapp])
    expect(orden.elegibles).toEqual([])
    expect(orden.fuera).toEqual([])
  })

  it('O7 · no muta la entrada', () => {
    const entrada = [fila({ nombre: 'Segunda', abiertas: 2 }), fila({ nombre: 'Primera' })]
    const copia = structuredClone(entrada)
    ordenDeLaRueda(entrada)
    expect(entrada).toEqual(copia)
  })
})
