import { expect, test, type Page } from '@playwright/test'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'
import { borrarFotosDe, enColaDe, fotos, fotosDe, objetosDe, urlDeObjeto } from './soporte/fotos'
import {
  CLAVE,
  aLaVista,
  descartarAviso,
  entrar,
  irAlOrigen,
  limpiarInventario,
  otraPersona,
  prepararInventario,
  type Terreno,
} from './soporte/inventario'
import {
  correrStorageGc,
  estadoDe,
  llamarAStorageGc,
  ponerVin,
  publicarSinPantalla,
} from './soporte/papelera'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { crearFaseInterna, ponerEnFase } from './soporte/vitrina'

// La papelera de vehículos contra la app compilada y el Supabase local (Storage y la función
// `storage-gc` incluidos). Una historia en orden: enviar y deshacer, lo que no entra, un lote,
// restaurar (con un VIN que ya tomó otro), y purgar: uno con sus fotos, un lote con confirmación
// tipeada, sin conexión y cuando otra persona ya lo restauró.
test.describe.configure({ mode: 'serial' })

const T = {
  uno: 'Papelera Uno',
  enTransito: 'Papelera En Tránsito',
  a: 'Papelera Lote A',
  b: 'Papelera Lote B',
  c: 'Papelera Lote C',
  vin: 'Papelera Con VIN',
  fotos: 'Papelera Con Fotos',
  disputado: 'Papelera Disputado',
}
const VIN = 'KNAPAP00000000001'
const TOMADOR = 'Papelera Tomó El VIN'

let duena = ''
let soloCorea = ''
// Envía a la papelera y no puede vaciarla: en la papelera ve sólo lo suyo.
let soloEnvia = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
const ids: Record<string, string> = {}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararInventario(info.project.name, [
    'vehiculos.eliminar',
    'vehiculos.papelera.purgar',
  ])
  ;({ duena, soloCorea, corea } = terreno)
  await cargarVehiculos(
    corea.id,
    Object.values(T).map((titulo) => ({ titulo })),
  )
  for (const titulo of Object.values(T)) {
    ids[titulo] = (await vehiculoPorTitulo(titulo))?.id ?? ''
  }
  await ponerVin(id(T.vin), VIN)
  soloEnvia = correoDePrueba(`solo-envia-${info.project.name}`)
  await crearPersona({ email: soloEnvia, contrasena: CLAVE, nombre: 'Elsa Envía', invitada: true })
  await darRolDePrueba({
    email: soloEnvia,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Envía ${info.project.name}`,
      clave: `e2e_envia_${info.project.name}`,
    },
    permisos: ['vehiculos.ver', 'vehiculos.eliminar'],
  })
  // Uno ya salió de la fase inicial: no va a la papelera.
  await ponerEnFase(id(T.enTransito), await crearFaseInterna(corea.id, 'En tránsito'))
})

test.afterAll(async () => {
  await borrarFotosDe(Object.values(ids).filter(Boolean))
  await limpiarInventario()
})

const id = (titulo: string) => ids[titulo] ?? ''

async function abrirFicha(page: Page, titulo: string) {
  await page.goto(`/vehiculos/${id(titulo)}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
}

// La fila del inventario (la tarjeta, en el celular). El título solo no alcanza: Next lo repite
// en su anunciador de rutas.
const fila = (page: Page, titulo: string) =>
  aLaVista(page.locator('tbody tr, li article').filter({ hasText: titulo }))

const menu = (page: Page, titulo: string) =>
  page.getByRole('button', { name: `Más acciones sobre ${titulo}` })

async function enviarDesdeLaFicha(page: Page, titulo: string) {
  await abrirFicha(page, titulo)
  await menu(page, titulo).click()
  await page.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  await expect(page).toHaveURL(new RegExp(`/vehiculos\\?origen=${corea.id}`))
}

const aviso = (page: Page, texto: string | RegExp) =>
  page.locator('[data-sonner-toast]').filter({ hasText: texto })

async function abrirPapelera(page: Page) {
  await page.goto('/vehiculos/papelera')
  await expect(page.getByRole('heading', { name: 'Papelera de vehículos', level: 1 })).toBeVisible()
}

// El lote que tiene a ese vehículo.
const loteDe = (page: Page, titulo: string) =>
  page.getByRole('region', { name: /^Lote enviado por/ }).filter({ hasText: titulo })

test('sin el permiso no hay casillas, ni menú, ni papelera', async ({ page }) => {
  await entrar(page, soloCorea)
  await irAlOrigen(page, corea)
  await expect(fila(page, T.uno)).toBeVisible()
  await expect(aLaVista(page.getByRole('checkbox', { name: /^Seleccionar / }))).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Papelera', exact: true })).toBeHidden()
  await abrirFicha(page, T.uno)
  await expect(menu(page, T.uno)).toBeHidden()
  await page.goto('/vehiculos/papelera')
  await expect(
    page.getByText('No tienes permiso para enviar vehículos a la papelera'),
  ).toBeVisible()
})

test('se envía desde la ficha, lo publicado se despublica, y «Deshacer» lo devuelve', async ({
  page,
}) => {
  await publicarSinPantalla(id(T.uno))
  await entrar(page, duena)
  await enviarDesdeLaFicha(page, T.uno)
  await expect(aviso(page, `«${T.uno}» se envió a la papelera. Se quitó de la web.`)).toBeVisible()
  await expect(fila(page, T.uno)).toBeHidden()
  expect(await estadoDe(id(T.uno))).toMatchObject({ publicado_web: false })
  expect((await estadoDe(id(T.uno)))?.eliminado_en).not.toBeNull()
  // La ficha de algo que está en la papelera se ve como lo que no existe.
  await aviso(page, 'se envió a la papelera').getByRole('button', { name: 'Deshacer' }).click()
  await descartarAviso(
    page,
    `«${T.uno}» volvió al inventario. Lo que estaba en la web volvió sin publicar.`,
  )
  await expect(fila(page, T.uno)).toBeVisible()
  expect(await estadoDe(id(T.uno))).toEqual({
    eliminado_en: null,
    lote_papelera_id: null,
    publicado_web: false,
  })
})

test('lo que ya salió de su fase inicial no va: el menú lo dice antes de intentar', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirFicha(page, T.enTransito)
  await menu(page, T.enTransito).click()
  await expect(page.getByRole('menuitem', { name: 'Enviar a la papelera' })).toBeDisabled()
  await expect(
    page.getByText('Está en «En tránsito». Sólo va a la papelera lo que sigue en su fase inicial.'),
  ).toBeVisible()
})

test('un lote desde el inventario: entran los que pueden y el resto se dice', async ({ page }) => {
  await entrar(page, duena)
  await irAlOrigen(page, corea)
  for (const titulo of [T.a, T.b, T.c, T.enTransito]) {
    await aLaVista(page.getByRole('checkbox', { name: `Seleccionar ${titulo}` })).click()
  }
  const barra = page.getByRole('region', { name: 'Selección' })
  await expect(barra.getByText(/^Selección: 4 /)).toBeVisible()
  await barra.getByRole('button', { name: 'Enviar a la papelera' }).click()
  await descartarAviso(
    page,
    `Se enviaron 3 de 4 a la papelera. No se envió «${T.enTransito}»: Está en «En tránsito».`,
  )
  await expect(barra).toBeHidden()
  await expect(fila(page, T.enTransito)).toBeVisible()
  for (const titulo of [T.a, T.b, T.c]) {
    await expect(fila(page, titulo)).toBeHidden()
  }
  // Un envío, un lote.
  const lotes = await Promise.all([T.a, T.b, T.c].map((titulo) => estadoDe(id(titulo))))
  expect(new Set(lotes.map((uno) => uno?.lote_papelera_id)).size).toBe(1)
  expect(await estadoDe(id(T.enTransito))).toMatchObject({ eliminado_en: null })
})

test('la papelera lista por lote y restaura uno; un VIN que ya tomó otro queda pendiente', async ({
  page,
}) => {
  await entrar(page, duena)
  await enviarDesdeLaFicha(page, T.vin)
  await descartarAviso(page, `«${T.vin}» se envió a la papelera.`)
  // Mientras está en la papelera, otro vehículo toma su VIN.
  await cargarVehiculos(corea.id, [{ titulo: TOMADOR }])
  const tomador = (await vehiculoPorTitulo(TOMADOR))?.id ?? ''
  await ponerVin(tomador, VIN)

  await page.getByRole('link', { name: 'Papelera', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Papelera de vehículos', level: 1 })).toBeVisible()
  const lote = loteDe(page, T.a)
  await expect(lote.getByText('Lote de 3', { exact: true })).toBeVisible()
  await expect(lote.getByText(/Enviado por ti el .+ · Se purga en 30 días/)).toBeVisible()
  await lote.getByRole('button', { name: `Restaurar ${T.a}` }).click()
  await descartarAviso(page, `«${T.a}» volvió al inventario.`)
  await expect(loteDe(page, T.b).getByText('Lote de 3 · quedan 2')).toBeVisible()
  expect(await estadoDe(id(T.a))).toMatchObject({ eliminado_en: null, lote_papelera_id: null })

  await loteDe(page, T.vin)
    .getByRole('button', { name: `Restaurar ${T.vin}` })
    .click()
  await expect(
    aviso(page, `No se restauró «${T.vin}»: Ya hay un vehículo con el VIN ${VIN}.`),
  ).toBeVisible()
  await expect(loteDe(page, T.vin)).toBeVisible()
  // Sin el choque, vuelve.
  await ponerVin(tomador, null)
  await loteDe(page, T.vin)
    .getByRole('button', { name: `Restaurar ${T.vin}` })
    .click()
  await expect(aviso(page, `«${T.vin}» volvió al inventario.`)).toBeVisible()
  await expect(loteDe(page, T.vin)).toBeHidden()
})

test('purgar uno pide confirmar nombrándolo, y sus fotos salen de Storage con storage-gc', async ({
  page,
  context,
}) => {
  await entrar(page, duena)
  await page.goto(`/vehiculos/${id(T.fotos)}?seccion=fotos`)
  await page
    .getByRole('group', { name: 'Elegir fotos' })
    .locator('input[type=file]:not([capture])')
    .setInputFiles(fotos(1, 2))
  await page
    .getByRole('region', { name: 'Fotos por subir' })
    .getByRole('button', { name: 'Subir 2 fotos' })
    .click()
  await descartarAviso(page, '2 fotos guardadas')
  const [portada] = await fotosDe(id(T.fotos))
  expect(await objetosDe(id(T.fotos))).toHaveLength(4)

  await enviarDesdeLaFicha(page, T.fotos)
  await descartarAviso(page, `«${T.fotos}» se envió a la papelera.`)
  await abrirPapelera(page)
  await loteDe(page, T.fotos)
    .getByRole('button', { name: `Purgar ${T.fotos}` })
    .click()
  const dialogo = page.getByRole('dialog', { name: `Purgar «${T.fotos}»` })
  await expect(dialogo.getByText(/Se borra para siempre con sus 2 fotos/)).toBeVisible()
  // Sin conexión el diálogo sigue abierto, lo dice y no deja confirmar.
  await context.setOffline(true)
  await expect(dialogo.getByText('No hay conexión. No se purgó nada')).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Purgar' })).toBeDisabled()
  await context.setOffline(false)
  await dialogo.getByRole('button', { name: 'Purgar' }).click()
  await descartarAviso(page, `«${T.fotos}» se purgó.`)
  await expect(dialogo).toBeHidden()
  expect(await estadoDe(id(T.fotos))).toBeNull()

  // Las filas ya no están; los archivos esperan a la limpieza, que no necesita las 24 h.
  expect(await objetosDe(id(T.fotos))).toHaveLength(4)
  expect(await enColaDe(id(T.fotos))).toHaveLength(4)
  // Sin un pase, la función no hace nada.
  expect((await llamarAStorageGc({})).status).toBe(401)
  expect((await llamarAStorageGc({ pase: '11111111-1111-4111-8111-111111111111' })).status).toBe(
    401,
  )
  expect(await objetosDe(id(T.fotos))).toHaveLength(4)
  expect(await correrStorageGc()).toBeGreaterThanOrEqual(4)
  expect(await objetosDe(id(T.fotos))).toEqual([])
  expect(await enColaDe(id(T.fotos))).toEqual([])
  const respuesta = await page.request.get(urlDeObjeto(portada?.ruta_miniatura ?? ''))
  expect(respuesta.ok()).toBe(false)
  // Correrla otra vez no rompe nada ni borra de más.
  expect(await correrStorageGc()).toBe(0)
})

test('purgar algo que otra persona ya restauró es un conflicto, y no purga nada', async ({
  page,
  browser,
}) => {
  await entrar(page, duena)
  await enviarDesdeLaFicha(page, T.disputado)
  await descartarAviso(page, `«${T.disputado}» se envió a la papelera.`)
  await abrirPapelera(page)
  await expect(loteDe(page, T.disputado)).toBeVisible()
  // En otra ventana, la misma papelera: ahí se restaura.
  const otra = await otraPersona(browser, page)
  await entrar(otra, duena)
  await abrirPapelera(otra)
  await loteDe(otra, T.disputado)
    .getByRole('button', { name: `Restaurar ${T.disputado}` })
    .click()
  await expect(aviso(otra, `«${T.disputado}» volvió al inventario.`)).toBeVisible()
  await otra.context().close()

  await loteDe(page, T.disputado)
    .getByRole('button', { name: `Purgar ${T.disputado}` })
    .click()
  const dialogo = page.getByRole('dialog', { name: `Purgar «${T.disputado}»` })
  await dialogo.getByRole('button', { name: 'Purgar' }).click()
  await expect(dialogo.getByText(/este lote de la papelera/)).toBeVisible()
  await expect(
    dialogo.getByText('No se purgó nada. Recarga para ver cómo quedó el lote.'),
  ).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Purgar' })).toBeDisabled()
  await dialogo.getByRole('button', { name: 'Recargar' }).click()
  await expect(dialogo).toBeHidden()
  await expect(loteDe(page, T.disputado)).toBeHidden()
  expect(await estadoDe(id(T.disputado))).toMatchObject({ eliminado_en: null })
})

test('purgar un lote pide tipear, y quien no envió nada ve su papelera vacía', async ({
  page,
  browser,
}) => {
  await entrar(page, duena)
  await abrirPapelera(page)
  await loteDe(page, T.b).getByRole('button', { name: 'Purgar el lote' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Purgar el lote de 2' })
  await expect(dialogo.getByText(`«${T.b}», «${T.c}»`)).toBeVisible()
  const confirmar = dialogo.getByRole('button', { name: 'Purgar los 2' })
  await expect(confirmar).toBeDisabled()
  await dialogo.getByLabel('Para confirmar, escribir «purgar 2»').fill('purgar 2')
  await confirmar.click()
  await descartarAviso(page, 'Se purgaron 2.')
  expect(await estadoDe(id(T.b))).toBeNull()
  expect(await estadoDe(id(T.c))).toBeNull()
  await expect(loteDe(page, T.b)).toBeHidden()

  // Quien sólo envía ve lo suyo: todavía nada. Y no tiene con qué purgar lo de nadie. (La
  // papelera de quien puede vaciarla muestra la de todos: no se le puede pedir que esté vacía.)
  const otra = await otraPersona(browser, page)
  await entrar(otra, soloEnvia)
  await abrirPapelera(otra)
  await expect(otra.getByText('Lo que enviaste a la papelera.', { exact: false })).toBeVisible()
  await expect(otra.getByText('La papelera está vacía')).toBeVisible()
  await expect(otra.getByRole('button', { name: /^Purgar/ })).toHaveCount(0)
  await otra.context().close()
})
