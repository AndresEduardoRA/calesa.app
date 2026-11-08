import {
  cicloDeUnaConfirmacion,
  dobleClicManda,
  noAbre,
  sinRedNoConfirma,
} from './soporte/confirmar-por-url'
import {
  enviarAPapelera,
  estadoEnLaBase,
  filasDe,
  irALaPapelera,
  limpiarPapelera,
  prepararPapelera,
  ponerComprobante,
  sembrarConTitulos,
  sembrarFinal,
  titulosNumerados,
  versionDelLote,
  type TerrenoDeLaPapelera,
} from './soporte/cotizaciones-papelera'
import { rpcComo } from './soporte/leads-cartera'
import { expect, test, type Locator, type Page } from './soporte/prueba'

// Purgar desde la papelera de cotizaciones (paso 4.24-2b, `docs/UX.md` › «Cotizaciones»): con `cotizaciones.papelera.purgar`, «Purgar» en cada cotización y «Purgar el
// lote» en un lote de varios abren un `<Confirmar>` con su URL (`?panel=purgar&lote=<id>[&cotizacion=<id>]`) que nombra lo que se borra; un lote de varios pide tipear
// «purgar N». Lo que respondió la base (un conflicto, lo bloqueado) se dice. Quien no tiene la clave no ve «Purgar» (E6 de `cotizaciones-papelera.spec.ts`) y la URL
// escrita a mano no le abre nada. El terreno lo arma `soporte/cotizaciones-papelera.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaPapelera

test.beforeAll(async ({}, info) => {
  t = await prepararPapelera(info.project.name)
})

test.afterAll(async () => {
  await limpiarPapelera()
})

const URL_DE_PURGAR = /[?&]panel=purgar/
const sembrar = (titulos: readonly string[], creadoPor = t.duena): string[] =>
  sembrarConTitulos({ origenId: t.origen.id, creadoPor, titulos })
// El lote de la dueña que tiene esa cotización.
const loteCon = (page: Page, titulo: string): Locator =>
  page.getByRole('region', { name: 'Lote enviado por ti' }).filter({ hasText: titulo })
const campoDePalabra = (dialogo: Locator): Locator => dialogo.getByLabel(/Para confirmar/)

test('P1 purgar una: el diálogo la nombra, vive en la URL y la borra para siempre', async ({
  page,
  context,
}) => {
  const [a, b] = sembrar(['P1 a', 'P1 b'])
  await enviarAPapelera(t.duena, [a ?? '', b ?? ''])
  await irALaPapelera(page, t.duena)
  await expect(
    page.getByText(
      'Todo lo que se envió a la papelera. Se purga solo cuando vence, o antes si lo purgas.',
    ),
  ).toBeVisible()
  const lote = loteCon(page, 'P1 b')
  const disparador = lote.getByRole('button', { name: 'Purgar P1 a' })
  const dialogo = page.getByRole('dialog', { name: 'Purgar «P1 a»' })
  await cicloDeUnaConfirmacion(page, {
    abrir: () => disparador.click(),
    dialogo,
    disparador,
    url: new RegExp(`panel=purgar.*lote=.*cotizacion=${a ?? ''}`),
  })
  await expect(
    dialogo.getByText(
      'Se borra para siempre, con sus revisiones, comentarios y adjuntos. No se puede deshacer ni restaurar.',
    ),
  ).toBeVisible()
  await expect(campoDePalabra(dialogo)).toHaveCount(0)
  const confirmar = dialogo.getByRole('button', { name: 'Purgar', exact: true })
  await sinRedNoConfirma(context, dialogo, confirmar)
  await confirmar.click()
  await expect(page.getByText('«P1 a» se purgó.')).toBeVisible()
  await expect(dialogo).toBeHidden()
  await expect(page).not.toHaveURL(URL_DE_PURGAR)
  await expect(lote.getByText('P1 a', { exact: true })).toHaveCount(0)
  await expect(lote.getByText('P1 b', { exact: true })).toBeVisible()
  expect(estadoEnLaBase(a ?? '')).toBeUndefined()
  expect(estadoEnLaBase(b ?? '')?.eliminadoEn).not.toBeNull()
})

test('P2 un lote de 25 nombra cinco, pide tipear «purgar 25» y un doble clic manda un pedido', async ({
  page,
}) => {
  const titulos = titulosNumerados(25, 'P2 de veinticinco')
  const ids = sembrar(titulos)
  await enviarAPapelera(t.duena, ids)
  await irALaPapelera(page, t.duena)
  const lote = loteCon(page, 'P2 de veinticinco 1')
  await expect(filasDe(lote)).toHaveCount(20)
  await lote.getByRole('button', { name: 'Purgar el lote' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Purgar el lote de 25' })
  await expect(dialogo).toBeVisible()
  await expect(
    dialogo.getByText(/: «P2 de veinticinco \d+»(, «P2 de veinticinco \d+»){4} y 20 más\./),
  ).toBeVisible()
  const confirmar = dialogo.getByRole('button', { name: 'Purgar las 25' })
  await expect(confirmar).toBeDisabled()
  await campoDePalabra(dialogo).fill('purgar 24')
  await expect(confirmar).toBeDisabled()
  await campoDePalabra(dialogo).fill('purgar 25')
  await expect(confirmar).toBeEnabled()
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect(page.getByText('Se purgaron 25.')).toBeVisible()
  await expect(loteCon(page, 'P2 de veinticinco 1')).toHaveCount(0)
  for (const id of ids) {
    expect(estadoEnLaBase(id)).toBeUndefined()
  }
})

test('P3 una URL que no abre avisa y se limpia: un lote que no está, una cotización de otro lote, sin la clave', async ({
  page,
}) => {
  const [x] = sembrar(['P3 x'])
  const [y] = sembrar(['P3 y'])
  const deX = await enviarAPapelera(t.duena, [x ?? ''])
  await enviarAPapelera(t.duena, [y ?? ''])
  await irALaPapelera(page, t.duena)
  await noAbre(
    page,
    '/cotizaciones/papelera?panel=purgar&lote=99999999-9999-4999-8999-999999999999',
    'Ese lote ya no está en esta página de la papelera.',
    URL_DE_PURGAR,
  )
  await noAbre(
    page,
    `/cotizaciones/papelera?panel=purgar&lote=${deX.lote}&cotizacion=${y ?? ''}`,
    'Esa cotización ya no está en el lote.',
    URL_DE_PURGAR,
  )
  // Ana ve su lote y no tiene la clave: la URL escrita a mano no le abre el diálogo.
  const deAna = await enviarAPapelera(t.ana, sembrar(['P3 de Ana'], t.ana))
  await irALaPapelera(page, t.ana)
  await noAbre(
    page,
    `/cotizaciones/papelera?panel=purgar&lote=${deAna.lote}`,
    'No tienes permiso para purgar la papelera de cotizaciones.',
    URL_DE_PURGAR,
  )
  expect(estadoEnLaBase(x ?? '')?.eliminadoEn).not.toBeNull()
})

test('P4 una final con comprobante no se purga: el aviso dice cuál y por qué, y queda en el lote', async ({
  page,
}) => {
  const final = sembrarFinal({
    origenId: t.origen.id,
    creadoPor: t.duena,
    titulo: 'P4 final con comprobante',
  })
  const [preventa] = sembrar(['P4 preventa'])
  await enviarAPapelera(t.duena, [final, preventa ?? ''])
  ponerComprobante(final)
  await irALaPapelera(page, t.duena)
  const lote = loteCon(page, 'P4 final con comprobante')
  await lote.getByRole('button', { name: 'Purgar el lote' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Purgar el lote de 2' })
  await campoDePalabra(dialogo).fill('purgar 2')
  await dialogo.getByRole('button', { name: 'Purgar las 2' }).click()
  await expect(
    page.getByText(
      'Se purgó 1 de 2. No se purgó «P4 final con comprobante»: Otros registros dependen de ella.',
    ),
  ).toBeVisible()
  await expect(dialogo).toBeHidden()
  await expect(lote.getByText('Lote de 2 · quedan 1')).toBeVisible()
  await expect(lote.getByText('P4 preventa', { exact: true })).toHaveCount(0)
  expect(estadoEnLaBase(preventa ?? '')).toBeUndefined()
  expect(estadoEnLaBase(final)?.eliminadoEn).not.toBeNull()
})

test('P5 con la versión vieja no se purga nada: el conflicto se dice en el diálogo y «Recargar» muestra cómo quedó', async ({
  page,
}) => {
  const ids = sembrar(['P5 uno', 'P5 dos', 'P5 tres'])
  const envio = await enviarAPapelera(t.duena, ids)
  await irALaPapelera(page, t.duena)
  const lote = loteCon(page, 'P5 tres')
  await lote.getByRole('button', { name: 'Purgar el lote' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Purgar el lote de 3' })
  await expect(dialogo).toBeVisible()
  // Otra sesión restaura una mientras el diálogo está abierto: el lote cambia de versión.
  const otra = await rpcComo(t.duena, 'cotizaciones_papelera_restaurar', {
    p_lote: envio.lote,
    p_actualizado_en_esperado: versionDelLote(envio.lote),
    p_cotizaciones: [ids[0]],
  })
  expect(otra.error).toBeNull()
  await campoDePalabra(dialogo).fill('purgar 3')
  const confirmar = dialogo.getByRole('button', { name: 'Purgar las 3' })
  await confirmar.click()
  await expect(
    dialogo.getByText('No se purgó nada. Recarga para ver cómo quedó el lote.'),
  ).toBeVisible()
  await expect(confirmar).toBeDisabled()
  for (const id of ids.slice(1)) {
    expect(estadoEnLaBase(id)?.eliminadoEn).not.toBeNull()
  }
  await dialogo.getByRole('button', { name: 'Recargar' }).click()
  await expect(dialogo).toBeHidden()
  await expect(lote.getByText('Lote de 3 · quedan 2')).toBeVisible()
})
