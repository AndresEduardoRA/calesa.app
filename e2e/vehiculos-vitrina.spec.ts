import { expect, test, type Page } from './soporte/prueba'
import { borrarFotosDe, fotos, fotosDe, urlDeObjeto } from './soporte/fotos'
import {
  aLaVista,
  descartarAviso,
  entrar,
  irAlOrigen,
  limpiarInventario,
  prepararInventario,
  vehiculo,
  type Terreno,
} from './soporte/inventario'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import {
  abrirVitrina,
  cerrarVitrina,
  crearFaseQuePublica,
  hacerPublico,
  loQueVeElVisitante,
  ponerEnFase,
  vitrinaPublica,
} from './soporte/vitrina'

// La vitrina contra la app compilada y el Supabase local. Una historia en orden: quien no tiene
// el permiso ve el botón apagado; quien lo tiene publica con su precio mirando lo que verá el
// visitante; el visitante, con la clave pública y sin sesión, ve sólo eso; y se despublica.
test.describe.configure({ mode: 'serial' })

const CLAVE_DE_COREA = 'e2e_corea_inv'
const SEDAN = 'Vitrina Sedán'
const OCULTO = 'Vitrina Oculto'
// Lo único que `web.vehiculos` le da a un anónimo.
const COLUMNAS_PUBLICAS = [
  'actualizado_en',
  'anio',
  'atributos',
  'categoria',
  'destacado',
  'id',
  'imagen',
  'marca',
  'miniatura',
  'modelo',
  'numero',
  'origen',
  'origen_nombre',
  'precio',
  'precio_hasta',
  'precio_nota',
  'titulo',
]

let duena = ''
let soloCorea = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
let sedan = ''
let oculto = ''
let fase = ''

test.beforeAll(async ({}, info) => {
  const terreno = await prepararInventario(info.project.name, [
    'vehiculos.vitrina',
    'vehiculos.eliminar',
  ])
  ;({ duena, soloCorea, corea } = terreno)
  await cargarVehiculos(corea.id, [
    {
      titulo: SEDAN,
      anio: 2022,
      atributos: { color: 'Azul marino', transmision: 'automatica', puertas: 4 },
    },
    { titulo: OCULTO, anio: 2020, atributos: { color: 'Negro' } },
  ])
  sedan = (await vehiculoPorTitulo(SEDAN))?.id ?? ''
  oculto = (await vehiculoPorTitulo(OCULTO))?.id ?? ''
  // El layout de un origen manual nace con sus campos públicos: la transmisión deja de serlo. Las
  // puertas (un campo agregado) nunca lo fueron.
  await hacerPublico(corea.id, 'transmision', false)
  fase = await crearFaseQuePublica(corea.id, 'En venta')
})

test.afterAll(async () => {
  await cerrarVitrina()
  await borrarFotosDe([sedan, oculto].filter(Boolean))
  await limpiarInventario()
})

const boton = (page: Page) => page.getByRole('button', { name: 'Publicar en la web' })
const panel = (page: Page) => page.getByRole('dialog', { name: 'Publicar en la web' })

async function abrirFicha(page: Page, id: string, titulo: string) {
  await page.goto(`/vehiculos/${id}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
}

test('sin el permiso, «Publicar en la web» se ve apagado y dice por qué', async ({ page }) => {
  await entrar(page, soloCorea)
  await abrirFicha(page, sedan, SEDAN)
  await expect(boton(page)).toBeDisabled()
  await expect(
    page.getByText(`No tienes permiso para publicar en la web lo de ${corea.nombre}.`, {
      exact: false,
    }),
  ).toBeVisible()
  // La dirección del panel tampoco lo abre.
  await page.goto(`/vehiculos/${sedan}?panel=vitrina`)
  await expect(page.getByRole('heading', { name: SEDAN, level: 1 })).toBeVisible()
  await expect(panel(page)).toBeHidden()
})

test('con el permiso se publica con su precio, mirando lo que verá el visitante', async ({
  page,
}) => {
  await entrar(page, duena)
  // Una foto, para que haya portada.
  await page.goto(`/vehiculos/${sedan}?seccion=fotos`)
  await page
    .getByRole('group', { name: 'Elegir fotos' })
    .locator('input[type=file]:not([capture])')
    .setInputFiles(fotos(1))
  await page
    .getByRole('region', { name: 'Fotos por subir' })
    .getByRole('button', { name: 'Subir 1 foto' })
    .click()
  await descartarAviso(page, 'Foto guardada')

  await abrirFicha(page, sedan, SEDAN)
  await boton(page).click()
  await expect(panel(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=vitrina/)
  const previa = panel(page).getByRole('region', { name: 'Así lo verá el visitante' })
  await expect(previa.getByText(SEDAN)).toBeVisible()
  await expect(previa.getByText('Consultar')).toBeVisible()
  // El campo público, con su etiqueta; el que no lo es, no.
  await expect(previa.getByText('Azul marino')).toBeVisible()
  await expect(previa.getByText('Color')).toBeVisible()
  await expect(previa.getByText('Automática')).toBeHidden()
  await expect(previa.getByText('Puertas')).toBeHidden()

  // Un «hasta» menor que el precio se dice junto al campo y no se guarda.
  await panel(page).getByLabel('Precio público').fill('21500')
  await expect(previa.getByText(/21\.500/)).toBeVisible()
  await panel(page).getByText('Más opciones').click()
  await panel(page).getByLabel('Precio hasta').fill('100')
  await panel(page).getByRole('button', { name: 'Guardar' }).click()
  await expect(panel(page).getByText('No puede ser menor que el precio público.')).toBeVisible()
  await panel(page).getByLabel('Precio hasta').fill('')

  // Todavía no entró a ninguna fase: se puede publicar, y dice que hoy no se vería.
  await panel(page).getByRole('switch', { name: 'Publicado en la web' }).click()
  await expect(
    panel(page).getByText('Queda publicado, pero hoy no se ve en el sitio:'),
  ).toBeVisible()
  await expect(panel(page).getByText('La web pública está apagada.')).toBeVisible()
  await panel(page).getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, 'Publicado en la web')
  await expect(panel(page)).toBeHidden()
  await expect(aLaVista(page.getByText('Publicado, no visible'))).toBeVisible()
  expect(await vitrinaPublica(CLAVE_DE_COREA)).toEqual([])

  // Se enciende el sitio, el origen se hace visible y el vehículo entra a una fase que publica.
  await abrirVitrina([corea.id])
  await ponerEnFase(sedan, fase)
  await abrirFicha(page, sedan, SEDAN)
  await expect(aLaVista(page.getByText('En vitrina', { exact: true }))).toBeVisible()
})

test('el visitante ve sólo lo publicado, con lo público y la portada', async ({ page }) => {
  const filas = await vitrinaPublica(CLAVE_DE_COREA)
  expect(filas.map((fila) => fila.titulo)).toEqual([SEDAN])
  const [fila] = filas
  expect(Object.keys(fila ?? {}).sort()).toEqual(COLUMNAS_PUBLICAS)
  expect(fila).toMatchObject({
    id: sedan,
    anio: 2022,
    precio: 21500,
    precio_hasta: null,
    destacado: false,
    // Sólo el campo marcado como público: ni la transmisión ni las puertas.
    atributos: { color: 'Azul marino' },
  })
  // La portada, en sus dos tamaños, es la del vehículo y se puede bajar sin sesión.
  const [foto] = await fotosDe(sedan)
  expect(fila?.['imagen']).toBe(foto?.ruta)
  expect(fila?.['miniatura']).toBe(foto?.ruta_miniatura)
  const respuesta = await page.request.get(urlDeObjeto(String(fila?.['miniatura'])))
  expect(respuesta.status()).toBe(200)

  // Fuera de la vitrina, un anónimo no llega a nada: ni a la tabla, ni a las fotos, ni a los
  // interesados, ni a la vista previa del CRM, ni a listar la carpeta del vehículo.
  for (const id of [sedan, oculto]) {
    expect(await loQueVeElVisitante(id)).toEqual({
      tabla: '42501',
      fotos: '42501',
      interesados: '42501',
      previa: '42501',
      carpeta: 0,
    })
  }
})

test('el inventario dice cuál está en vitrina y deja filtrarlo', async ({ page }) => {
  await entrar(page, duena)
  await irAlOrigen(page, corea)
  // La fila en escritorio, la tarjeta en el celular. («En vitrina» es también un filtro.)
  const fila = (titulo: string) =>
    aLaVista(page.locator('tbody tr, li article').filter({ hasText: titulo }))
  await expect(fila(SEDAN).getByText('En vitrina', { exact: true })).toBeVisible()
  await expect(fila(OCULTO)).toBeVisible()
  await expect(fila(OCULTO).getByText('En vitrina', { exact: true })).toBeHidden()
  await page.goto(`/vehiculos?origen=${corea.id}&vitrina=si`)
  await expect(vehiculo(page, SEDAN)).toBeVisible()
  await expect(vehiculo(page, OCULTO)).toBeHidden()
  await expect(aLaVista(page.getByText('En vitrina: sí'))).toBeVisible()
  await page.goto(`/vehiculos?origen=${corea.id}&vitrina=no`)
  await expect(vehiculo(page, OCULTO)).toBeVisible()
  await expect(vehiculo(page, SEDAN)).toBeHidden()
})

test('despublicar lo saca de la vitrina y conserva el precio', async ({ page }) => {
  await entrar(page, duena)
  await abrirFicha(page, sedan, SEDAN)
  await boton(page).click()
  await expect(panel(page).getByText('Al guardar, se ve en el sitio.')).toBeVisible()
  await panel(page).getByRole('switch', { name: 'Publicado en la web' }).click()
  await panel(page).getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, 'Quitado de la web')
  await expect(aLaVista(page.getByText('En vitrina', { exact: true }))).toBeHidden()
  expect(await vitrinaPublica(CLAVE_DE_COREA)).toEqual([])
  // El precio quedó para la próxima vez.
  await boton(page).click()
  await expect(panel(page).getByLabel('Precio público')).toHaveValue('21500')
})

test('lo que va a la papelera sale de la vitrina, y vuelve sin publicar', async ({ page }) => {
  await entrar(page, duena)
  await abrirFicha(page, sedan, SEDAN)
  await boton(page).click()
  await panel(page).getByRole('switch', { name: 'Publicado en la web' }).click()
  await panel(page).getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, 'Publicado en la web')
  expect((await vitrinaPublica(CLAVE_DE_COREA)).map((fila) => fila.titulo)).toEqual([SEDAN])

  await page.getByRole('button', { name: `Más acciones sobre ${SEDAN}` }).click()
  await page.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  const enviado = page
    .locator('[data-sonner-toast]')
    .filter({ hasText: `«${SEDAN}» se envió a la papelera. Se quitó de la web.` })
  await expect(enviado).toBeVisible()
  // En la papelera, el visitante ya no lo ve.
  expect(await vitrinaPublica(CLAVE_DE_COREA)).toEqual([])
  await enviado.getByRole('button', { name: 'Deshacer' }).click()
  await descartarAviso(page, 'Lo que estaba en la web volvió sin publicar.')
  // Volvió al inventario, y no a la vitrina: publicarlo es otra decisión.
  expect(await vitrinaPublica(CLAVE_DE_COREA)).toEqual([])
  await abrirFicha(page, sedan, SEDAN)
  await expect(aLaVista(page.getByText('En vitrina', { exact: true }))).toBeHidden()
})
