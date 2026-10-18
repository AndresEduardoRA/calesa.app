import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  cicloDeUnaConfirmacion,
  dobleClicManda,
  noAbre,
  sinRedNoConfirma,
} from './soporte/confirmar-por-url'
import { borrarLeadsDePrueba } from './soporte/leads'
import { idDePersona, telefonoAlAzar } from './soporte/leads-alta'
import { carteraEnLaBase, rpcComo } from './soporte/leads-cartera'
import { irAFicha, nuevoLead, tituloDeLaFicha } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { crearPurgadora, estadoDeLead, loteDe } from './soporte/leads-papelera'
import { embudoPorDefecto, irAlEmbudo } from './soporte/leads-oportunidades'
import { borrarLotesDePrueba } from './soporte/papelera'
import { sql } from './soporte/sql'

// Las confirmaciones de leads que no tenían URL (cierre 2): salir de un lead, purgar de la papelera y eliminar un embudo. Cada una
// con su `?panel=`: se abre, Esc devuelve el foco, «atrás» y la recarga, sin red, doble clic, y una URL que no se puede abrir.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let purgadora: { email: string; nombre: string }

const borrarEmbudosDePrueba = () => {
  sql("delete from public.embudos where nombre like 'Embudo url %'")
}

test.beforeAll(async ({}, info) => {
  borrarEmbudosDePrueba()
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  t = await prepararListado(info.project.name)
  purgadora = await crearPurgadora(`${info.project.name}-url`)
})

test.afterAll(async () => {
  borrarEmbudosDePrueba()
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  await limpiarListado(t)
})

const telefono = () => `${t.codigo}${telefonoAlAzar()}`
const deBerta = (corto: string) =>
  nuevoLead({ corto, telefono: telefono(), deQuien: t.personas.berta })

test('salir de un lead: su URL, Esc, atrás, recarga, sin red y un solo pedido', async ({
  page,
  context,
}, info) => {
  const lead = await deBerta(`Salir url ${info.project.name}`)
  const carlos = await idDePersona(t.personas.carlos)
  const compartir = await rpcComo(t.personas.berta, 'lead_compartir', {
    p_lead: lead.id,
    p_usuario: carlos,
  })
  expect(compartir.error).toBeNull()
  await entrar(page, t.personas.carlos)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  const disparador = page.getByRole('button', { name: 'Salir de este lead' })
  const dialogo = page.getByRole('dialog', { name: `Salir de «${lead.nombre}»` })
  await cicloDeUnaConfirmacion(page, {
    abrir: () => disparador.click(),
    dialogo,
    disparador,
    url: /panel=salir-lead/,
  })
  const confirmar = dialogo.getByRole('button', { name: 'Salir de este lead' })
  await sinRedNoConfirma(context, dialogo, confirmar)
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect(page).toHaveURL(/\/leads$/)
  expect((await carteraEnLaBase(lead.id)).map((a) => a.usuario_id)).not.toContain(carlos)
})

test('salir de un lead: quien es el dueño no lo abre escribiendo la URL', async ({
  page,
}, info) => {
  const lead = await deBerta(`Salir dueño ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?panel=salir-lead')
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('purgar de la papelera: su URL, Esc, atrás, recarga, sin red y un solo pedido', async ({
  page,
  context,
}, info) => {
  const a = await deBerta(`Purga url A ${info.project.name}`)
  const b = await deBerta(`Purga url B ${info.project.name}`)
  const envio = await rpcComo(t.personas.berta, 'leads_papelera_enviar', {
    p_lote: crypto.randomUUID(),
    p_leads: [a.id, b.id],
  })
  expect(envio.error).toBeNull()
  await entrar(page, purgadora.email)
  await page.goto('/leads/papelera')
  const lote = loteDe(page, a.nombre)
  await expect(lote).toContainText('Lote de 2')
  const disparador = page.getByRole('button', { name: `Purgar ${b.nombre}` })
  const dialogo = page.getByRole('dialog', { name: `Purgar «${b.nombre}»` })
  await cicloDeUnaConfirmacion(page, {
    abrir: () => disparador.click(),
    dialogo,
    disparador,
    url: /panel=purgar&lote=[^&]+&lead=/,
  })
  const confirmar = dialogo.getByRole('button', { name: 'Purgar', exact: true })
  await sinRedNoConfirma(context, dialogo, confirmar)
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect(dialogo).toBeHidden()
  expect(await estadoDeLead(b.id)).toBeNull()
  expect((await estadoDeLead(a.id))?.eliminado_en).not.toBeNull()
})

test('purgar de la papelera: un lote que no está en la página no abre nada, avisa y limpia la URL', async ({
  page,
}) => {
  await entrar(page, purgadora.email)
  await noAbre(
    page,
    '/leads/papelera?panel=purgar&lote=00000000-0000-4000-8000-000000000999',
    'Ese lote ya no está en esta página de la papelera.',
    /panel=purgar/,
  )
})

test('eliminar un embudo: su URL junto al panel de etapas, Esc, atrás, recarga, sin red y un solo pedido', async ({
  page,
  context,
}, info) => {
  const nombre = `Embudo url ${info.project.name}`
  // Con el de por defecto ya creado, el nuevo se puede eliminar.
  await embudoPorDefecto(t.personas.berta)
  const id = crypto.randomUUID()
  const creado = await rpcComo(t.personas.berta, 'embudo_crear', { p_id: id, p_nombre: nombre })
  expect(creado.error).toBeNull()
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page, `&embudo=${id}`)
  await page.getByRole('button', { name: 'Etapas', exact: true }).click()
  const panel = page.getByRole('dialog', { name: /Etapas de/ })
  await expect(panel).toBeVisible()
  const disparador = panel.getByRole('button', { name: 'Eliminar embudo' })
  const dialogo = page.getByRole('dialog', { name: `Eliminar el embudo «${nombre}»` })
  await cicloDeUnaConfirmacion(page, {
    abrir: () => disparador.click(),
    dialogo,
    disparador,
    url: /eliminar=embudo/,
  })
  // El panel de etapas sigue en la URL mientras se pregunta.
  await expect(page).toHaveURL(/panel=etapas/)
  const confirmar = dialogo.getByRole('button', { name: 'Eliminar embudo' })
  await sinRedNoConfirma(context, dialogo, confirmar)
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect(page.getByText(`Se eliminó el embudo «${nombre}».`)).toBeVisible()
  await expect(page).not.toHaveURL(/eliminar=/)
})
