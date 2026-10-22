import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarPersonasSembradas,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  sembrarPersonas,
} from './soporte/base'
import { esMovil } from './soporte/inventario'
import { ingresar } from './soporte/pasos'
import { sinScrollHorizontal } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// 5a-27: Roles no cuenta exacto a las personas de cada rol. Cuenta hasta 1.001 (`roles_personas()`) y, pasado el tope, dice «más de 1.000
// personas»: el número de un rol con miles no crece con el equipo. Antes, `usuarios_roles(count)` decía «1050 personas». En escritorio la
// cabecera de la columna; en el celular, la del rol a la vista. Al 200 % la línea no ensancha la página.

const CLAVE = 'una-clave-de-prueba-9'
const PREFIJO = 'Conteo Rol'
const SEMBRADAS = 1050

let duena = ''
let muchos = ''
let pocos = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-conteo-rol-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Conteo' })
  sembrarPersonas(SEMBRADAS, PREFIJO)
  muchos = `${PREFIJO_ROL_E2E}Muchos ${proyecto}`
  pocos = `${PREFIJO_ROL_E2E}Pocos ${proyecto}`
  sql(`
    insert into public.roles (nombre, clave) values
      (${literal(muchos)}, ${literal(`e2e_muchos_${proyecto}`)}), (${literal(pocos)}, ${literal(`e2e_pocos_${proyecto}`)});
    insert into public.usuarios_roles (usuario_id, rol_id)
      select p.id, r.id from public.perfiles p, public.roles r
       where p.nombre like ${literal(`${PREFIJO} %`)} and r.nombre = ${literal(muchos)};
    insert into public.usuarios_roles (usuario_id, rol_id)
      select p.id, r.id from (select id from public.perfiles where nombre like ${literal(`${PREFIJO} %`)} order by nombre limit 3) p,
             public.roles r where r.nombre = ${literal(pocos)};
  `)
})

test.afterAll(async () => {
  borrarPersonasSembradas(PREFIJO)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function verRol(page: Page, nombre: string) {
  if (esMovil(page)) {
    await page.getByLabel('Rol a la vista').selectOption({ label: nombre })
  }
}

for (const zoom of ['100', '200'] as const) {
  test(`al ${zoom} %: un rol con más de 1.000 personas lo dice sin contarlas todas`, async ({
    page,
  }) => {
    await page.goto('/ingreso')
    await ingresar(page, duena, CLAVE)
    await expect(page).toHaveURL('/')
    await page.goto('/configuracion/roles')
    await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
    if (zoom === '200') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }

    await verRol(page, muchos)
    const masDeMil = page.getByText('más de 1.000 personas', { exact: true })
    await expect(masDeMil).toBeVisible()
    await masDeMil.scrollIntoViewIfNeeded()
    await expect(page.getByText(`${String(SEMBRADAS)} personas`)).toHaveCount(0)
    // Con personas adentro no se elimina: el motivo es el mismo con el tope.
    await expect(
      page.getByRole('button', { name: `Eliminar el rol ${muchos}. Quítaselo` }),
    ).toBeDisabled()
    await sinScrollHorizontal(page)

    await verRol(page, pocos)
    const tres = page.getByText('3 personas', { exact: true })
    await expect(tres).toBeVisible()
    await tres.scrollIntoViewIfNeeded()
  })
}
