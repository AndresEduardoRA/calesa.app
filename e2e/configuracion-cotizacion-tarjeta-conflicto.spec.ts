import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarOrigenesDeCotizar } from './soporte/cotizar-formula'
import { plantillaSobre } from '../src/modules/cotizaciones/infra/plantilla/rpc-de-la-plantilla'
import {
  borradorGuardado,
  borrarLasPlantillasDelOrigen,
  crearConfiguradoraDeTarjeta,
  limpiarTerrenoDePlantilla,
  plantillaValida,
  prepararTerrenoDePlantilla,
  sembrarBorradorDePlantilla,
  visibilidadDeLaMini,
  type TerrenoDePlantilla,
} from './soporte/plantilla'

// El conflicto y los avisos del editor de la tarjeta (4.19-3b): el PT409 de la base se dice tal cual junto a lo tipeado; un tono que ya no está y un grupo que la fórmula
// ya no tiene se avisan al abrir; lo que sólo ve la fórmula (un nodo o un tipo de cambio de otro nivel) avisa que no se podría publicar y no apaga «Guardar».
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDePlantilla | undefined
let configuradora = ''

const origenId = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno.origenId
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararTerrenoDePlantilla(info.project.name, 'tarjconf')
  configuradora = await crearConfiguradoraDeTarjeta(info.project.name, 'tarjconf', [origenId()])
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
})

test.beforeEach(() => {
  borrarLasPlantillasDelOrigen(origenId())
})

async function abrirTarjeta(page: Page) {
  await entrar(page, configuradora, { fresco: true })
  await page.goto(`/configuracion/cotizacion?seccion=tarjeta&origen=${origenId()}`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
}

const guardar = (page: Page) => page.getByRole('button', { name: 'Guardar' })
const abrirElPie = (page: Page) => page.getByText('Pie y columnas').click()

test('E3: un PT409 se dice con el mensaje de la base, conserva lo tipeado, no envía y «Recargar» trae lo de la otra persona', async ({
  page,
}) => {
  const esperada = sembrarBorradorDePlantilla(origenId(), plantillaValida('inicial'))
  await abrirTarjeta(page)
  await abrirElPie(page)
  // Otra sesión guarda antes.
  if (!terreno) throw new Error('No hay terreno.')
  const otra = await plantillaSobre(terreno.duena).guardar({
    origenId: origenId(),
    esperada,
    definicion: plantillaValida('de la otra persona'),
  })
  if (!otra.ok) throw new Error(otra.error.mensaje)
  await page.getByLabel('Nota de la tarjeta').fill('Lo mío')
  await guardar(page).click()
  await expect(page.getByText(/El borrador de esta plantilla cambió/)).toBeVisible()
  await expect(page.getByLabel('Nota de la tarjeta')).toHaveValue('Lo mío')
  await expect(page.getByRole('link', { name: /Ver cómo quedó/ })).toHaveAttribute(
    'href',
    new RegExp(`seccion=tarjeta&origen=${origenId()}`),
  )
  await expect(guardar(page)).toBeDisabled()
  expect(borradorGuardado(origenId())?.definicion.nota).toBe('Nota de la otra persona')
  await page.getByRole('button', { name: /Recargar/ }).click()
  await expect(page.getByText(/El borrador de esta plantilla cambió/)).toHaveCount(0)
  await abrirElPie(page).catch(() => undefined)
  await expect(page.getByLabel('Nota de la tarjeta')).toHaveValue('Nota de la otra persona')
})

test('E5: un tono fuera del catálogo y un grupo que ya no está se avisan; «Del grupo» y guardar los resuelven', async ({
  page,
}) => {
  sembrarBorradorDePlantilla(origenId(), {
    ...plantillaValida('e5'),
    grupos: [
      { grupo: 'compra', tono: 'fantasma' },
      { grupo: 'viejo' },
      { grupo: 'logistica' },
      { grupo: 'aduana' },
    ],
  })
  await abrirTarjeta(page)
  await expect(page.getByText('El grupo «viejo» ya no está en la fórmula: se quitó.')).toBeVisible()
  await expect(
    page.getByText(/El tono «fantasma» del grupo «Compra» ya no está en el catálogo/),
  ).toBeVisible()
  await page.getByLabel('Tono de «Compra»').selectOption('')
  await expect(page.getByText(/El tono «fantasma»/)).toHaveCount(0)
  await guardar(page).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await expect(page.getByText(/ya no está en la fórmula/)).toHaveCount(0)
  await expect(page.getByText(/ya no está en el catálogo/)).toHaveCount(0)
})

test('E6: lo que sólo ve la fórmula avisa que no se podría publicar y «Guardar» sigue activo', async ({
  page,
}) => {
  sembrarBorradorDePlantilla(origenId(), plantillaValida('e6'))
  visibilidadDeLaMini(origenId(), { fees: { ver: 'costos' } })
  await abrirTarjeta(page)
  await abrirElPie(page)
  // Sin cambios «Guardar» está apagado por C6; con uno, sólo la forma lo apagaría.
  await page.getByLabel('Nota de la tarjeta').fill('Otra nota')
  await expect(
    page.getByText(
      'Con esto no se podría publicar: La tarjeta no puede mostrar «fees»: no es del nivel «todos».',
    ),
  ).toBeVisible()
  await expect(guardar(page)).toBeEnabled()
  await guardar(page).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
})

test('E6 (variante): el tipo de cambio de un bucket de otro nivel, al encender la columna', async ({
  page,
}) => {
  sembrarBorradorDePlantilla(origenId(), plantillaValida('e6b'))
  // `fees` vuelve a «todos»: si no, ganaría `nodo_restringido`.
  visibilidadDeLaMini(origenId(), { fees: { ver: 'todos' }, tc_adu: { ver: 'costos' } })
  await abrirTarjeta(page)
  await abrirElPie(page)
  await page.getByRole('switch', { name: 'Tipo de cambio' }).click()
  await expect(
    page.getByText(
      'Con esto no se podría publicar: La tarjeta no puede nombrar el tipo de cambio de «tc_adu»: no es del nivel «todos».',
    ),
  ).toBeVisible()
  await expect(guardar(page)).toBeEnabled()
})
