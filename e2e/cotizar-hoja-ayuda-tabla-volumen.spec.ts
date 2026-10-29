import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { filasDePrueba, publicarConTabla } from './soporte/cotizar-ayuda-tabla'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'

// La ayuda de una tabla con volumen (paso 4.13-4c2, `.claude/rules/escala.md`): la lectura trae a lo sumo 1.000 filas y avisa si había más; el panel las dibuja todas con un tope de
// nodos que no crece con nada más que con las filas. El tope es POR CELDA: filas × (1 + columnas + 3 × columnas con dinero) + la estructura (el diálogo, el encabezado, el aviso),
// medida con tres filas. Las filas se siembran por SQL (`generate_series`). Medido el 2026-10-29 con 1.000 filas: 7.023 nodos; el tope es eso más 5 %.
test.describe.configure({ mode: 'serial' })

const FILAS = 1000
const FILAS_DE_PRUEBA = filasDePrueba(1).length
const TOPE_DE_NODOS = 7_374
// Una fila de la tabla de prueba: el `<tr>`, tres celdas y las tres capas de un `<Monto>` (el factor es dinero, la celda que abre la ayuda es en dólares).
const NODOS_POR_FILA = 1 + 3 + 3

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''

test.beforeAll(async ({}, info) => {
  ;({ origen, duena, lead } = await prepararGuardado(info.project.name, 'tabla_vol'))
})

test.afterAll(async () => {
  await limpiarGuardado()
})

async function nodosDelPanel(page: Page): Promise<number> {
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}&ayuda=tabla&nodo=con_ayuda`)
  const panel = page.getByRole('dialog', { name: 'Ayuda de Con ayuda' })
  await expect(panel.locator('tbody tr').first()).toBeVisible()
  return panel.evaluate((dialogo) => dialogo.querySelectorAll('*').length + 1)
}

test('con 1.001 filas el panel dibuja las primeras 1.000, lo dice al pie y los nodos caben en el tope por celda', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  publicarConTabla(origen.id, { lista: filasDePrueba(1) })
  const conTres = await nodosDelPanel(page)
  // Lo que crece es por celda: cada fila suma `NODOS_POR_FILA` a lo que mide con tres (la estructura no depende de las filas), más el aviso del tope.
  const esperados = conTres + (FILAS - FILAS_DE_PRUEBA) * NODOS_POR_FILA + 1

  publicarConTabla(origen.id, { generadas: FILAS + 1 })
  const inicio = Date.now()
  const nodos = await nodosDelPanel(page)
  const panel = page.getByRole('dialog', { name: 'Ayuda de Con ayuda' })
  await expect(panel.locator('tbody tr')).toHaveCount(FILAS)
  const tardo = Date.now() - inicio
  await expect(panel.getByRole('status')).toHaveText('Mostrando las 1.000 primeras filas.')
  // La última dibujada es la 1.000 (el factor crece de a 1,5 por fila) y la 1.001 no está.
  await expect(panel.getByRole('cell').filter({ hasText: '1.500,00' })).toBeVisible()
  await expect(panel.getByRole('cell').filter({ hasText: '1.501,50' })).toHaveCount(0)
  info.annotations.push({
    type: 'medida',
    description: `nodos del panel con ${String(FILAS)} filas: ${String(nodos)} (con tres filas ${String(conTres)}, tope ${String(TOPE_DE_NODOS)}); abrir y dibujar: ${String(tardo)} ms`,
  })
  expect(nodos).toBe(esperados)
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS)
})
