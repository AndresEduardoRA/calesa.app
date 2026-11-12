// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { admin } from './soporte/base'
import { entrar, limpiarInventario, prepararInventario } from './soporte/inventario'
import { cicloDeUnaConfirmacion } from './soporte/confirmar-por-url'
import {
  elegirDelMenu,
  filaDeCatalogo,
  masAccionesDe,
  nombreDeLaFila,
} from './soporte/lista-de-catalogo'
import { testimoniosPublicos } from './soporte/web-publica'

// Los testimonios de Configuración › Sitio web (8.02-2): la dueña crea uno con foto (nace sin publicar y «Publicado» apagado con su motivo), registra el
// consentimiento sólo de la ciudad, lo publica (la web trae la ciudad y no el vehículo ni la foto), edita el texto (el aviso de que anula el consentimiento
// y lo despublica), lo consiente otra vez, lo retira con el diálogo de su URL (deja de verse) y lo elimina. El límite de permisos está en
// `supabase/tests/areas/web/testimonios-permisos.sql`; las reglas del consentimiento, en `testimonios-consentimiento.sql`.
test.describe.configure({ mode: 'serial' })

const PREFIJO = 'E2E 8.02'
const UN_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
let duena = ''
let proyecto = ''
const cliente = () => `${PREFIJO} Ana ${proyecto}`

async function borrarTestimoniosDePrueba(): Promise<void> {
  const { error } = await admin().from('web_testimonios').delete().like('cliente', `${PREFIJO}%`)
  if (error) {
    throw new Error(`No se pudieron borrar los testimonios de prueba: ${error.message}`)
  }
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  ;({ duena } = await prepararInventario(proyecto, ['web.contenido.gestionar']))
  await borrarTestimoniosDePrueba()
})

test.afterAll(async () => {
  await borrarTestimoniosDePrueba()
  await limpiarInventario()
})

const fila = (page: Page) => filaDeCatalogo(page, cliente())

async function registrarConsentimientoDeLaCiudad(page: Page, linea: string) {
  await elegirDelMenu(page, cliente(), linea)
  const dialogo = page.getByRole('dialog', { name: 'Registrar consentimiento' })
  await expect(dialogo).toBeVisible()
  await dialogo.getByLabel('Canal').fill('WhatsApp')
  await dialogo.getByRole('switch', { name: 'Mostrar la ciudad' }).click()
  await dialogo.getByRole('button', { name: 'Registrar consentimiento' }).click()
  await expect(page.getByText('Consentimiento registrado.')).toBeVisible()
  await expect(dialogo).toBeHidden()
  await expect(fila(page).getByText(/Consentimiento registrado el/)).toBeVisible()
}

async function abrirLaPestana(page: Page) {
  await entrar(page, duena)
  await page.goto('/configuracion')
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Sitio web/ })
    .click()
  await expect(page).toHaveURL(/\/configuracion\/web$/)
  await page.getByRole('tab', { name: 'Testimonios' }).click()
  await expect(page).toHaveURL(/seccion=testimonios/)
  await expect(page.getByRole('heading', { name: 'Testimonios', level: 2 })).toBeVisible()
}

test('crear con foto, consentir, publicar, retirar y eliminar: la web pública sigue al consentimiento', async ({
  page,
}) => {
  await abrirLaPestana(page)

  // Crear: «Publicado» nace apagado, con su motivo; la foto se sube al bucket `web` y queda por hash.
  await page.getByRole('button', { name: 'Nuevo testimonio' }).click()
  const alta = page.getByRole('dialog', { name: 'Nuevo testimonio' })
  await expect(alta).toBeVisible()
  await alta.getByLabel('Cliente', { exact: true }).fill(cliente())
  await alta.getByLabel('Ciudad (opcional)').fill('Cochabamba')
  await alta.getByLabel('Vehículo (opcional)').fill('Toyota Hilux')
  await alta.getByLabel('Testimonio', { exact: true }).fill('Todo salió bien.')
  await alta
    .getByLabel('Elegir la foto del testimonio')
    .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: UN_PIXEL })
  await expect(alta.getByRole('switch', { name: 'Publicado' })).toBeDisabled()
  await expect(alta.getByText('Falta registrar el consentimiento.')).toBeVisible()
  await alta.getByRole('button', { name: 'Crear testimonio' }).click()
  await expect(page.getByText('Testimonio creado.')).toBeVisible()
  await expect(alta).toBeHidden()
  await expect(nombreDeLaFila(page, cliente())).toBeVisible()
  await expect(fila(page).getByText('Sin publicar')).toBeVisible()
  await expect(fila(page).getByText('Sin consentimiento')).toBeVisible()
  const { data: creado } = await admin()
    .from('web_testimonios')
    .select('foto_ruta')
    .eq('cliente', cliente())
    .limit(1)
  expect(creado?.[0]?.foto_ruta).toMatch(/^testimonios\/[0-9a-f]{64}\.(webp|jpg)$/)
  expect(await testimoniosPublicos(PREFIJO)).toEqual([])

  // Consentir sólo la ciudad y publicar desde el «⋯»: la web trae la ciudad y no el vehículo ni la foto.
  await registrarConsentimientoDeLaCiudad(page, 'Registrar consentimiento')
  await elegirDelMenu(page, cliente(), 'Publicar')
  await expect(page.getByText('Testimonio publicado.')).toBeVisible()
  const publicos = await testimoniosPublicos(PREFIJO)
  expect(publicos.map((t) => [t.cliente, t.ciudad, t.vehiculo, t.foto])).toEqual([
    [cliente(), 'Cochabamba', null, null],
  ])

  // Cambiar el texto de uno consentido avisa antes y, al guardar, anula el consentimiento y lo despublica.
  await nombreDeLaFila(page, cliente()).click()
  const edicion = page.getByRole('dialog', { name: 'Editar testimonio' })
  await edicion.getByLabel('Testimonio', { exact: true }).fill('Todo salió muy bien.')
  await expect(
    edicion.getByText('Cambiar esto borra el consentimiento y lo despublica.'),
  ).toBeVisible()
  await edicion.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Testimonio guardado.')).toBeVisible()
  await expect(edicion).toBeHidden()
  await expect(fila(page).getByText('Sin consentimiento')).toBeVisible()
  await expect(fila(page).getByText('Sin publicar')).toBeVisible()
  expect(await testimoniosPublicos(PREFIJO)).toEqual([])

  // Consentir otra vez, publicar y retirar: el diálogo vive en su URL (Esc, atrás y adelante, recarga) y al confirmar deja de verse en la web.
  await registrarConsentimientoDeLaCiudad(page, 'Registrar consentimiento')
  await elegirDelMenu(page, cliente(), 'Publicar')
  await expect(page.getByText('Testimonio publicado.')).toBeVisible()
  expect(await testimoniosPublicos(PREFIJO)).toHaveLength(1)
  const retiro = page.getByRole('dialog', {
    name: `Retirar el consentimiento de «${cliente()}»`,
  })
  await cicloDeUnaConfirmacion(page, {
    abrir: async () => {
      await elegirDelMenu(page, cliente(), 'Retirar consentimiento')
    },
    dialogo: retiro,
    disparador: masAccionesDe(page, cliente()),
    url: /panel=retirar-consentimiento&testimonio=/,
  })
  await retiro.getByRole('button', { name: 'Retirar consentimiento' }).click()
  await expect(page.getByText('Consentimiento retirado.')).toBeVisible()
  await expect(retiro).toBeHidden()
  await expect(fila(page).getByText(/Consentimiento retirado el/)).toBeVisible()
  expect(await testimoniosPublicos(PREFIJO)).toEqual([])

  // Eliminar.
  const eliminar = page.getByRole('dialog', { name: `Eliminar el testimonio de «${cliente()}»` })
  await elegirDelMenu(page, cliente(), 'Eliminar')
  await eliminar.getByRole('button', { name: 'Eliminar testimonio' }).click()
  await expect(page.getByText('Testimonio eliminado.')).toBeVisible()
  await expect(nombreDeLaFila(page, cliente())).toBeHidden()
})
