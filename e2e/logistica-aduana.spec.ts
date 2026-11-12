// @sin-celular-archivo: el camino feliz de la aduana va en escritorio, como pide la fila 6.09; en el celular la lista son tarjetas y los paneles son los mismos drawers (6.01).
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarAduana,
  PREFIJO_DE_NUMERO_E2E,
  sembrarAduana,
  sembrarTributos,
  type TerrenoDeAduana,
} from './soporte/aduana'

// La aduana (6.09): quien gestiona crea una declaración, le suma dos vehículos de la fase que permite aduana, le asigna el canal (la composición queda fija: no se agrega ni se quita) y, cuando
// los dos vehículos tienen su gasto de tributos (sembrado por la base, no por la pantalla), la fila dice «Pagada» y el panel de la unidad dice «Tributos pagados: sí». Quien no gestiona no ve
// «Nueva declaración».
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeAduana
let numero = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  numero = `${PREFIJO_DE_NUMERO_E2E}${proyecto}`
  await borrarAduana(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-aduana-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Aduana',
  })
  terreno = await sembrarAduana(proyecto)
})

test.afterAll(async () => {
  await borrarAduana(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E quien no gestiona la aduana ve la lista sin «Nueva declaración»', async ({ page }) => {
  await entrar(page, terreno.sinGestionar, { fresco: true })
  await page.goto('/logistica/aduana')
  await expect(page.getByText('Todavía no hay declaraciones.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva declaración' })).toHaveCount(0)
})

test('E2E crear una declaración con dos vehículos, asignarle el canal y verla pagada', async ({
  page,
}) => {
  await entrar(page, terreno.conAduana, { fresco: true })
  await page.goto('/logistica/aduana')
  await expect(page.getByText('Todavía no hay declaraciones.')).toBeVisible()

  // El alta: sólo el número es obligatorio.
  await page.getByRole('button', { name: 'Nueva declaración' }).click()
  const formulario = page.getByRole('dialog', { name: 'Nueva declaración', exact: true })
  await formulario.getByLabel('Número').fill(numero)
  await formulario.getByRole('button', { name: 'Crear declaración' }).click()

  // Al guardar, el resumen de la declaración nueva queda abierto, sin vehículos.
  const resumen = page.getByRole('dialog', { name: 'Declaración', exact: true })
  await expect(resumen.getByRole('heading', { name: `Declaración ${numero}` })).toBeVisible()
  await expect(resumen.getByText('Sin vehículos.')).toBeVisible()
  await expect(
    resumen.getByText('Agrega al menos un vehículo antes de asignar el canal.'),
  ).toBeVisible()

  // La composición: buscar y agregar los dos vehículos, y guardar de una vez.
  for (const vehiculo of [terreno.enFase, terreno.tercero]) {
    await resumen.getByLabel('Buscar un vehículo para agregar').fill(vehiculo.titulo)
    await resumen.getByRole('button', { name: 'Buscar', exact: true }).click()
    await resumen.getByRole('button', { name: `Agregar ${vehiculo.titulo}` }).click()
    await expect(
      resumen.getByRole('button', { name: `No agregar ${vehiculo.titulo}` }),
    ).toBeVisible()
  }
  await resumen.getByRole('button', { name: 'Guardar vehículos' }).click()
  await expect(resumen.getByText('Falta el tributo')).toHaveCount(2)

  // El resumen ya dice cuántos tributos faltan (la lista, detrás del panel modal, no se consulta por rol).
  await expect(resumen.getByText('Faltan los tributos de 2')).toBeVisible()

  // El canal fija la composición.
  await resumen.getByRole('button', { name: 'Asignar canal' }).click()
  const canal = page.getByRole('dialog', { name: `Asignar canal a la declaración ${numero}` })
  await expect(canal.getByText('la composición queda fija')).toBeVisible()
  await canal.getByLabel('Canal de aforo').selectOption({ label: 'Verde' })
  await canal.getByRole('button', { name: 'Asignar canal' }).click()
  await expect(canal).toBeHidden()
  await expect(resumen.getByText('La composición quedó fija al asignar el canal.')).toBeVisible()
  await expect(
    resumen.getByRole('button', { name: `Quitar ${terreno.enFase.titulo}` }),
  ).toBeDisabled()
  await expect(resumen.getByLabel('Buscar un vehículo para agregar')).toHaveCount(0)
  await expect(resumen.getByRole('button', { name: 'Cambiar canal' })).toBeVisible()

  // Con el gasto de tributos de los dos (sembrado), la declaración queda pagada.
  await sembrarTributos(terreno.enFase.id)
  await sembrarTributos(terreno.tercero.id)
  await page.goto('/logistica/aduana')
  await expect(
    page.getByRole('row').filter({ hasText: numero }).getByText('Pagada', { exact: true }),
  ).toBeVisible()

  // Y el panel de la unidad lo dice.
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await page.locator('span:text-is("Aduana")').click()
  await expect(page.getByText('Tributos pagados: sí')).toBeVisible()
})
