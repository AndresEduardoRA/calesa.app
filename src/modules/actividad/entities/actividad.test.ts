import { describe, expect, it } from 'vitest'
import { diffDesde, idDelCambio } from './actividad'

const cabecera = {
  id: 12,
  visible: true,
  accion: 'gastos.update',
  tabla: 'gastos',
  registro_id: '00000000-0000-4000-8000-000000000001',
  actor_id: null,
  actor_nombre: null,
  creado_en: '2026-11-12T15:00:00.000Z',
  cambios: { monto: { antes: 10, despues: 20 } },
}

describe('diffDesde', () => {
  it('T8 · lee la moneda de cada lado y el origen de la foto', () => {
    const diff = diffDesde({
      ...cabecera,
      moneda_antes: 'BOB',
      moneda_despues: 'USD',
      origen_id: '00000000-0000-4000-8000-0000000000aa',
    })
    expect(diff).toMatchObject({
      visible: true,
      monedaAntes: 'BOB',
      monedaDespues: 'USD',
      origenId: '00000000-0000-4000-8000-0000000000aa',
    })
  })

  it('T8 · una respuesta sin esas claves sigue valiendo, con nulos', () => {
    expect(diffDesde(cabecera)).toMatchObject({
      monedaAntes: null,
      monedaDespues: null,
      origenId: null,
    })
    expect(
      diffDesde({ ...cabecera, moneda_antes: null, moneda_despues: null, origen_id: null }),
    ).toMatchObject({
      monedaAntes: null,
      monedaDespues: null,
      origenId: null,
    })
  })

  it('T8 · sin acceso sigue siendo sólo {id, visible: false}', () => {
    expect(diffDesde({ id: 3, visible: false })).toEqual({ id: 3, visible: false })
  })
})

describe('idDelCambio', () => {
  it('T8 · sólo un entero positivo seguro', () => {
    expect(idDelCambio('12')).toBe(12)
    for (const malo of ['0', '-3', '1.5', 'abc', '', ' 12', '99999999999999999999', null]) {
      expect(idDelCambio(malo)).toBeNull()
    }
  })
})
