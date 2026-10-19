import { expect, test, type Page } from './soporte/prueba'
import { entrar as entrarComo } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import {
  PROPIO_BERTA,
  PROPIO_DALIA,
  buscar,
  delLead,
  fila,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  sinResultados,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { formatearNumero } from '../src/shared/lib/formato'

// Buscar un número con `leads.numero_global.ver` encuentra el global **y** los leads de cualquier creador con ese
// número propio (los que la persona ya ve). La dueña escribe 30 y ve el lead de Berta, que es su n.º propio 30 (su global
// es otro), con una línea que dice por qué coincidió; Berta, buscando 30, sigue viéndolo como «Tu n.º 30». Sin el permiso
// nada cambia. Corre en los dos proyectos: la línea tiene que caber al 100 % y al 200 % del texto, también en el celular.
// Capturas: `E2E_CAPTURAS=e2e-capturas/busqueda-numero-ajeno/{antes,despues}`.
test.describe.configure({ mode: 'serial' })

const PROPIO_DE_BERTA = 30
const PROPIO_DE_LA_DUENA = 31
const NOMBRE_LARGO =
  'Bertaconunnombremuylargoquenotienedondepartirsesinromperlacajadelalinea'.padEnd(80, 'x')

const escrito = (n: number) => formatearNumero(n, { decimales: 0 })

let t: TerrenoDelListado
let nombreDeBerta = ''

async function fijarElPropio(leadId: string, numero: number): Promise<void> {
  const { error } = await admin()
    .from('leads_numeros_propios')
    .update({ numero })
    .eq('lead_id', leadId)
  exigir(error, 'fijar el número propio de la copia')
}

async function idDelLead(corto: string): Promise<string> {
  const { data, error } = await admin()
    .from('leads')
    .select('id')
    .eq('nombre', nombre(corto))
    .single<{ id: string }>()
  exigir(error, `leer el lead ${corto}`)
  return data?.id ?? ''
}

async function nombrarA(email: string, nombre: string): Promise<void> {
  const { error } = await admin().from('perfiles').update({ nombre }).eq('email', email)
  exigir(error, 'renombrar a la persona')
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  await fijarElPropio(await idDelLead(PROPIO_BERTA), PROPIO_DE_BERTA)
  await fijarElPropio(await idDelLead(PROPIO_DALIA), PROPIO_DE_LA_DUENA)
  const { data, error } = await admin()
    .from('perfiles')
    .select('nombre')
    .eq('email', t.personas.berta)
    .single<{ nombre: string }>()
  exigir(error, 'leer el nombre de Berta')
  nombreDeBerta = data?.nombre ?? ''
})

test.afterAll(async () => {
  if (nombreDeBerta !== '') await nombrarA(t.personas.berta, nombreDeBerta)
  await limpiarListado(t)
})

// Una persona por vez en la misma página: sin esto el contexto conserva la sesión de la anterior.
async function entrar(page: Page, correo: string): Promise<void> {
  await page.context().clearCookies()
  await entrarComo(page, correo)
}

const coincide = (resto: string) => new RegExp(`Coincide:\\s*${resto}`)
// Lo que la lista dejó listo para mirar: el lead o el vacío.
const listo = (page: Page, corto: string) => fila(page, corto).or(sinResultados(page))

test('A · la dueña buscando 30 ve el lead de Berta y por qué coincidió', async ({ page }, info) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, `${buscar(String(PROPIO_DE_BERTA))}&alcance=todos`)
  await expect(listo(page, PROPIO_BERTA)).toBeVisible()
  await capturar(page, info, 'duena-busca-30')

  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  const delLeadDeBerta = delLead(page, PROPIO_BERTA)
  // Su principal sigue siendo el global; el propio de Berta se explica aparte, con su nombre.
  await expect(
    delLeadDeBerta.getByText(`N.º ${escrito(t.numeroDeBerta)}`, { exact: true }),
  ).toBeVisible()
  await expect(
    delLeadDeBerta.getByText(coincide(`N\\.º ${String(PROPIO_DE_BERTA)} · ${nombreDeBerta}`)),
  ).toBeVisible()
  await expect(page.getByText(/Tu n\.º/)).toHaveCount(0)
  await sinScrollHorizontal(page)

  // Con «#» es lo mismo.
  await irALeads(page, `${buscar(`#${String(PROPIO_DE_BERTA)}`)}&alcance=todos`)
  await expect(
    delLead(page, PROPIO_BERTA).getByText(
      coincide(`N\\.º ${String(PROPIO_DE_BERTA)} · ${nombreDeBerta}`),
    ),
  ).toBeVisible()
})

test('B · si el propio que coincide es de la dueña, lo dice con «Tu n.º»', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, `${buscar(String(PROPIO_DE_LA_DUENA))}&alcance=todos`)
  await expect(listo(page, PROPIO_DALIA)).toBeVisible()
  await capturar(page, info, 'duena-busca-31')
  await expect(
    delLead(page, PROPIO_DALIA).getByText(coincide(`Tu n\\.º ${String(PROPIO_DE_LA_DUENA)}`)),
  ).toBeVisible()
  // Los propios de otras personas con ese 31 (si los hay) no se confunden con los suyos.
  await sinScrollHorizontal(page)
})

test('C · Berta buscando 30 sigue viendo su lead, como «Tu n.º 30» y sin explicación', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, buscar(String(PROPIO_DE_BERTA)))
  await expect(listo(page, PROPIO_BERTA)).toBeVisible()
  await capturar(page, info, 'berta-busca-30')
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(
    delLead(page, PROPIO_BERTA).getByText(`Tu n.º ${String(PROPIO_DE_BERTA)}`, { exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/Coincide:/)).toHaveCount(0)
  await sinScrollHorizontal(page)
})

test('D · sin el permiso no hay cambio ni oráculo: el 30 de Berta no sale para otra asesora', async ({
  page,
}) => {
  await entrar(page, t.personas.carlos)
  await irALeads(page, buscar(String(PROPIO_DE_BERTA)))
  await expect(listo(page, PROPIO_BERTA)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)
  await expect(page.getByText(/Coincide:/)).toHaveCount(0)
})

test('E · al 200 %: con un nombre de 80 letras la explicación baja de línea y no ensancha la página', async ({
  page,
}, info) => {
  await nombrarA(t.personas.berta, NOMBRE_LARGO)
  try {
    await entrar(page, t.personas.duena)
    await irALeads(page, `${buscar(String(PROPIO_DE_BERTA))}&alcance=todos`)
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    const delLeadDeBerta = delLead(page, PROPIO_BERTA)
    await expect(delLeadDeBerta).toBeVisible()
    await expect(
      delLeadDeBerta.getByText(coincide(`N\\.º ${String(PROPIO_DE_BERTA)} · ${NOMBRE_LARGO}`)),
    ).toBeVisible()
    await sinScrollHorizontal(page)
    // Al 200 % la fila queda bajo los controles de la barra: se trae a la vista para mirarla.
    await delLeadDeBerta.scrollIntoViewIfNeeded()
    await capturar(page, info, 'duena-busca-30-200')
  } finally {
    await nombrarA(t.personas.berta, nombreDeBerta)
  }
})
