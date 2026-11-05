import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'

// «Cotizar» en la ficha del lead (paso 4.14-3c, `docs/UX.md` › «Cotizar»): un botón en la cabecera, entre «Editar» y el «⋯», que abre la hoja con este lead ya elegido, en el primer
// origen donde quien mira cotiza. Sólo se dibuja si cotiza en algún origen; la base vuelve a exigirlo al guardar.
test.describe.configure({ mode: 'serial' })

let asesora = ''
let sinCotizar = ''
let lead = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  // La dueña primero: la primera cuenta de la empresa tiene que poder gestionar el equipo.
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-ficha-cotizar-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dora Ficha',
  })
  ;({ email: asesora } = await crearAsesoraDeLaSemilla(`ficha-cotizar-${proyecto}`))
  lead = await crearLead({
    nombre: `ficha cotizar ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora,
  })
  // Ve todos los leads y no tiene ningún permiso de cotizaciones.
  sinCotizar = correoDePrueba(`sin-cotizar-ficha-${proyecto}`)
  await crearPersona({
    email: sinCotizar,
    contrasena: CONTRASENA,
    nombre: 'Sara Sin Cotizar',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinCotizar,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Sin cotizar ${proyecto}`,
      clave: `e2e_sin_cotizar_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: [{ clave: 'leads.ver', alcance: 'todos' }],
  })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E «Cotizar» en la ficha abre la hoja con este lead elegido, en el primer origen donde se cotiza', async ({
  page,
}) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto(`/leads/${lead}`)
  const cotizar = page.getByRole('link', { name: 'Cotizar' })
  await expect(cotizar).toBeVisible()
  // Entre «Editar» y el «⋯» de la cabecera.
  const botones = page.locator('main').getByRole('button').or(cotizar)
  const textos = await botones.evaluateAll((nodos) =>
    nodos.map((nodo) => nodo.textContent.trim() || (nodo.getAttribute('aria-label') ?? '')),
  )
  const posicion = textos.indexOf('Cotizar')
  expect(textos[posicion - 1]).toBe('Editar')
  await cotizar.click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?/)
  const url = new URL(page.url())
  expect(url.searchParams.get('lead')).toBe(lead)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Cliente:/ })).toContainText('ficha cotizar')
  // El origen de la URL es la primera pestaña de la hoja.
  const primera = page.getByRole('navigation', { name: 'Orígenes' }).getByRole('link').first()
  await expect(primera).toHaveAttribute('aria-current', 'page')
  expect(url.searchParams.get('origen')).not.toBeNull()
})

test('E2E sin ningún permiso de cotizaciones no hay «Cotizar» y la ficha se ve igual', async ({
  page,
}, info) => {
  await entrar(page, sinCotizar, { fresco: true })
  await page.goto(`/leads/${lead}`)
  await expect(
    page.getByRole('heading', { name: `E2E ficha cotizar ${info.project.name}`, level: 1 }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Cotizar' })).toHaveCount(0)
})
