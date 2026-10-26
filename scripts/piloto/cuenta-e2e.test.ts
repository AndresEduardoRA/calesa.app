import { describe, expect, it } from 'vitest'
import { cuentaE2e } from './cuenta-e2e.mjs'

// `cuenta-e2e.mjs` lee los marcadores `e2e completo: sí|no (<tarea>…)` de `docs/BITACORA.md`: la cuenta `n de 3` de pasos de pantalla
// seguidos sin completo (`.claude/rules/e2e.md`, Fase 4) vuelve a 0 con cada `sí`, y sólo suma un `no (…, pantalla, n de 3)`.
const bitacora = (...lineas: string[]) => ['# Bitácora', '', ...lineas].join('\n')

describe('cuenta-e2e.mjs', () => {
  it('sin marcadores la cuenta es 0 y no hay último', () => {
    expect(cuentaE2e(bitacora('2026-10-20 — algo'))).toMatchObject({ n: 0, de: 3, ultimo: null })
  })

  it('un «no» de pantalla trae su cuenta; el siguiente paso de pantalla la sube', () => {
    const r = cuentaE2e(bitacora('**e2e completo: no (4.12-1, pantalla, 1 de 3)**'))
    expect(r).toMatchObject({ n: 1, el_siguiente_corre_completo: false })
    expect(r.ultimo).toMatchObject({ valor: 'no', tarea: '4.12-1' })
  })

  it('con 2 de 3, el siguiente paso de pantalla corre el completo', () => {
    const r = cuentaE2e(bitacora('e2e completo: no (4.13-2, pantalla, 2 de 3)'))
    expect(r).toMatchObject({ n: 2, el_siguiente_corre_completo: true })
  })

  it('un «sí» vuelve la cuenta a 0, sea del paso que sea', () => {
    const r = cuentaE2e(
      bitacora(
        'e2e completo: no (4.12-1, pantalla, 1 de 3)',
        'e2e completo: no (4.12-2, pantalla, 2 de 3)',
        'e2e completo: sí (4.12-3, escritorio)',
      ),
    )
    expect(r).toMatchObject({ n: 0, el_siguiente_corre_completo: false })
    expect(r.ultimo).toMatchObject({ valor: 'sí', tarea: '4.12-3' })
  })

  it('un «no» que no es de pantalla no cambia la cuenta (sólo pruebas SQL, el YAML, docs)', () => {
    const r = cuentaE2e(
      bitacora(
        'e2e completo: no (4.12-1, pantalla, 1 de 3)',
        'e2e completo: no (CI-4, sólo `e2e/` y docs; no es un paso de pantalla: la cuenta sigue en 0)',
        'e2e completo: no (4.10-3b, sólo pruebas SQL y docs)',
      ),
    )
    expect(r.n).toBe(1)
  })

  it('el mismo marcador repetido (bitácora y estado) cuenta una vez: la cuenta es la del último', () => {
    const r = cuentaE2e(
      bitacora(
        'e2e completo: no (4.13-1, pantalla, 1 de 3)',
        'e2e completo: no (4.13-1, pantalla, 1 de 3)',
        'e2e completo: no (4.13-2, pantalla, 2 de 3)',
        'e2e completo: no (4.13-2, pantalla, 2 de 3)',
      ),
    )
    expect(r.n).toBe(2)
  })

  it('el marcador del 3a, que no sigue el formato, no cuenta y se informa', () => {
    const r = cuentaE2e(
      bitacora(
        'e2e completo: no (4.13-2, pantalla, 2 de 3)',
        '**e2e completo — no** (4.13-3a: base; el completo lo corre el 3b)',
        'e2e completo: no, 4.13-3a (sólo la base)',
      ),
    )
    expect(r.n).toBe(2)
    expect(r.no_reconocidos).toHaveLength(2)
    expect(r.no_reconocidos[0]).toContain('4.13-3a')
  })

  it('un «sí» con formato raro no cuenta como sí: se informa y la cuenta no se mueve', () => {
    const r = cuentaE2e(
      bitacora(
        'e2e completo: no (4.13-2, pantalla, 2 de 3)',
        'e2e completo: sí, 4.13-3 (completo)',
      ),
    )
    expect(r.n).toBe(2)
    expect(r.no_reconocidos).toHaveLength(1)
  })
})

describe('cuenta-e2e.mjs › lo que no es un marcador', () => {
  it('el texto de una regla (con «sí|no» y «<tarea>») no es un marcador', () => {
    const r = cuentaE2e(
      bitacora(
        'La BITACORA dice cuál se corrió: `e2e completo: sí|no (<tarea>)`.',
        'un paso escribe `e2e completo: no (4.xx, pantalla, n de 3)`',
      ),
    )
    expect(r).toMatchObject({ n: 0, ultimo: null })
    expect(r.no_reconocidos).toEqual([])
  })

  it('devuelve la línea del último marcador, contando desde 1', () => {
    const r = cuentaE2e(bitacora('x', 'e2e completo: sí (4.11, escritorio)', 'y'))
    expect(r.ultimo).toMatchObject({ linea: 4 })
  })
})
