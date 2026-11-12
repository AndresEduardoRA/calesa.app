import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { correoDePrueba, crearPersona } from './soporte/base'
import { idDePersona } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { meterRecordatorio } from './soporte/leads-seguimientos'

// Inicio: la bandeja con sus bloques. Una asesora con un recordatorio para hoy lo ve y llega a la ficha; la dueña ve a la persona
// recién invitada en «Personas sin rol»; un bloque de otra fase todavía muestra su vacío. Camino feliz de la pantalla (9.02).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

test('la asesora ve su recordatorio de hoy y llega a la ficha del lead', async ({ page }, info) => {
  const lead = await nuevoLead({
    corto: `Bandeja Recordatorio ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  const titulo = `Llamar por la bandeja ${info.project.name}`
  // Hace un minuto: es de hoy (o vencido, si cruzó la medianoche) sin depender de la hora a la que corra.
  await meterRecordatorio({
    leadId: lead.id,
    usuarioId: await idDePersona(t.personas.berta),
    titulo,
    recordarEn: new Date(Date.now() - 60_000).toISOString(),
  })

  await entrar(page, t.personas.berta)
  await page.goto('/')
  const bloque = page.getByRole('region', { name: 'Recordatorios de hoy' })
  await expect(bloque.getByRole('link', { name: new RegExp(titulo) })).toBeVisible()
  await expect(bloque.getByText('1 recordatorio')).toBeVisible()
  // La asesora no gestiona al equipo: ese bloque no existe para ella.
  await expect(page.getByRole('heading', { name: 'Personas sin rol' })).toBeHidden()

  await bloque.getByRole('link', { name: new RegExp(titulo) }).click()
  await expect(page).toHaveURL(new RegExp(`/leads/${lead.id}\\?seccion=seguimientos`))
})

test('la dueña ve a la persona recién invitada en «Personas sin rol» y la abre', async ({
  page,
}, info) => {
  // «Aaa»: queda primera por nombre, así entra en las cinco que muestra el bloque.
  const nombrePersona = `Aaa E2E sin rol ${info.project.name}`
  const correo = correoDePrueba(`sinrol-bandeja-${info.project.name}`)
  await crearPersona({
    email: correo,
    contrasena: 'no-se-usa-1234',
    nombre: nombrePersona,
    invitada: true,
  })
  const personaId = await idDePersona(correo)

  await entrar(page, t.personas.duena)
  await page.goto('/')
  const bloque = page.getByRole('region', { name: 'Personas sin rol' })
  const enlace = bloque.getByRole('link', { name: nombrePersona })
  await expect(enlace).toBeVisible()
  await enlace.click()
  await expect(page).toHaveURL(new RegExp(`/configuracion/equipo\\?persona=${personaId}`))
})

test('un bloque de otra fase todavía muestra su vacío, sin tumbar a los demás', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await page.goto('/')
  // «Esperas que destraban vehículos» sigue siendo un hueco (lo llena la Fase 8); los de logística ya dependen de la base (6.12-2).
  const bloque = page.getByRole('region', { name: 'Esperas que destraban vehículos' })
  await expect(bloque.getByText('Ningún vehículo espera repuestos.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Recordatorios de hoy' })).toBeVisible()
})
