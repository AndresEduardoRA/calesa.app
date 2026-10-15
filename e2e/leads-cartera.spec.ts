import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import { idDePersona, telefonoAlAzar } from './soporte/leads-alta'
import { NO_DISPONIBLE, irAFicha, nuevoLead, tituloDeLaFicha } from './soporte/leads-ficha'
import {
  bloqueDeCartera,
  carteraEnLaBase,
  crearSupervision,
  filaDeCartera,
  panelDeCartera,
  rpcComo,
} from './soporte/leads-cartera'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'

// La cartera de un lead desde la ficha («Quién lo tiene»): ver nombres, compartir, quitar acceso con
// «Deshacer», transferir con confirmación y «Salir de este lead», para quien puede; y la supervisión
// que mueve lo ajeno sin tenerlo, sin darse el lead a sí misma.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let supervision: { email: string; nombre: string }

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  supervision = await crearSupervision(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const telefono = () => `${t.codigo}${telefonoAlAzar()}`

async function leadDeBerta(corto: string) {
  return nuevoLead({ corto, telefono: telefono(), deQuien: t.personas.berta })
}

test('el dueño ve quién lo tiene, lo comparte, y quitar el acceso se deshace', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Comparte ${info.project.name}`)
  const carlos = await idDePersona(t.personas.carlos)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  // Sólo ella: dueña, y es quien mira.
  await expect(filaDeCartera(page, t.personas.nombres.berta)).toContainText('Dueño')
  await expect(filaDeCartera(page, t.personas.nombres.berta)).toContainText('(tú)')
  // Compartir con Carlos.
  await page.getByRole('button', { name: 'Compartir', exact: true }).click()
  const panel = panelDeCartera(page, 'Compartir lead')
  await expect(panel).toBeVisible()
  await panel.getByLabel('Buscar persona').fill('carlos')
  await panel.getByRole('radio', { name: t.personas.nombres.carlos }).check()
  await panel.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(
    page.getByText(`Compartiste «${lead.nombre}» con ${t.personas.nombres.carlos}.`),
  ).toBeVisible()
  await expect(panel).toBeHidden()
  await expect(filaDeCartera(page, t.personas.nombres.carlos)).toContainText('Compartido')
  expect((await carteraEnLaBase(lead.id)).map((a) => a.usuario_id)).toContain(carlos)
  // Quitar el acceso se hace y se ofrece «Deshacer».
  await page.getByRole('button', { name: `Quitar acceso a ${t.personas.nombres.carlos}` }).click()
  await expect(filaDeCartera(page, t.personas.nombres.carlos)).toHaveCount(0)
  expect((await carteraEnLaBase(lead.id)).map((a) => a.usuario_id)).not.toContain(carlos)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(filaDeCartera(page, t.personas.nombres.carlos)).toContainText('Compartido')
  expect((await carteraEnLaBase(lead.id)).map((a) => a.usuario_id)).toContain(carlos)
})

test('transferir lo dice con nombres, el saliente queda compartido y puede salirse', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Transfiere ${info.project.name}`)
  const carlos = await idDePersona(t.personas.carlos)
  const berta = await idDePersona(t.personas.berta)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await page.getByRole('button', { name: 'Transferir', exact: true }).click()
  const panel = panelDeCartera(page, 'Transferir lead')
  await panel.getByRole('radio', { name: t.personas.nombres.carlos }).check()
  // La confirmación nombra a las dos personas y dice que el saliente conserva el acceso.
  await expect(
    panel.getByText(
      `«${lead.nombre}» pasará a ser de ${t.personas.nombres.carlos}. Tú seguirás con acceso compartido.`,
    ),
  ).toBeVisible()
  await panel.getByRole('button', { name: 'Transferir lead' }).click()
  await expect(
    page.getByText(`«${lead.nombre}» ahora es de ${t.personas.nombres.carlos}.`),
  ).toBeVisible()
  await expect(filaDeCartera(page, t.personas.nombres.carlos)).toContainText('Dueño')
  await expect(filaDeCartera(page, t.personas.nombres.berta)).toContainText('Compartido')
  const cartera = await carteraEnLaBase(lead.id)
  expect(cartera.find((a) => a.usuario_id === carlos)?.tipo_acceso).toBe('dueno')
  expect(cartera.find((a) => a.usuario_id === berta)?.tipo_acceso).toBe('compartido')
  // Ya no mueve el lead: no hay «Compartir» ni «Transferir»; sí puede salirse.
  await expect(page.getByRole('button', { name: 'Compartir', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Transferir', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Salir de este lead' }).click()
  const confirmacion = page.getByRole('dialog', { name: `Salir de «${lead.nombre}»` })
  await expect(confirmacion).toBeVisible()
  await confirmacion.getByRole('button', { name: 'Salir de este lead' }).click()
  await expect(page).toHaveURL(/\/leads$/)
  await irAFicha(page, lead.id)
  await expect(page.getByText(NO_DISPONIBLE).first()).toBeVisible()
  expect((await carteraEnLaBase(lead.id)).map((a) => a.usuario_id)).not.toContain(berta)
})

test('el dueño no se sale: no hay «Salir de este lead»', async ({ page }, info) => {
  const lead = await leadDeBerta(`Sin salir ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await expect(bloqueDeCartera(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salir de este lead' })).toHaveCount(0)
})

test('la supervisión ve los nombres, no el teléfono, y no se da el lead a sí misma', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Supervisado ${info.project.name}`,
    telefono: telefono(),
    deQuien: t.personas.carlos,
  })
  await entrar(page, supervision.email)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await expect(filaDeCartera(page, t.personas.nombres.carlos)).toContainText('Dueño')
  await expect(page.getByText('Completo solo para su cartera.').first()).toBeVisible()
  // Mueve lo ajeno, pero nunca se ofrece a sí misma.
  await page.getByRole('button', { name: 'Transferir', exact: true }).click()
  const panel = panelDeCartera(page, 'Transferir lead')
  await expect(panel.getByRole('radio', { name: t.personas.nombres.berta })).toBeVisible()
  await expect(panel.getByRole('radio', { name: supervision.nombre })).toHaveCount(0)
  // Y sin tenerlo, no hay «Salir de este lead».
  await panel.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('button', { name: 'Salir de este lead' })).toHaveCount(0)
  // Si lo pidiera a mano, la base se lo niega con su sesión.
  const { error } = await rpcComo(supervision.email, 'lead_transferir', {
    p_lead: lead.id,
    p_destino: await idDePersona(supervision.email),
    p_dueno_esperado: await idDePersona(t.personas.carlos),
  })
  expect(error?.code).toBe('42501')
  expect(error?.message).toBe('No puedes transferirte un lead que no es tuyo.')
  expect((await carteraEnLaBase(lead.id)).map((a) => a.tipo_acceso)).toEqual(['dueno'])
})

test('se revoca la cartera con la ficha abierta: la acción lo dice y la ficha deja de verse', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Revocado ${info.project.name}`)
  const berta = await idDePersona(t.personas.berta)
  const carlos = await idDePersona(t.personas.carlos)
  const compartido = await rpcComo(t.personas.berta, 'lead_compartir', {
    p_lead: lead.id,
    p_usuario: carlos,
  })
  expect(compartido.error).toBeNull()
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  // Le quitan el lead a Berta (y Carlos queda de dueño) mientras la ficha sigue abierta.
  const { error } = await admin()
    .from('leads_asesores')
    .update({ revocado_en: new Date().toISOString() })
    .eq('lead_id', lead.id)
    .eq('usuario_id', berta)
  exigir(error, 'revocar a Berta')
  await admin()
    .from('leads_asesores')
    .update({ tipo_acceso: 'dueno' })
    .eq('lead_id', lead.id)
    .eq('usuario_id', carlos)
  await page.getByRole('button', { name: `Quitar acceso a ${t.personas.nombres.carlos}` }).click()
  await expect(page.getByText(NO_DISPONIBLE).first()).toBeVisible()
})
