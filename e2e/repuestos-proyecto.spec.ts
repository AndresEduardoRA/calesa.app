import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { fotos } from './soporte/fotos'
import { sql } from './soporte/sql'

// `/repuestos/[id]` (8.09-2): la dueña crea un proyecto externo, cae en su detalle, agrega dos ítems sólo con el teclado, pone un precio, recarga y siguen; cierra el proyecto (la hoja queda de lectura) y
// lo reabre; elimina un ítem con su confirmación. Quien sólo ve repuestos ve la hoja sin celdas editables, sin fila nueva y sin «Eliminar». Un cambio ajeno del ítem sale como conflicto y no se pisa. El
// caso de la ficha del vehículo lo suma 8.09-4. Las imágenes del ítem (8.09-3): sube dos, recarga y siguen, quita una con «Deshacer», quita otra y su objeto queda en la cola de limpieza; quien sólo ve las ve sin
// zona ni «Quitar». El spec limpia lo que crea por su etiqueta y borra los objetos que subió.
test.describe.configure({ mode: 'serial' })

const ETIQUETA = 'E2E Hoja de repuestos'
const limpiar = () => {
  sql(`delete from repuestos_proyectos where vehiculo_etiqueta like 'E2E%'`)
}
let duena = ''
let lectora = ''
let proyecto = ''
let itemConImagenes = ''

// Lo que el spec subió al bucket `repuestos` (nadie lo borra desde la app: borrar la fila lo encola) y lo que quedó en la cola.
async function borrarImagenesDePrueba(itemId: string) {
  if (itemId === '') return
  const { data } = await admin().storage.from('repuestos').list(itemId, { limit: 20 })
  const rutas = (data ?? []).map((objeto) => `${itemId}/${objeto.name}`)
  if (rutas.length > 0) await admin().storage.from('repuestos').remove(rutas)
  await admin()
    .from('cola_gc_storage')
    .delete()
    .eq('bucket', 'repuestos')
    .like('ruta', `${itemId}/%`)
}

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-hoja-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Hoja' })
  lectora = correoDePrueba(`lectora-hoja-${nombre}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Hoja',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos hoja ${nombre}`,
      clave: `e2e_ve_repuestos_hoja_${nombre}`,
    },
    permisos: ['repuestos.ver'],
  })
  limpiar()
})

test.afterAll(async () => {
  limpiar()
  await borrarImagenesDePrueba(itemConImagenes)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const FARO = 'Faro izquierdo'
const PARACHOQUES = 'Parachoques delantero'

test('la dueña crea un proyecto, carga dos ítems con el teclado, cambia un precio y todo sigue tras recargar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const dialogo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await dialogo.getByLabel('Vehículo', { exact: true }).fill(ETIQUETA)
  await dialogo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''
  await expect(page.getByRole('heading', { name: /^Proyecto #\d+$/ })).toBeVisible()
  await expect(page.getByText('Este proyecto todavía no tiene ítems.')).toBeVisible()

  // Dos ítems sólo con el teclado: descripción, Enter, descripción, Enter. El foco se queda en la fila nueva.
  const nueva = page.getByLabel('Nuevo ítem: descripción')
  await nueva.fill(FARO)
  await nueva.press('Enter')
  await expect(page.getByLabel(`Descripción del ítem ${FARO}`)).toBeVisible()
  await expect(nueva).toBeFocused()
  await expect(nueva).toHaveValue('')
  await nueva.fill(PARACHOQUES)
  await nueva.press('Enter')
  await expect(page.getByLabel(`Descripción del ítem ${PARACHOQUES}`)).toBeVisible()

  // Un precio con el teclado: en la celda del precio se tipea y Enter confirma; el ítem queda con la moneda de la empresa.
  const fila = page.locator('[data-fila-de-item]').filter({
    has: page.getByLabel(`Descripción del ítem ${FARO}`),
  })
  const precio = fila.getByRole('group', { name: 'Precio al cliente' })
  await precio.locator('[data-parada="0"]').focus()
  await page.keyboard.type('1250')
  await page.keyboard.press('Enter')
  await expect(precio).toContainText(/1\.?250/)
  await expect(fila.getByLabel(`Moneda del ítem ${FARO}`)).not.toHaveValue('')

  // Recarga: los dos ítems y el precio siguen.
  await page.reload()
  await expect(page.getByLabel(`Descripción del ítem ${PARACHOQUES}`)).toBeVisible()
  await expect(
    page
      .locator('[data-fila-de-item]')
      .filter({ has: page.getByLabel(`Descripción del ítem ${FARO}`) })
      .getByRole('group', { name: 'Precio al cliente' }),
  ).toContainText(/1\.?250/)
})

test('cerrar el proyecto deja la hoja de lectura, reabrir la devuelve y un ítem se elimina con su confirmación', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await page.getByRole('button', { name: 'Cerrar proyecto' }).click()
  await expect(
    page.getByText('El proyecto está cerrado: reábrelo para editar los ítems.'),
  ).toBeVisible()
  await expect(page.getByLabel('Nuevo ítem: descripción')).toHaveCount(0)
  await expect(page.getByLabel(`Descripción del ítem ${FARO}`)).toHaveCount(0)
  await expect(page.getByText(FARO)).toBeVisible()

  await page.getByRole('button', { name: 'Reabrir proyecto' }).click()
  await expect(page.getByLabel(`Descripción del ítem ${FARO}`)).toBeVisible()

  await page.getByRole('button', { name: `Eliminar el ítem ${PARACHOQUES}` }).click()
  const confirmar = page.getByRole('dialog', { name: `Eliminar el ítem «${PARACHOQUES}»` })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByLabel(`Descripción del ítem ${PARACHOQUES}`)).toHaveCount(0)
  await expect(page.getByLabel(`Descripción del ítem ${FARO}`)).toBeVisible()
})

test('quien sólo ve repuestos ve la hoja sin celdas editables, sin fila nueva y sin eliminar', async ({
  page,
}) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await expect(page.getByText(FARO)).toBeVisible()
  await expect(page.getByLabel(`Descripción del ítem ${FARO}`)).toHaveCount(0)
  await expect(page.getByLabel('Nuevo ítem: descripción')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Eliminar el ítem/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cerrar proyecto' })).toHaveCount(0)
  await expect(page.locator('[data-xcell]')).toHaveCount(0)
})

test('si otra persona cambia el ítem, guardar otra celda sale como conflicto y no pisa; recargar trae lo nuevo', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  const descripcion = page.getByLabel(`Descripción del ítem ${FARO}`)
  await expect(descripcion).toBeVisible()
  sql(`update repuestos_items set precio_cliente = 99 where proyecto_id = '${proyecto}'`)
  await descripcion.fill(`${FARO} derecho`)
  await descripcion.press('Enter')
  await expect(
    page.getByText('Otra persona cambió este ítem. Recarga para ver lo nuevo.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Recargar' }).click()
  await expect(page.getByLabel(`Descripción del ítem ${FARO}`)).toBeVisible()
  await expect(page.getByRole('group', { name: 'Precio al cliente' })).toContainText(/99/)
})

test('las imágenes de un ítem: sube dos, siguen tras recargar, quita una con «Deshacer» y quita otra que queda en la cola', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  itemConImagenes = sql(
    `select id from repuestos_items where proyecto_id = '${proyecto}' and descripcion = '${FARO}' and eliminado_en is null`,
  )
  await page.getByRole('button', { name: `Imágenes del ítem ${FARO}` }).click()
  const panel = page.getByRole('dialog', { name: `Imágenes de «${FARO}»` })
  await expect(panel.getByText('0 de 8 imágenes')).toBeVisible()
  await expect(panel.getByText('Este ítem aún no tiene imágenes')).toBeVisible()

  // Elegir sube al momento: dos imágenes distintas, achicadas y nombradas por su hash.
  await panel.locator('input[type="file"]').first().setInputFiles(fotos(1, 2))
  await expect(panel.getByText('2 de 8 imágenes')).toBeVisible()
  await expect(
    panel.getByRole('list', { name: `Imágenes de «${FARO}»` }).getByRole('img'),
  ).toHaveCount(2)

  // Recargar con el panel abierto: siguen.
  await page.reload()
  const recargado = page.getByRole('dialog', { name: `Imágenes de «${FARO}»` })
  await expect(recargado.getByText('2 de 8 imágenes')).toBeVisible()

  // Quitar y «Deshacer»: vuelve (queda al final).
  await recargado.getByRole('button', { name: `Quitar la imagen 1 de «${FARO}»` }).click()
  await expect(recargado.getByText('1 de 8 imágenes')).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(recargado.getByText('2 de 8 imágenes')).toBeVisible()
  expect(
    sql(
      `select count(*) from cola_gc_storage where bucket = 'repuestos' and ruta like '${itemConImagenes}/%' and reclamado_en is null`,
    ),
  ).toBe('0')

  // Quitar sin deshacer: el objeto queda en la cola de limpieza (no se borra desde la app).
  await recargado.getByRole('button', { name: `Quitar la imagen 1 de «${FARO}»` }).click()
  await expect(recargado.getByText('1 de 8 imágenes')).toBeVisible()
  await expect
    .poll(() =>
      sql(
        `select count(*) from cola_gc_storage where bucket = 'repuestos' and ruta like '${itemConImagenes}/%' and reclamado_en is null`,
      ),
    )
    .toBe('1')
})

test('quien sólo ve repuestos ve las imágenes del ítem sin zona para subir ni «Quitar»', async ({
  page,
}) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?panel=imagenes&item=${itemConImagenes}`)
  const panel = page.getByRole('dialog', { name: `Imágenes de «${FARO}»` })
  await expect(panel.getByText('1 de 8 imágenes')).toBeVisible()
  await expect(panel.getByText('Sólo puedes ver las imágenes de este ítem.')).toBeVisible()
  await expect(
    panel.getByRole('list', { name: `Imágenes de «${FARO}»` }).getByRole('img'),
  ).toHaveCount(1)
  await expect(panel.getByRole('button', { name: /^Quitar la imagen/ })).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Elegir imágenes' })).toHaveCount(0)
})
