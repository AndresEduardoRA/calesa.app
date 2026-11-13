import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarOrigenesDeCotizar } from './soporte/cotizar-formula'
import { plantillaSobre } from '../src/modules/cotizaciones/infra/plantilla/rpc-de-la-plantilla'
import {
  borradorGuardado,
  borrarLasPlantillasDelOrigen,
  crearConfiguradoraDeTarjeta,
  limpiarTerrenoDePlantilla,
  plantillaPublicada,
  plantillaValida,
  prepararTerrenoDePlantilla,
  publicarPlantillaDeLaMini,
  sembrarBorradorDePlantilla,
  type TerrenoDePlantilla,
} from './soporte/plantilla'
import { quieto, sinScrollHorizontal, tactil } from './soporte/recorrido'

// Descartar el borrador de la tarjeta (4.19-3c): «Descartar borrador…» abre `?panel=descartar-plantilla`; cancelar, Esc y «atrás» no borran; confirmar borra el borrador y
// deja la publicada; el PT409 de la base (otra persona guardó o descartó) se dice tal cual y no borra; por la URL, sin borrador no abre.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDePlantilla | undefined
let configuradora = ''

const origenId = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno.origenId
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararTerrenoDePlantilla(info.project.name, 'tarjdes')
  configuradora = await crearConfiguradoraDeTarjeta(info.project.name, 'tarjdes', [origenId()])
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
})

test.beforeEach(() => {
  borrarLasPlantillasDelOrigen(origenId())
})

async function abrirTarjeta(page: Page, extra = '') {
  await entrar(page, configuradora, { fresco: true })
  await page.goto(`/configuracion/cotizacion?seccion=tarjeta&origen=${origenId()}${extra}`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
}

const descartar = (page: Page) => page.getByRole('button', { name: 'Descartar borrador…' })
const dialogo = (page: Page) =>
  page.getByRole('dialog', { name: /^Descartar el borrador de la tarjeta de / })
const confirmar = (page: Page) =>
  dialogo(page).getByRole('button', { name: 'Descartar borrador', exact: true })

test('E7: cancelar, Esc y «atrás» no borran; confirmar borra el borrador y la publicada no cambia', async ({
  page,
}) => {
  publicarPlantillaDeLaMini(origenId(), plantillaValida('publicada'))
  sembrarBorradorDePlantilla(origenId(), plantillaValida('borrador'))
  await abrirTarjeta(page)
  await descartar(page).click()
  await expect(page).toHaveURL(/panel=descartar-plantilla/)
  await expect(dialogo(page)).toBeVisible()
  await expect(
    dialogo(page).getByText(/Guardado el .*Se borra y no se puede deshacer/),
  ).toBeVisible()
  await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialogo(page)).toHaveCount(0)
  await descartar(page).click()
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toHaveCount(0)
  await descartar(page).click()
  await page.goBack()
  await expect(dialogo(page)).toHaveCount(0)
  expect(borradorGuardado(origenId())).not.toBeNull()
  // Confirmar.
  await descartar(page).click()
  await confirmar(page).click()
  await expect(page.getByText('Se descartó el borrador.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByText(/Sin borrador: parte de la versión 1 publicada\./)).toBeVisible()
  await expect(descartar(page)).toHaveCount(0)
  expect(borradorGuardado(origenId())).toBeNull()
  expect(plantillaPublicada(origenId())?.definicion.nota).toBe('Nota publicada')
})

test('E8: un PT409 porque otra persona guardó no borra y «Recargar» lo quita al llegar; si otra descartó, dice que ya no está', async ({
  page,
}) => {
  const esperada = sembrarBorradorDePlantilla(origenId(), plantillaValida('e8'))
  await abrirTarjeta(page)
  if (!terreno) throw new Error('No hay terreno.')
  const otra = await plantillaSobre(terreno.duena).guardar({
    origenId: origenId(),
    esperada,
    definicion: plantillaValida('de la otra persona'),
  })
  if (!otra.ok) throw new Error(otra.error.mensaje)
  await descartar(page).click()
  await confirmar(page).click()
  await expect(dialogo(page).getByText(/El borrador de esta plantilla cambió/)).toBeVisible()
  await expect(confirmar(page)).toBeDisabled()
  expect(borradorGuardado(origenId())).not.toBeNull()
  await dialogo(page)
    .getByRole('button', { name: /Recargar/ })
    .click()
  await expect(dialogo(page).getByText(/El borrador de esta plantilla cambió/)).toHaveCount(0)
  await expect(confirmar(page)).toBeEnabled()
  // Otra persona descarta antes de confirmar.
  const nueva = borradorGuardado(origenId())?.actualizadoEn
  if (!nueva) throw new Error('No hay borrador.')
  const borrada = await plantillaSobre(terreno.duena).descartar({
    origenId: origenId(),
    esperada: nueva,
  })
  if (!borrada.ok) throw new Error(borrada.error.mensaje)
  await confirmar(page).click()
  await expect(dialogo(page).getByText(/El borrador ya no está: se descartó/)).toBeVisible()
  await dialogo(page)
    .getByRole('button', { name: /Recargar/ })
    .click()
  await expect(
    dialogo(page).getByText('El borrador ya no está: otra persona lo publicó o lo descartó.'),
  ).toBeVisible()
  await expect(confirmar(page)).toBeDisabled()
})

test('E9: por la URL, sin borrador no abre y limpia; y en móvil el diálogo es táctil y no ensancha la página', async ({
  page,
}) => {
  await abrirTarjeta(page, '&panel=descartar-plantilla')
  await expect(page.getByText('No hay borrador para descartar.')).toBeVisible()
  await expect(dialogo(page)).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  sembrarBorradorDePlantilla(origenId(), plantillaValida('e9'))
  await page.reload()
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await tactil(page, descartar(page))
  await sinScrollHorizontal(page)
  await descartar(page).click()
  await expect(dialogo(page)).toBeVisible()
  // Los botones del pie de `<Confirmar>` (`shared/ui`) miden 44 px en el celular (4-102).
  await quieto(dialogo(page))
  await tactil(page, dialogo(page).getByRole('button', { name: 'Cancelar' }))
  await tactil(page, confirmar(page))
  await sinScrollHorizontal(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await sinScrollHorizontal(page)
})
