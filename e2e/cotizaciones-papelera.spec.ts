import { entrar } from './soporte/alta'
import {
  enviarAPapelera,
  estadoEnLaBase,
  limpiarPapelera,
  prepararPapelera,
  sembrarConTitulos,
  titulosNumerados,
  versionDelLote,
  type TerrenoDeLaPapelera,
} from './soporte/cotizaciones-papelera'
import { enKB, medirJsEnFrio } from './soporte/js-en-frio'
import { rpcComo } from './soporte/leads-cartera'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// La papelera de cotizaciones (paso 4.24-2, `docs/UX.md` › «Cotizaciones»): `/cotizaciones/papelera`, por lote. Quién ve qué lote lo decide la base; la pantalla lee por cursor, trae un
// lote entero con «Mostrar los N» y restaura (entero o una por una) diciendo el resultado. Purgar es del 4.24-2b. El terreno lo arma `soporte/cotizaciones-papelera.ts`.
test.describe.configure({ mode: 'serial' })

// Lo que aguanta la página 1 con 5 lotes de 20 a la vista (la papelera de leads usa 3.000 con la misma forma, `escala-recorrido.spec.ts`) y su documento sin comprimir;
// el JS en frío de la ruta, en KB con gzip (`presupuestos.ts` es del A: el presupuesto de esta ruta vive aquí hasta que lo mude, «Necesita del carril A»).
const NODOS_DE_LA_PAPELERA_DE_COTIZACIONES = 3_000
// El documento mide 91.005 B con la papelera vacía (el marco) y 342.766 B con 5 lotes × 20 filas: ≈ 2,5 KB por fila (HTML con sus clases y payload de RSC; el reparto exacto no se midió). Lo que importa es que no crezca con el lote: con 21 o con 200 mide lo mismo. Tope: lo medido más un 5 %.
const BYTES_DE_LA_PAPELERA_DE_COTIZACIONES = 360_000
// Medido 417,9 KB en 23 chunks (el marco de `(app)` pone casi todo: `/perfil` mide 417,2), más un 5 % hacia arriba a la decena.
const PRESUPUESTO_DE_JS_DE_LA_PAPELERA_EN_KB = 440

let t: TerrenoDeLaPapelera

test.beforeAll(async ({}, info) => {
  t = await prepararPapelera(info.project.name)
})

test.afterAll(async () => {
  await limpiarPapelera()
})

const lotes = (page: Page): Locator => page.locator('section[aria-label^="Lote enviado por"]')
const deLaDuena = (page: Page): Locator => page.getByRole('region', { name: 'Lote enviado por ti' })
const sembrar = (titulos: readonly string[], creadoPor = t.duena): string[] =>
  sembrarConTitulos({ origenId: t.origen.id, creadoPor, titulos })
const filasDe = (lote: Locator): Locator => lote.locator('ul > li')

async function irALaPapelera(page: Page, correo: string): Promise<void> {
  // Cambiar de persona en la misma página: la sesión de antes no se descarta sola.
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto('/cotizaciones/papelera')
  await expect(page.getByRole('heading', { name: 'Papelera de cotizaciones' })).toBeVisible()
}

test('E1 la dueña ve los lotes de todos, cada cotización con su número, clase, origen y fecha, y pasa de página', async ({
  page,
}) => {
  // Ana manda dos suyas; la dueña, cinco lotes de una: seis lotes, y la página trae cinco.
  await enviarAPapelera(t.ana, sembrar(['E1 de Ana uno', 'E1 de Ana dos'], t.ana))
  for (const titulo of ['E1 uno', 'E1 dos', 'E1 tres', 'E1 cuatro', 'E1 cinco']) {
    await enviarAPapelera(t.duena, sembrar([titulo]))
  }
  await irALaPapelera(page, t.duena)
  await expect(lotes(page)).toHaveCount(5)
  await expect(page.getByText('Todo lo que se envió a la papelera.')).toBeVisible()
  await expect(
    page.getByText('Las cotizaciones que se fueron con su vehículo no están aquí', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir a la papelera de vehículos' })).toBeVisible()
  const ultimo = deLaDuena(page).first()
  await expect(ultimo.getByText(/N\.º \d+/)).toBeVisible()
  await expect(ultimo.getByText('Preventa')).toBeVisible()
  await expect(ultimo.getByText(t.origen.nombre)).toBeVisible()
  await expect(ultimo.getByText(/Creada el /)).toBeVisible()
  await expect(ultimo.getByText(/Se purga en \d+ días/)).toBeVisible()
  await page.getByRole('link', { name: 'Siguiente' }).click()
  const deAna = page.getByRole('region', { name: 'Lote enviado por Ana Papelera' })
  await expect(deAna).toBeVisible()
  await expect(deAna.getByText('E1 de Ana uno')).toBeVisible()
  await expect(deAna.getByText('E1 de Ana dos')).toBeVisible()
  await page.getByRole('link', { name: 'Anterior' }).click()
  await expect(lotes(page)).toHaveCount(5)
})

test('E2 un lote de 25 muestra 20 y «Mostrar los 25» trae el resto; si se purgó mientras tanto, lo dice y «Recargar»', async ({
  page,
}) => {
  await enviarAPapelera(t.duena, sembrar(titulosNumerados(25, 'E2 de veinticinco')))
  await irALaPapelera(page, t.duena)
  const lote = deLaDuena(page).first()
  await expect(filasDe(lote)).toHaveCount(20)
  await lote.getByRole('button', { name: 'Mostrar los 25' }).click()
  await expect(filasDe(lote)).toHaveCount(25)
  // Otro lote que otra persona purga antes de que se pida el resto.
  const purgado = await enviarAPapelera(t.duena, sembrar(titulosNumerados(21, 'E2 de veintiuno')))
  await page.goto('/cotizaciones/papelera')
  const nuevo = deLaDuena(page).first()
  await expect(filasDe(nuevo)).toHaveCount(20)
  const purga = await rpcComo(t.duena, 'cotizaciones_papelera_purgar', {
    p_lote: purgado.lote,
    p_actualizado_en_esperado: versionDelLote(purgado.lote),
  })
  expect(purga.error).toBeNull()
  await nuevo.getByRole('button', { name: 'Mostrar los 21' }).click()
  await expect(nuevo.getByText('Ese lote ya no está en la papelera.')).toBeVisible()
  await nuevo.getByRole('button', { name: 'Recargar' }).click()
  await expect(page.getByRole('button', { name: 'Mostrar los 21' })).toHaveCount(0)
})

test('E3 restaurar una cotización y después el lote entero', async ({ page }) => {
  const [uno, dos, tres] = sembrar(['E3 uno', 'E3 dos', 'E3 tres'])
  await enviarAPapelera(t.duena, [uno ?? '', dos ?? '', tres ?? ''])
  await irALaPapelera(page, t.duena)
  // Se reconoce por una que no se restaura primero: «E3 uno» sale del lote al volver.
  const lote = deLaDuena(page).filter({ hasText: 'E3 dos' })
  await lote.getByRole('button', { name: 'Restaurar E3 uno' }).click()
  await expect(page.getByText('«E3 uno» volvió a tus cotizaciones.')).toBeVisible()
  await expect(lote.getByRole('button', { name: 'Restaurar E3 uno' })).toHaveCount(0)
  expect(estadoEnLaBase(uno ?? '')?.eliminadoEn).toBeNull()
  expect(estadoEnLaBase(dos ?? '')?.eliminadoEn).not.toBeNull()
  await lote.getByRole('button', { name: 'Restaurar el lote' }).click()
  await expect(page.getByText('Se restauraron 2.')).toBeVisible()
  await expect(deLaDuena(page).filter({ hasText: 'E3 dos' })).toHaveCount(0)
  expect(estadoEnLaBase(dos ?? '')?.eliminadoEn).toBeNull()
  expect(estadoEnLaBase(tres ?? '')?.eliminadoEn).toBeNull()
})

test('E4 lo que choca queda en la papelera y el aviso dice por qué; el resto vuelve', async ({
  page,
}) => {
  const [anterior, nueva, libre, otra] = sembrar(['E4 anterior', 'E4 nueva', 'E4 libre', 'E4 otra'])
  // La nueva es la versión nueva de la anterior; la mandan a la papelera con una libre y, mientras tanto, otra versión nueva de la anterior toma su lugar.
  const poner = (hija: string | undefined, padre: string | undefined): void => {
    sql(`begin;
      set local session_replication_role = replica;
      update public.cotizaciones set cotizacion_padre_id = ${literal(padre ?? '')}::uuid where id = ${literal(hija ?? '')}::uuid;
      commit;`)
  }
  poner(nueva, anterior)
  await enviarAPapelera(t.duena, [nueva ?? '', libre ?? ''])
  poner(otra, anterior)
  await irALaPapelera(page, t.duena)
  await deLaDuena(page)
    .filter({ hasText: 'E4 nueva' })
    .getByRole('button', { name: 'Restaurar el lote' })
    .click()
  await expect(page.getByText(/Se restauró 1 de 2\./)).toBeVisible()
  await expect(
    page.getByText(/No se restauró «E4 nueva»: Esa cotización ya tiene otra versión nueva\./),
  ).toBeVisible()
  expect(estadoEnLaBase(libre ?? '')?.eliminadoEn).toBeNull()
  expect(estadoEnLaBase(nueva ?? '')?.eliminadoEn).not.toBeNull()
})

test('E5 con la página vieja: otra sesión restauró del mismo lote, «Restaurar» da el conflicto con «Recargar» y no cambia nada', async ({
  page,
}) => {
  const [a, b, c] = sembrar(['E5 a', 'E5 b', 'E5 c'])
  const envio = await enviarAPapelera(t.duena, [a ?? '', b ?? '', c ?? ''])
  await irALaPapelera(page, t.duena)
  await expect(page.getByRole('button', { name: 'Restaurar E5 a' })).toBeVisible()
  const otra = await rpcComo(t.duena, 'cotizaciones_papelera_restaurar', {
    p_lote: envio.lote,
    p_actualizado_en_esperado: envio.actualizadoEn,
    p_cotizaciones: [b],
  })
  expect(otra.error).toBeNull()
  await page.getByRole('button', { name: 'Restaurar E5 a' }).click()
  await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
  expect(estadoEnLaBase(a ?? '')?.eliminadoEn).not.toBeNull()
  expect(estadoEnLaBase(c ?? '')?.eliminadoEn).not.toBeNull()
})

test('E6 quien no tiene la clave de vaciar ve y restaura sólo lo suyo; sin lotes, la papelera vacía', async ({
  page,
}) => {
  await irALaPapelera(page, t.ana)
  await expect(lotes(page)).toHaveCount(1)
  await expect(
    page.getByText('Lo que enviaste a la papelera. Puedes restaurarlo hasta que se purgue.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restaurar E1 de Ana uno' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Purgar/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ir a la papelera de vehículos' })).toHaveCount(0)
  await irALaPapelera(page, t.eva)
  await expect(page.getByText('La papelera está vacía')).toBeVisible()
  await expect(
    page.getByText('Las cotizaciones que se fueron con su vehículo no están aquí', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir a la papelera de vehículos' })).toHaveCount(0)
})

test('E7 sin las claves de enviar ni de vaciar no hay enlace ni papelera; la dueña llega desde el listado', async ({
  page,
}) => {
  const listado = `/cotizaciones?origen=${t.origen.id}`
  await entrar(page, t.soloVer, { fresco: true })
  await page.goto(listado)
  await expect(page.locator('tbody tr, li article').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Papelera' })).toHaveCount(0)
  await page.goto('/cotizaciones/papelera')
  await expect(
    page.getByText('No tienes permiso para enviar cotizaciones a la papelera ni para vaciarla.'),
  ).toBeVisible()
  await expect(lotes(page)).toHaveCount(0)
  await page.context().clearCookies()
  await entrar(page, t.duena, { fresco: true })
  await page.goto(listado)
  await page.getByRole('link', { name: 'Papelera' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/papelera$/)
  await expect(page.getByRole('heading', { name: 'Papelera de cotizaciones' })).toBeVisible()
})

// Lo que mide el documento y los nodos de la página 1 (5 lotes × 20 a la vista).
async function medirLaPagina(page: Page): Promise<{ bytes: number; nodos: number }> {
  const respuesta = await page.goto('/cotizaciones/papelera')
  const bytes = (await respuesta?.body())?.length ?? 0
  const nodos = await page.evaluate(() => document.querySelectorAll('*').length)
  return { bytes, nodos }
}

test('E8 el JS en frío de la papelera y su página no crecen con el tamaño de los lotes', async ({
  page,
}, info) => {
  test.setTimeout(300_000)
  await entrar(page, t.duena, { fresco: true })
  const js = await medirJsEnFrio(page.context(), '/cotizaciones/papelera')
  const resumenDeJs = `/cotizaciones/papelera: ${String(enKB(js.bytes))} KB en ${String(js.chunks)} chunks`
  console.warn(`[papelera] ${info.project.name}: ${resumenDeJs}`)
  info.annotations.push({ type: 'JS en frío de la papelera', description: resumenDeJs })
  expect(enKB(js.bytes), resumenDeJs).toBeLessThanOrEqual(PRESUPUESTO_DE_JS_DE_LA_PAPELERA_EN_KB)

  // Seis lotes de 21: la página 1 trae los cinco más nuevos, con 20 filas cada uno.
  for (let i = 1; i <= 6; i++) {
    await enviarAPapelera(t.duena, sembrar(titulosNumerados(21, `E8 de veintiuno ${String(i)}`)))
  }
  const chicos = await medirLaPagina(page)
  await expect(lotes(page)).toHaveCount(5)
  // Y seis de 200, más nuevos: la página 1 vuelve a tener cinco lotes y 20 filas de cada uno.
  for (let i = 1; i <= 6; i++) {
    await enviarAPapelera(t.duena, sembrar(titulosNumerados(200, `E8 de doscientos ${String(i)}`)))
  }
  const grandes = await medirLaPagina(page)
  await expect(lotes(page)).toHaveCount(5)
  await expect(filasDe(lotes(page).first())).toHaveCount(20)
  const resumen = `página 1 con 5 lotes de 20 a la vista: ${String(chicos.nodos)} nodos y ${String(chicos.bytes)} B con lotes de 21; ${String(grandes.nodos)} nodos y ${String(grandes.bytes)} B con lotes de 200`
  console.warn(`[papelera] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'página de la papelera', description: resumen })
  expect(grandes.nodos, resumen).toBeLessThan(NODOS_DE_LA_PAPELERA_DE_COTIZACIONES)
  expect(grandes.bytes, resumen).toBeLessThan(BYTES_DE_LA_PAPELERA_DE_COTIZACIONES)
  // No crece con el lote: lo mismo, con una diferencia de dígitos («Mostrar los N», «Lote de N»).
  expect(Math.abs(grandes.nodos - chicos.nodos) / chicos.nodos, resumen).toBeLessThanOrEqual(0.02)
  expect(Math.abs(grandes.bytes - chicos.bytes) / chicos.bytes, resumen).toBeLessThanOrEqual(0.02)
})
