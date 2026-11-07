import { entrar } from './soporte/alta'
import {
  enviarAPapelera,
  estadoEnLaBase,
  irALaPapelera,
  limpiarPapelera,
  prepararPapelera,
  sembrarConTitulos,
  type TerrenoDeLaPapelera,
} from './soporte/cotizaciones-papelera'
import { rpcComo } from './soporte/leads-cartera'
import { expect, test, type Page } from './soporte/prueba'

// Enviar a la papelera desde una cotización guardada (paso 4.24-3, `docs/UX.md` › «Cotización guardada»): «Enviar a la papelera» en la cabecera, con la versión de la
// página; lleva a `/cotizaciones` con el aviso y «Deshacer», que restaura ese lote. Una versión vieja avisa el conflicto con «Recargar» y se queda. Lo ve quien puede
// guardarla (o, en una preventa, quien modera); quien sólo la ve, no. El terreno lo arma `soporte/cotizaciones-papelera.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaPapelera

test.beforeAll(async ({}, info) => {
  t = await prepararPapelera(info.project.name)
})

test.afterAll(async () => {
  await limpiarPapelera()
})

const sembrar = (titulos: readonly string[], creadoPor = t.duena): string[] =>
  sembrarConTitulos({ origenId: t.origen.id, creadoPor, titulos })

const botonEnviar = (page: Page) => page.getByRole('button', { name: 'Enviar a la papelera' })

// Abre la guardada como esa persona y espera la cabecera («Revisiones» la ve todo el que la abre).
async function abrir(page: Page, correo: string, id: string): Promise<void> {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto(`/cotizaciones/${id}`)
  await expect(page.getByRole('button', { name: 'Revisiones' })).toBeVisible()
}

test('N1 enviar lleva al listado y «Deshacer» la devuelve', async ({ page }) => {
  const [id = ''] = sembrar(['N1 una'])
  await abrir(page, t.duena, id)
  await botonEnviar(page).click()
  await expect(page).toHaveURL(/\/cotizaciones$/)
  const aviso = page.getByText('«N1 una» se envió a la papelera.')
  await expect(aviso).toBeVisible()
  await expect.poll(() => estadoEnLaBase(id)?.eliminadoEn ?? null).not.toBeNull()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('«N1 una» volvió a tus cotizaciones.')).toBeVisible()
  await expect.poll(() => estadoEnLaBase(id)?.eliminadoEn ?? null).toBeNull()
  await page.goto(`/cotizaciones/${id}`)
  await expect(botonEnviar(page)).toBeVisible()
})

test('N2 sin deshacer queda en la papelera de quien la envió', async ({ page }) => {
  const [id = ''] = sembrar(['N2 suya'], t.ana)
  await abrir(page, t.ana, id)
  await botonEnviar(page).click()
  await expect(page.getByText('«N2 suya» se envió a la papelera.')).toBeVisible()
  await expect(page).toHaveURL(/\/cotizaciones$/)
  await irALaPapelera(page, t.ana)
  await expect(
    page.getByRole('region', { name: 'Lote enviado por ti' }).filter({ hasText: 'N2 suya' }),
  ).toBeVisible()
  await page.goto(`/cotizaciones/${id}`)
  await expect(
    page.getByText('Esta cotización ya no está disponible: no existe o ya no tienes acceso.'),
  ).toBeVisible()
})

test('N3 con una versión vieja avisa el conflicto y se queda', async ({ page }) => {
  const [id = ''] = sembrar(['N3 vieja'])
  await abrir(page, t.duena, id)
  // Otra sesión la manda y la devuelve: la versión que tiene la página ya no es la de la base.
  const { lote, actualizadoEn } = await enviarAPapelera(t.duena, [id])
  const vuelta = await rpcComo(t.duena, 'cotizaciones_papelera_restaurar', {
    p_lote: lote,
    p_actualizado_en_esperado: actualizadoEn,
  })
  expect(vuelta.error).toBeNull()
  await botonEnviar(page).click()
  await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${id}$`))
  expect(estadoEnLaBase(id)?.eliminadoEn ?? null).toBeNull()
  await page.reload()
  await botonEnviar(page).click()
  await expect(page.getByText('«N3 vieja» se envió a la papelera.')).toBeVisible()
  await expect.poll(() => estadoEnLaBase(id)?.eliminadoEn ?? null).not.toBeNull()
})

test('N4 quien sólo la ve no tiene el botón; quien la edita, sí', async ({ page }) => {
  const [deLaDuena = ''] = sembrar(['N4 de la dueña'])
  const [deAna = ''] = sembrar(['N4 de Ana'], t.ana)
  await abrir(page, t.soloVer, deLaDuena)
  await expect(botonEnviar(page)).toHaveCount(0)
  await abrir(page, t.ana, deAna)
  await expect(botonEnviar(page)).toBeVisible()
})
