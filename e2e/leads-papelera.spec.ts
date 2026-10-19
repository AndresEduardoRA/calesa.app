import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarLeadsDePrueba, idDe } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { irAFicha, nuevoLead, tituloDeLaFicha, NO_DISPONIBLE } from './soporte/leads-ficha'
import {
  fila,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { abrirMenuDeFila } from './soporte/leads-marcas'
import { rpcComo } from './soporte/leads-cartera'
import {
  crearPurgadora,
  estadoDeLead,
  loteDe,
  lotesDeLeads,
  menuDeFicha,
} from './soporte/leads-papelera'
import { borrarLotesDePrueba } from './soporte/papelera'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La papelera de leads: enviar desde la ficha y desde el «⋯» de la fila con «Deshacer», restaurar
// (también con el teléfono tomado), purgar con confirmación y quién ve qué.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let purgadora: { email: string; nombre: string }

test.beforeAll(async ({}, info) => {
  // Un lote recuerda quién lo envió: antes de borrar a las personas de prueba, se van sus leads y sus lotes.
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  t = await prepararListado(info.project.name)
  purgadora = await crearPurgadora(info.project.name)
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  await limpiarListado(t)
})

const telefono = () => `${t.codigo}${telefonoAlAzar()}`

const deBerta = (corto: string) =>
  nuevoLead({ corto, telefono: telefono(), deQuien: t.personas.berta })

test('desde la ficha: enviar a la papelera ofrece «Deshacer» y el lead vuelve', async ({
  page,
}, info) => {
  const lead = await deBerta(`Ficha papelera ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await menuDeFicha(page, lead.nombre).click()
  await page.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  await expect(page.getByText(`«${lead.nombre}» se envió a la papelera.`)).toBeVisible()
  await expect(page).toHaveURL(/\/leads$/)
  expect((await estadoDeLead(lead.id))?.eliminado_en).not.toBeNull()
  // «Deshacer» lo trae de vuelta.
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText(`«${lead.nombre}» volvió a tus leads.`)).toBeVisible()
  expect((await estadoDeLead(lead.id))?.eliminado_en).toBeNull()
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un lead en la papelera es, para la ficha, un lead que no existe', async ({ page }, info) => {
  const lead = await deBerta(`Ficha en papelera ${info.project.name}`)
  await entrar(page, t.personas.berta)
  const envio = await rpcComo(t.personas.berta, 'leads_papelera_enviar', {
    p_lote: crypto.randomUUID(),
    p_leads: [lead.id],
  })
  expect(envio.error).toBeNull()
  await irAFicha(page, lead.id)
  await expect(page.getByText(NO_DISPONIBLE).first()).toBeVisible()
  expect(await page.content()).not.toContain(lead.nombre)
})

test('desde el «⋯» de la fila: se envía, sale del listado y «Deshacer» lo devuelve', async ({
  page,
}, info) => {
  const corto = `Fila papelera ${info.project.name}`
  const lead = await deBerta(corto)
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await expect(fila(page, corto)).toBeVisible()
  const menu = await abrirMenuDeFila(page, corto)
  await menu.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  await expect(page.getByText(`«${nombre(corto)}» se envió a la papelera.`)).toBeVisible()
  await expect(fila(page, corto)).toHaveCount(0)
  expect((await estadoDeLead(lead.id))?.eliminado_en).not.toBeNull()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText(`«${nombre(corto)}» volvió a tus leads.`)).toBeVisible()
  await expect(fila(page, corto)).toBeVisible()
  expect((await estadoDeLead(lead.id))?.eliminado_en).toBeNull()
})

test('la papelera: quien envió restaura lo suyo y no ve «Purgar»; quien puede, purga con confirmación', async ({
  page,
  browser,
}, info) => {
  const a = await deBerta(`Papelera A ${info.project.name}`)
  const b = await deBerta(`Papelera B ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irALeads(page)
  // Los manda en un lote por la RPC, con la sesión de Berta (la pantalla envía de a uno).
  const envio = await rpcComo(t.personas.berta, 'leads_papelera_enviar', {
    p_lote: crypto.randomUUID(),
    p_leads: [a.id, b.id],
  })
  expect(envio.error).toBeNull()
  await page.goto('/leads/papelera')
  await expect(page.getByRole('heading', { name: 'Papelera de leads', level: 1 })).toBeVisible()
  const lote = loteDe(page, a.nombre)
  await expect(lote).toContainText('Lote de 2')
  await expect(lote).toContainText(b.nombre)
  // Nunca un teléfono: sólo el nombre y el número.
  expect(await page.content()).not.toContain(a.telefono)
  await expect(page.getByRole('button', { name: /^Purgar/ })).toHaveCount(0)
  await page.getByRole('button', { name: `Restaurar ${a.nombre}` }).click()
  await expect(page.getByText(`«${a.nombre}» volvió a tus leads.`)).toBeVisible()
  expect((await estadoDeLead(a.id))?.eliminado_en).toBeNull()
  // Quien puede vaciarla ve lo de todos y lo purga, nombrando lo que se borra.
  const otra = await browser.newPage()
  await entrar(otra, purgadora.email)
  await otra.goto('/leads/papelera')
  await expect(otra.getByText(b.nombre)).toBeVisible()
  await otra.getByRole('button', { name: `Purgar ${b.nombre}` }).click()
  const dialogo = otra.getByRole('dialog', { name: `Purgar «${b.nombre}»` })
  await expect(dialogo).toBeVisible()
  await dialogo.getByRole('button', { name: 'Purgar', exact: true }).click()
  await expect(otra.getByText(`«${b.nombre}» se purgó.`)).toBeVisible()
  expect(await estadoDeLead(b.id)).toBeNull()
  await otra.context().close()
  expect((await lotesDeLeads()).length).toBeGreaterThan(0)
})

test('restaurar con el teléfono tomado: queda adentro y dice por qué', async ({ page }, info) => {
  const original = await deBerta(`Teléfono tomado ${info.project.name}`)
  await entrar(page, t.personas.berta)
  const envio = await rpcComo(t.personas.berta, 'leads_papelera_enviar', {
    p_lote: crypto.randomUUID(),
    p_leads: [original.id],
  })
  expect(envio.error).toBeNull()
  // Otro lead (de Berta) toma el número mientras el primero está en la papelera.
  const tomador = await nuevoLead({
    corto: `Quien lo tomó ${info.project.name}`,
    telefono: original.telefono,
    deQuien: t.personas.berta,
  })
  await page.goto('/leads/papelera')
  await expect(page.getByText(original.nombre)).toBeVisible()
  await expect(
    page.getByText(
      `No puede volver: «${tomador.nombre}» (tu n.º ${String(tomador.numeroPropio)}) ya tiene este teléfono.`,
    ),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: `Restaurar ${original.nombre}` })).toBeDisabled()
  expect((await estadoDeLead(original.id))?.eliminado_en).not.toBeNull()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin permiso: la papelera no abre, no hay enlace y el «⋯» de la ficha no ofrece enviar', async ({
  page,
}, info) => {
  const lead = await deBerta(`Sin permiso papelera ${info.project.name}`)
  await entrar(page, t.personas.sinCrear)
  await page.goto('/leads/papelera')
  await expect(
    page.getByText('No tienes permiso para enviar leads a la papelera ni para vaciarla.'),
  ).toBeVisible()
  await irALeads(page)
  await expect(page.getByRole('link', { name: 'Papelera' })).toHaveCount(0)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  // El «⋯» de la ficha tiene las marcas (basta con ver el lead), pero no «Enviar a la papelera».
  await menuDeFicha(page, lead.nombre).click()
  await expect(page.getByRole('menuitem', { name: 'Etiquetas…' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Enviar a la papelera' })).toHaveCount(0)
})

const PREFIJOS_DE_LOTE: Record<string, string> = { Lote200: '1', Lote30: '2', Lote25: '3' }

// Un lote de `n` leads de Berta, sembrado por SQL (el trigger arma su cartera) y enviado a la papelera con su sesión.
async function loteDeBerta(
  n: number,
  marca: string,
  proyecto: string,
): Promise<{ lote: string; nombres: string[] }> {
  const dueno = await idDe(t.personas.berta)
  // Un prefijo por lote y por proyecto: los teléfonos no chocan con los de otro lote ni con los del otro proyecto.
  const prefijoTel = `5917${PREFIJOS_DE_LOTE[marca] ?? '0'}${proyecto === 'movil' ? '9' : '8'}`
  const ids = sql(`insert into public.leads (nombre, telefono_principal, creado_por)
                   select 'E2E ' || ${literal(marca)} || ' ' || lpad(g::text, 3, '0') || ' ' || ${literal(proyecto)},
                          ${literal(prefijoTel)} || lpad(g::text, 5, '0'), ${literal(dueno)}
                     from generate_series(1, ${String(n)}) g returning id`).split('\n')
  const lote = crypto.randomUUID()
  const envio = await rpcComo(t.personas.berta, 'leads_papelera_enviar', {
    p_lote: lote,
    p_leads: ids,
  })
  expect(envio.error).toBeNull()
  const nombres = Array.from(
    { length: n },
    (_, i) => `E2E ${marca} ${String(i + 1).padStart(3, '0')} ${proyecto}`,
  )
  return { lote, nombres }
}

// Cierre 1: un lote muestra sus primeros 20; «Mostrar los N» trae el resto desde el navegador.
test('un lote de 200 muestra los primeros 20 y «Mostrar los 200»; restaurar uno de abajo vuelve a los primeros', async ({
  page,
}, info) => {
  const { nombres } = await loteDeBerta(200, 'Lote200', info.project.name)
  await entrar(page, t.personas.berta)
  await page.goto('/leads/papelera')
  const lote = loteDe(page, nombres[0] ?? '')
  await expect(lote).toContainText('Lote de 200')
  await expect(lote.locator('li')).toHaveCount(20)
  await capturar(page, info, 'papelera-lote-de-200')
  await lote.getByRole('button', { name: 'Mostrar los 200' }).click()
  await expect(lote.locator('li')).toHaveCount(200)
  const ultimo = nombres[199] ?? ''
  await page.getByRole('button', { name: `Restaurar ${ultimo}` }).click()
  await expect(page.getByText(`«${ultimo}» volvió a tus leads.`)).toBeVisible()
  // La página se volvió a leer: el lote vuelve a sus primeros 20 y ahora son 199.
  await expect(lote).toContainText('quedan 199')
  await expect(lote.locator('li')).toHaveCount(20)
  await expect(lote.getByRole('button', { name: 'Mostrar los 199' })).toBeVisible()
})

test('«Mostrar los N» sin red lo dice y reintenta; si el lote se purgó mientras se miraba, lo dice y recarga', async ({
  page,
  context,
}, info) => {
  const { lote: id, nombres } = await loteDeBerta(30, 'Lote30', info.project.name)
  await entrar(page, t.personas.berta)
  await page.goto('/leads/papelera')
  const lote = loteDe(page, nombres[0] ?? '')
  await expect(lote.locator('li')).toHaveCount(20)
  await context.setOffline(true)
  await lote.getByRole('button', { name: 'Mostrar los 30' }).click()
  await expect(lote.getByText(/conexión|servidor/)).toBeVisible()
  await context.setOffline(false)
  await lote.getByRole('button', { name: 'Reintentar' }).click()
  await expect(lote.locator('li')).toHaveCount(30)
  // Otro lote igual, y lo purgan mientras se mira (el lote queda sellado como lo deja una purga).
  const otro = await loteDeBerta(25, 'Lote25', info.project.name)
  await page.reload()
  const segundo = loteDe(page, otro.nombres[0] ?? '')
  await expect(segundo.locator('li')).toHaveCount(20)
  sql(`update public.lotes_papelera set purgado_en = now() where id = ${literal(otro.lote)}`)
  await segundo.getByRole('button', { name: 'Mostrar los 25' }).click()
  await expect(segundo.getByText('Ese lote ya no está en la papelera.')).toBeVisible()
  await segundo.getByRole('button', { name: 'Recargar' }).click()
  await expect(page.getByText(otro.nombres[0] ?? '')).toHaveCount(0)
  expect(id).not.toBe(otro.lote)
})
