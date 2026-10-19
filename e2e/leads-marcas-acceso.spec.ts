import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead, revocarCartera } from './soporte/leads-ficha'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  crearEtiquetaDe,
  esperarMarcaEnLaFicha,
  marcarEnLaFicha,
  marcasEnLaBase,
  menuDeFila,
  ponerEtiquetaDe,
  ponerMarcaDe,
  transferirA,
} from './soporte/leads-marcas'
import { compartirCon } from './soporte/leads-seguimientos'

// Compartir, transferir o revocar no mueven las marcas de nadie, vistas por la interfaz. Lo que la base decide sobre las
// marcas llamado a mano —lo que no se ve responde como inexistente, una etiqueta ajena no se usa ni se nombra— está en
// `supabase/tests/humo.sql`, y los topes de etiquetas con dos pedidos a la vez en `scripts/carreras/marcas.mjs`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const leadDe = (deQuien: string, corto: string) =>
  nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien })

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('compartir y transferir no mueven ni muestran las marcas; revocar saca el lead del listado y la marca queda', async ({
  page,
}, info) => {
  const corto = `Acc Compartir ${info.project.name}`
  const lead = await leadDe(t.personas.berta, corto)
  const etiqueta = await crearEtiquetaDe(t.personas.berta, `Compartida ${info.project.name}`)
  await ponerEtiquetaDe(t.personas.berta, lead.id, etiqueta)
  await ponerMarcaDe(t.personas.berta, lead.id, 'favorito')
  const berta = await idDe(t.personas.berta)
  const carlos = await idDe(t.personas.carlos)
  await compartirCon(lead.id, carlos, berta)

  // Carlos lo ve, sin las marcas de Berta, y pone las suyas.
  await entrar(page, t.personas.carlos)
  await irAFicha(page, lead.id)
  await esperarMarcaEnLaFicha(page, 'Favorito', false)
  await marcarEnLaFicha(page, 'Tachado')
  await expect
    .poll(async () => (await marcasEnLaBase(lead.id, t.personas.carlos)).tachado)
    .toBe(true)
  expect(await marcasEnLaBase(lead.id, t.personas.berta)).toEqual({
    favorito: true,
    tachado: false,
    etiquetas: [`Compartida ${info.project.name}`],
  })

  // Berta se lo transfiere: cada quien conserva lo suyo.
  await transferirA(lead.id, berta, carlos)
  expect((await marcasEnLaBase(lead.id, t.personas.berta)).favorito).toBe(true)
  expect((await marcasEnLaBase(lead.id, t.personas.carlos)).favorito).toBe(false)

  // A Berta le revocan la cartera: el lead deja de aparecerle y su marca sigue siendo suya.
  await revocarCartera(lead.id, berta)
  const pagina = await page
    .context()
    .browser()
    ?.newContext({
      baseURL: new URL(page.url()).origin,
      viewport: page.viewportSize(),
    })
  const comoBerta = await pagina?.newPage()
  if (!comoBerta) throw new Error('sin navegador')
  await entrar(comoBerta, t.personas.berta)
  await irALeads(comoBerta)
  await expect(menuDeFila(comoBerta, corto)).toHaveCount(0)
  expect((await marcasEnLaBase(lead.id, t.personas.berta)).favorito).toBe(true)
  await pagina?.close()
})
