import { describe, expect, it } from 'vitest'
import { saltadasDelResultado, saltadasEnElDiff } from './saltadas.mjs'

// `saltadas.mjs` cuida el «cero saltadas nuevas»: busca en el diff pruebas que un paso dejó saltadas, y compara las que cuenta un
// `resultado.json` de Vitest contra las del marcador anterior. Se prueba con fixtures de diff y de resultado.
const diff = (archivo: string, ...lineas: string[]) =>
  [
    `diff --git a/${archivo} b/${archivo}`,
    `--- a/${archivo}`,
    `+++ b/${archivo}`,
    '@@ -10,0 +11,3 @@',
    ...lineas,
  ].join('\n')

describe('saltadas.mjs › el diff', () => {
  it.each([
    "+  it.skip('no anda', () => {})",
    "+  test.skip('no anda', async () => {})",
    "+test.fixme('luego', async () => {})",
    "+describe.skip('un grupo', () => {})",
    "+  it.todo('falta')",
    "+xit('x', () => {})",
    "+xdescribe('x', () => {})",
    "+  test.skip(esMovil, 'solo escritorio')",
    "+test.describe.skip('x', () => {})",
    "+  it.skipIf(process.env.CI)('x', () => {})",
  ])('encuentra: %s', (linea) => {
    const r = saltadasEnElDiff(diff('src/a.test.ts', linea))
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ archivo: 'src/a.test.ts', linea: 11 })
  })

  it.each([
    "+  it('anda', () => {})",
    "-  it.skip('esta se quita', () => {})",
    '+  // it.skip: antes estaba saltada',
    "+  const skipped = 'x'",
    '+  expect(await page.skipLink()).toBe(1)',
    ' contexto sin cambios',
  ])('no encuentra: %s', (linea) => {
    expect(saltadasEnElDiff(diff('src/a.test.ts', linea))).toEqual([])
  })

  it('sólo mira archivos de prueba', () => {
    expect(saltadasEnElDiff(diff('src/a.ts', "+  it.skip('x', () => {})"))).toEqual([])
    expect(saltadasEnElDiff(diff('e2e/a.spec.ts', "+  test.skip('x', () => {})"))).toHaveLength(1)
    expect(
      saltadasEnElDiff(diff('scripts/guardas/a.test.ts', "+  it.skip('x', () => {})")),
    ).toHaveLength(1)
  })

  it('numera la línea de cada una según el hunk y varios archivos', () => {
    const texto = [
      diff('a.test.ts', '+uno', "+  it.skip('x', () => {})", '+tres'),
      diff('b.spec.ts', "+test.fixme('y', async () => {})"),
    ].join('\n')
    expect(saltadasEnElDiff(texto)).toEqual([
      { archivo: 'a.test.ts', linea: 12, texto: "it.skip('x', () => {})" },
      { archivo: 'b.spec.ts', linea: 11, texto: "test.fixme('y', async () => {})" },
    ])
  })

  it('las líneas quitadas no adelantan la numeración', () => {
    const texto = [
      'diff --git a/a.test.ts b/a.test.ts',
      '+++ b/a.test.ts',
      '@@ -5,2 +5,2 @@',
      '-vieja',
      '-otra vieja',
      '+nueva',
      "+it.skip('x', () => {})",
    ].join('\n')
    expect(saltadasEnElDiff(texto)[0]).toMatchObject({ linea: 6 })
  })
})

describe('saltadas.mjs › el resultado de Vitest contra el marcador anterior', () => {
  const resultado = (pendientes: number, todo = 0) =>
    JSON.stringify({ numPendingTests: pendientes, numTodoTests: todo, numTotalTests: 100 })

  it('suma las pendientes y las todo y dice cuántas son nuevas contra lo anterior', () => {
    expect(saltadasDelResultado(resultado(3, 1), 2)).toEqual({ pendientes: 4, antes: 2, nuevas: 2 })
  })

  it('igual al anterior: ninguna nueva; menos que antes: ninguna nueva (no es negativo)', () => {
    expect(saltadasDelResultado(resultado(16), 16).nuevas).toBe(0)
    expect(saltadasDelResultado(resultado(10), 16).nuevas).toBe(0)
  })

  it('sin anterior, todas se informan y ninguna se da por nueva', () => {
    expect(saltadasDelResultado(resultado(5), null)).toEqual({
      pendientes: 5,
      antes: null,
      nuevas: null,
    })
  })

  it('un resultado que no es JSON de Vitest es un error, no un cero', () => {
    expect(() => saltadasDelResultado('no es json', 0)).toThrow()
    expect(() => saltadasDelResultado('{"otra":1}', 0)).toThrow()
  })
})
