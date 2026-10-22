import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarPersonasSembradas,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  sembrarPersonas,
} from './soporte/base'
import { esMovil } from './soporte/inventario'
import { ingresar } from './soporte/pasos'
import { capturar, textoGrandeAlCargar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Las capturas del paso 4.02 (`E2E_CAPTURAS=e2e-capturas/4-02/{antes,despues}`): el buscador del equipo con 1 y 2 letras, con «zq» y con 3
// letras (5a-31), y Roles con un rol de más de 1.000 personas (5a-27), al 100 % y al 200 %. Sin asserts: lo que se puede afirmar vive en
// `equipo-busqueda-minima` y `roles-conteo-acotado`; este deja las imágenes para juzgar mirando y tiene que correr contra el código de antes
// del arreglo (donde «zq» dice «Nada coincide» y el rol dice «1050 personas»).

const CLAVE = 'una-clave-de-prueba-9'
const PREFIJO = 'Capturas Cuatro'
const ZETA = 'Zeta Capturas Cuatro'

let duena = ''
let rol = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-4-02-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Capturas' })
  sembrarPersonas(1050, PREFIJO)
  await crearPersona({
    email: correoDePrueba(`zeta-4-02-${proyecto}`),
    contrasena: CLAVE,
    nombre: ZETA,
    invitada: true,
  })
  rol = `${PREFIJO_ROL_E2E}Ventas ${proyecto}`
  sql(`
    insert into public.roles (nombre, clave) values (${literal(rol)}, ${literal(`e2e_ventas_${proyecto}`)});
    insert into public.usuarios_roles (usuario_id, rol_id)
      select p.id, r.id from public.perfiles p, public.roles r where p.nombre like ${literal(`${PREFIJO} %`)} and r.nombre = ${literal(rol)};
  `)
})

test.afterAll(async () => {
  borrarPersonasSembradas(PREFIJO)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

for (const zoom of ['100', '200'] as const) {
  test(`el buscador del equipo con 1, 2 y 3 letras y con «zq» al ${zoom} %`, async ({
    page,
  }, info) => {
    if (zoom === '200') await textoGrandeAlCargar(page)
    await entrar(page)
    await page.goto('/configuracion/equipo')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const campo = page.getByRole('searchbox', { name: 'Buscar por nombre o correo' })
    for (const [escrito, nombre] of [
      ['Z', 'busqueda-1-letra'],
      ['e', 'busqueda-2-letras'],
      ['t', 'busqueda-3-letras'],
    ] as const) {
      await campo.pressSequentially(escrito, { delay: 60 })
      await page.waitForTimeout(900)
      await capturar(page, info, `${nombre}-${zoom}`)
    }
    await campo.fill('')
    await page.waitForTimeout(900)
    await campo.pressSequentially('zq', { delay: 60 })
    await page.waitForTimeout(900)
    await capturar(page, info, `busqueda-zq-${zoom}`)
  })

  test(`Roles con un rol de más de 1.000 personas al ${zoom} %`, async ({ page }, info) => {
    if (zoom === '200') await textoGrandeAlCargar(page)
    await entrar(page)
    await page.goto('/configuracion/roles')
    await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
    if (esMovil(page)) {
      await page.getByLabel('Rol a la vista').selectOption({ label: rol })
    }
    // La cabecera del rol con su conteo, al centro (en la tabla, a la derecha de la columna pegada; en el celular, bajo el selector). El
    // `<select>` del celular, oculto en escritorio, también nombra al rol: se busca el que se ve.
    const cabecera = page.getByText(rol, { exact: true }).locator('visible=true').last()
    await expect(cabecera).toBeVisible()
    await cabecera.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'center' })
    })
    await capturar(page, info, `roles-mas-de-mil-${zoom}`)
  })
}
