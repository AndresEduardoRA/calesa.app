import { expect, test, type Page } from './soporte/prueba'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'
import { borrarFotosDe, enColaDe, fotos, fotosDe, objetosDe, urlDeObjeto } from './soporte/fotos'
import {
  CLAVE,
  aLaVista,
  descartarAviso,
  entrar,
  esMovil,
  limpiarInventario,
  otraPersona,
  prepararInventario,
  type Terreno,
} from './soporte/inventario'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// Las fotos de un vehículo contra la app compilada y el Supabase local (Storage incluido). Una
// historia en orden: se suben, se elige portada, se reordenan, se repiten, se eliminan y se
// deshace; después los bordes (tope, red, formatos, permisos, dos personas).
test.describe.configure({ mode: 'serial' })

let duena = ''
let soloCorea = ''
let lector = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
// Cada vehículo, su id. «Sedán» y «Camioneta» son de Corea; «Isla», de Taiwán.
const vehiculos: Record<string, string> = {}

const TITULOS = {
  sedan: 'Fotos Sedán',
  camioneta: 'Fotos Camioneta',
  lleno: 'Fotos Lleno',
  red: 'Fotos Red',
  isla: 'Fotos Isla',
}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararInventario(info.project.name)
  ;({ duena, soloCorea, corea } = terreno)
  const deCorea = [TITULOS.sedan, TITULOS.camioneta, TITULOS.lleno, TITULOS.red]
  await cargarVehiculos(
    corea.id,
    deCorea.map((titulo) => ({ titulo })),
  )
  await cargarVehiculos(terreno.taiwan.id, [{ titulo: TITULOS.isla }])
  for (const titulo of Object.values(TITULOS)) {
    vehiculos[titulo] = (await vehiculoPorTitulo(titulo))?.id ?? ''
  }
  // Ve los vehículos de Corea y no puede editarlos.
  lector = correoDePrueba(`lector-fotos-${info.project.name}`)
  await crearPersona({ email: lector, contrasena: CLAVE, nombre: 'Leo Lector', invitada: true })
  await darRolDePrueba({
    email: lector,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Lector ${info.project.name}`,
      clave: `e2e_lector_${info.project.name}`,
    },
    permisos: [{ clave: 'vehiculos.ver', origenId: corea.id }],
  })
})

test.afterAll(async () => {
  await borrarFotosDe(Object.values(vehiculos).filter(Boolean))
  await limpiarInventario()
})

const id = (titulo: string) => vehiculos[titulo] ?? ''

async function abrirFotos(page: Page, titulo: string) {
  await page.goto(`/vehiculos/${id(titulo)}?seccion=fotos`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Fotos' })).toHaveAttribute('aria-selected', 'true')
}

// El selector de archivos (el `<input>` que abre el botón «Elegir fotos», no el de la cámara).
const selector = (page: Page) =>
  page.getByRole('group', { name: 'Elegir fotos' }).locator('input[type=file]:not([capture])')
const porSubir = (page: Page) => page.getByRole('region', { name: 'Fotos por subir' })
const galeria = (page: Page) => page.getByRole('list', { name: 'Fotos del vehículo' })
const ordenDe = async (titulo: string) => (await fotosDe(id(titulo))).map((foto) => foto.hash)

async function subir(page: Page, archivos: ReturnType<typeof fotos>, dicho: string | RegExp) {
  await selector(page).setInputFiles(archivos)
  const cuantas = archivos.length === 1 ? '1 foto' : `${archivos.length} fotos`
  await porSubir(page)
    .getByRole('button', { name: `Subir ${cuantas}` })
    .click()
  await expect(page.getByText(dicho)).toBeVisible()
  await descartarAviso(page, dicho)
}

test('sube tres fotos al confirmar, la primera queda de portada y se elige otra', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirFotos(page, TITULOS.sedan)
  await expect(page.getByText('Este vehículo no tiene fotos')).toBeVisible()
  // La cámara se ofrece donde se toca la pantalla; con mouse abriría el mismo selector.
  const camara = page.getByRole('button', { name: 'Tomar una foto' })
  await (esMovil(page) ? expect(camara).toBeVisible() : expect(camara).toBeHidden())

  // Elegirlas las muestra, y nada más: commit diferido.
  await selector(page).setInputFiles(fotos(1, 3))
  await expect(porSubir(page).getByText('Lista para subir')).toHaveCount(3)
  await expect(porSubir(page).getByText('foto-2.png')).toBeVisible()
  expect(await fotosDe(id(TITULOS.sedan))).toHaveLength(0)
  expect(await objetosDe(id(TITULOS.sedan))).toHaveLength(0)

  await porSubir(page).getByRole('button', { name: 'Subir 3 fotos' }).click()
  await expect(page.getByText('3 fotos guardadas')).toBeVisible()
  await descartarAviso(page, '3 fotos guardadas')
  await expect(galeria(page).getByRole('listitem')).toHaveCount(3)
  await expect(porSubir(page)).toBeHidden()

  // En el orden en que se eligieron; la primera es la portada. Dos objetos por foto.
  const guardadas = await fotosDe(id(TITULOS.sedan))
  expect(guardadas.map((foto) => foto.orden)).toEqual([1, 2, 3])
  expect(guardadas.map((foto) => foto.es_portada)).toEqual([true, false, false])
  expect(await objetosDe(id(TITULOS.sedan))).toHaveLength(6)
  await expect(galeria(page).getByRole('listitem').first().getByText('Portada')).toBeVisible()

  // La miniatura es chica, en un formato de foto y con caché larga.
  const miniatura = await page.request.get(urlDeObjeto(guardadas[0]?.ruta_miniatura ?? ''))
  expect(miniatura.status()).toBe(200)
  expect(miniatura.headers()['content-type']).toMatch(/^image\/(webp|jpeg)$/)
  expect(miniatura.headers()['cache-control']).toContain('max-age=31536000')

  await page.getByRole('button', { name: 'Usar la foto 3 como portada' }).click()
  await expect(galeria(page).getByRole('listitem').nth(2).getByText('Portada')).toBeVisible()
  const conPortada = await fotosDe(id(TITULOS.sedan))
  expect(conPortada.map((foto) => foto.es_portada)).toEqual([false, false, true])

  // La portada es la que se ve en el inventario, en el lugar que estaba reservado.
  await page.goto(`/vehiculos?origen=${corea.id}`)
  const enElListado = aLaVista(
    page.locator(`img[src="${urlDeObjeto(conPortada[2]?.ruta_miniatura ?? '')}"]`),
  )
  await expect(enElListado).toHaveCount(1)
})

test('reordena con los botones y con el teclado, y el foco sigue a la foto', async ({ page }) => {
  await entrar(page, duena)
  await abrirFotos(page, TITULOS.sedan)
  const [primera, segunda, tercera] = await ordenDe(TITULOS.sedan)

  await page.getByRole('button', { name: 'Mover la foto 3 antes' }).click()
  await expect(page.getByRole('button', { name: 'Mover la foto 2 antes' })).toBeFocused()
  expect(await ordenDe(TITULOS.sedan)).toEqual([primera, tercera, segunda])

  // Con el foco en la foto, Alt + ← la mueve otra vez. Ya es la primera: el foco pasa al otro botón.
  await page.keyboard.press('Alt+ArrowLeft')
  await expect(page.getByRole('button', { name: 'Mover la foto 1 después' })).toBeFocused()
  expect(await ordenDe(TITULOS.sedan)).toEqual([tercera, primera, segunda])
  await expect(page.getByRole('button', { name: 'Mover la foto 1 antes' })).toBeDisabled()

  await page.keyboard.press('Alt+ArrowRight')
  await expect(page.getByRole('button', { name: 'Mover la foto 2 después' })).toBeFocused()
  expect(await ordenDe(TITULOS.sedan)).toEqual([primera, tercera, segunda])
})

test('la misma foto no entra dos veces al vehículo, y en otro sobrevive al borrado', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirFotos(page, TITULOS.sedan)
  // Repetida en el mismo vehículo: se dice antes de subir y no hay nada que confirmar.
  await selector(page).setInputFiles(fotos(1))
  await expect(porSubir(page).getByText('Ya está en este vehículo.')).toBeVisible()
  await expect(porSubir(page).getByRole('button', { name: /^Subir/ })).toHaveCount(0)
  await porSubir(page).getByRole('button', { name: 'Descartar' }).click()
  await expect(porSubir(page)).toBeHidden()

  // La misma foto en un vehículo de otro origen: es otra fila y son otros objetos.
  await abrirFotos(page, TITULOS.isla)
  await subir(page, fotos(1), 'Foto guardada')
  const [enIsla] = await fotosDe(id(TITULOS.isla))
  expect(enIsla?.ruta.startsWith(`${id(TITULOS.isla)}/`)).toBe(true)

  // Se elimina en el primero: sale de la lista, va a la cola y sus objetos siguen (24 h).
  await abrirFotos(page, TITULOS.sedan)
  const antes = await fotosDe(id(TITULOS.sedan))
  const laUno = antes.find((foto) => foto.hash === enIsla?.hash)
  expect(laUno).toBeDefined()
  await page.getByRole('button', { name: `Eliminar la foto ${laUno?.orden ?? 0}` }).click()
  await expect(page.getByText('Foto eliminada')).toBeVisible()
  await expect(galeria(page).getByRole('listitem')).toHaveCount(2)
  expect(await enColaDe(id(TITULOS.sedan))).toHaveLength(2)
  expect(await objetosDe(id(TITULOS.sedan))).toHaveLength(6)

  // Deshacer: vuelve a su lugar y sale de la cola.
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(galeria(page).getByRole('listitem')).toHaveCount(3)
  expect(await ordenDe(TITULOS.sedan)).toEqual(antes.map((foto) => foto.hash))
  expect(await enColaDe(id(TITULOS.sedan))).toHaveLength(0)

  // Ahora sí se va. La del otro vehículo sigue ahí, con sus objetos.
  await page.getByRole('button', { name: `Eliminar la foto ${laUno?.orden ?? 0}` }).click()
  await expect(galeria(page).getByRole('listitem')).toHaveCount(2)
  expect(await fotosDe(id(TITULOS.isla))).toHaveLength(1)
  expect((await page.request.get(urlDeObjeto(enIsla?.ruta ?? ''))).status()).toBe(200)
  expect((await page.request.get(urlDeObjeto(enIsla?.ruta_miniatura ?? ''))).status()).toBe(200)
  await abrirFotos(page, TITULOS.isla)
  await expect(galeria(page).getByRole('listitem')).toHaveCount(1)
})

test('entran hasta 24: las que no caben se dicen antes de subir', async ({ page }) => {
  test.setTimeout(90_000)
  await entrar(page, duena)
  await abrirFotos(page, TITULOS.lleno)
  await selector(page).setInputFiles(fotos(1, 26))
  await expect(
    page.getByText(
      'Este vehículo admite 24 fotos. Tiene 0: se van a subir las primeras 24 de las 26 que elegiste.',
    ),
  ).toBeVisible()
  await expect(porSubir(page).getByText('No entra: el vehículo admite 24 fotos.')).toHaveCount(2)

  await porSubir(page).getByRole('button', { name: 'Subir 24 fotos' }).click()
  await expect(page.getByText('24 fotos guardadas')).toBeVisible({ timeout: 60_000 })
  await descartarAviso(page, '24 fotos guardadas')
  await expect(galeria(page).getByRole('listitem')).toHaveCount(24)
  expect(await fotosDe(id(TITULOS.lleno))).toHaveLength(24)

  // Lleno: no se puede elegir más, y dice cómo hacer lugar. Las dos que no entraron siguen a la vista.
  await expect(page.getByRole('button', { name: 'Elegir fotos' })).toBeDisabled()
  await expect(page.getByText(/ya tiene 24 fotos\. Elimina alguna/)).toBeVisible()
  await expect(porSubir(page).getByText('No entra: el vehículo admite 24 fotos.')).toHaveCount(2)
})

test('si Storage se corta a mitad, dice cuántas quedaron y reintenta sólo las que faltan', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirFotos(page, TITULOS.red)
  await selector(page).setInputFiles(fotos(1, 4))
  await expect(porSubir(page).getByText('Lista para subir')).toHaveCount(4)

  // Pasan las primeras cuatro subidas (cada foto son dos) y el resto se cae: alguna foto llega
  // entera y alguna no.
  let pedidos = 0
  await page.route('**/storage/v1/object/vehiculos/**', (ruta) => {
    pedidos += 1
    return pedidos > 4 ? ruta.abort() : ruta.continue()
  })
  await porSubir(page).getByRole('button', { name: 'Subir 4 fotos' }).click()
  const parcial = page.getByText(/Se guardaron \d de 4\. .* revisa tu conexión y reintenta\./)
  await expect(parcial).toBeVisible()
  await descartarAviso(page, /Se guardaron \d de 4/)
  const quedaron = (await fotosDe(id(TITULOS.red))).length
  expect(quedaron).toBeGreaterThan(0)
  expect(quedaron).toBeLessThan(4)

  // Lo que la persona eligió sigue ahí, con su motivo, y lo guardado ya está en la galería.
  const faltan = 4 - quedaron
  await expect(porSubir(page).getByText('No se pudo subir.')).toHaveCount(faltan)
  await expect(galeria(page).getByRole('listitem')).toHaveCount(quedaron)

  await page.unroute('**/storage/v1/object/vehiculos/**')
  const reintentar =
    faltan === 1 ? 'Reintentar la que falta' : `Reintentar las ${faltan} que faltan`
  await porSubir(page).getByRole('button', { name: reintentar }).click()
  await expect(galeria(page).getByRole('listitem')).toHaveCount(4)
  await expect(porSubir(page)).toBeHidden()
  // En el orden en que se eligieron no: las que faltaban entran al final. Pero están las cuatro, una vez.
  expect(new Set(await ordenDe(TITULOS.red)).size).toBe(4)
})

test('lo que no es una foto, lo que no se puede leer y lo que pesa demasiado se dicen', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirFotos(page, TITULOS.camioneta)
  await selector(page).setInputFiles([
    { name: 'factura.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
    { name: 'rota.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('esto no es un jpeg') },
    { name: 'IMG_0042.HEIC', mimeType: 'image/heic', buffer: Buffer.from('ftypheic') },
    { name: 'enorme.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(26 * 1024 * 1024) },
  ])
  const bandeja = porSubir(page)
  await expect(bandeja.getByText('Sólo se pueden subir fotos (JPG, PNG o WebP).')).toBeVisible()
  await expect(bandeja.getByText('No se pudo leer esta foto. Prueba con otra copia.')).toBeVisible()
  await expect(bandeja.getByText(/no puede leer fotos HEIC/)).toBeVisible()
  await expect(bandeja.getByText('Pesa 26 MB; el máximo por foto es 25 MB.')).toBeVisible()
  // Nada de eso se sube: no hay qué confirmar.
  await expect(bandeja.getByRole('button', { name: /^Subir/ })).toHaveCount(0)
  await bandeja.getByRole('button', { name: 'Quitar factura.pdf' }).click()
  await expect(bandeja.getByText('factura.pdf')).toBeHidden()
  expect(await objetosDe(id(TITULOS.camioneta))).toHaveLength(0)
})

test('quien no puede editar el vehículo ve las fotos sin controles y con el motivo', async ({
  page,
}) => {
  await entrar(page, lector)
  await abrirFotos(page, TITULOS.sedan)
  await expect(galeria(page).getByRole('listitem')).toHaveCount(2)
  await expect(
    page.getByText('No tienes permiso para cambiar las fotos de este vehículo.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Elegir fotos' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Eliminar la foto/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Mover la foto/ })).toHaveCount(0)
  // Y uno sin fotos se lo dice igual.
  await abrirFotos(page, TITULOS.camioneta)
  await expect(page.getByText('Este vehículo no tiene fotos')).toBeVisible()
  await expect(
    page.getByText('No tienes permiso para cambiar las fotos de este vehículo.'),
  ).toBeVisible()
})

test('dos personas reordenan a la vez: la segunda se entera de quién las cambió', async ({
  page,
  browser,
}) => {
  await entrar(page, duena)
  await abrirFotos(page, TITULOS.lleno)
  const antes = await ordenDe(TITULOS.lleno)

  const deSara = await otraPersona(browser, page)
  await entrar(deSara, soloCorea)
  await abrirFotos(deSara, TITULOS.lleno)
  await deSara.getByRole('button', { name: 'Mover la foto 2 antes' }).click()
  await expect(deSara.getByRole('button', { name: 'Mover la foto 1 después' })).toBeFocused()
  const deSpuesDeSara = await ordenDe(TITULOS.lleno)
  expect(deSpuesDeSara).not.toEqual(antes)

  // La dueña, con las fotos como estaban, mueve otra.
  await page.getByRole('button', { name: 'Mover la foto 5 antes' }).click()
  await expect(page.getByText(/Sara Corea cambió las fotos de este vehículo hace/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
  // No se pisó nada.
  expect(await ordenDe(TITULOS.lleno)).toEqual(deSpuesDeSara)
  await deSara.context().close()
})
