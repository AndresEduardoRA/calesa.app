import { expect, test, type Page } from './soporte/prueba'
import { entrar as entrarComo } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import {
  AJENO_CARLOS,
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

// 5a-35: un número de 3 o más dígitos escrito sin «#» (482, 4821) busca el nombre **y** el número, y se pide a la base como el texto «482» más el lead
// que tiene ese número (`extra`). `leads_candidatos()` descartaba siempre ese lead cuando el pedido no traía etiquetas (`v_con_etiquetas` nulo), así
// que sólo aparecía si algún nombre contenía los dígitos. Acá ningún nombre los contiene: el número propio de Berta es 482, el de la dueña 4821 y el
// global de Carlos 5127. Con 1 o 2 dígitos (30, 31) no pasa por los candidatos y lo prueba `leads-busqueda-numero-ajeno.spec.ts`.
// Capturas: `E2E_CAPTURAS=e2e-capturas/4-03b/{antes,despues}`.
test.describe.configure({ mode: 'serial' })

const PROPIO_DE_BERTA = 482
const PROPIO_DE_LA_DUENA = 4821
const GLOBAL_DE_CARLOS = 5127

let t: TerrenoDelListado
let nombreDeBerta = ''

async function idDelLead(corto: string): Promise<string> {
  const { data, error } = await admin()
    .from('leads')
    .select('id')
    .eq('nombre', nombre(corto))
    .single<{ id: string }>()
  exigir(error, `leer el lead ${corto}`)
  return data?.id ?? ''
}

async function fijar(
  tabla: 'leads_numeros_propios' | 'leads_numeros_globales',
  corto: string,
  numero: number,
) {
  const { error } = await admin()
    .from(tabla)
    .update({ numero })
    .eq('lead_id', await idDelLead(corto))
  exigir(error, `fijar el número de ${corto}`)
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  await fijar('leads_numeros_propios', PROPIO_BERTA, PROPIO_DE_BERTA)
  await fijar('leads_numeros_propios', PROPIO_DALIA, PROPIO_DE_LA_DUENA)
  await fijar('leads_numeros_globales', AJENO_CARLOS, GLOBAL_DE_CARLOS)
  const { data, error } = await admin()
    .from('perfiles')
    .select('nombre')
    .eq('email', t.personas.berta)
    .single<{ nombre: string }>()
  exigir(error, 'leer el nombre de Berta')
  nombreDeBerta = data?.nombre ?? ''
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Una persona por vez en la misma página: sin esto el contexto conserva la sesión de la anterior.
async function entrar(page: Page, correo: string): Promise<void> {
  await page.context().clearCookies()
  await entrarComo(page, correo)
}

// El número puede escribirse con separador de miles según el idioma: 4821 o 4.821.
const coincide = (resto: string) => new RegExp(`Coincide:\\s*${resto}`)
const listo = (page: Page, corto: string) => fila(page, corto).or(sinResultados(page))

test('A · la dueña buscando 482 (3 dígitos, sin «#») ve el lead de Berta y por qué coincidió', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, `${buscar(String(PROPIO_DE_BERTA))}&alcance=todos`)
  await expect(listo(page, PROPIO_BERTA)).toBeVisible()
  await capturar(page, info, 'duena-busca-482')
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(
    delLead(page, PROPIO_BERTA).getByText(coincide(`N\\.º ${PROPIO_DE_BERTA} · ${nombreDeBerta}`)),
  ).toBeVisible()
  await sinScrollHorizontal(page)
})

test('B · con 4 dígitos (4821), el propio de la dueña se explica con «Tu n.º»', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, `${buscar(String(PROPIO_DE_LA_DUENA))}&alcance=todos`)
  await expect(listo(page, PROPIO_DALIA)).toBeVisible()
  await capturar(page, info, 'duena-busca-4821')
  await expect(fila(page, PROPIO_DALIA)).toBeVisible()
  await expect(delLead(page, PROPIO_DALIA).getByText(coincide('Tu n\\.º 4\\.?821'))).toBeVisible()
  await sinScrollHorizontal(page)
})

test('C · el número global de otro lead (5127) también se encuentra sin «#»', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, `${buscar(String(GLOBAL_DE_CARLOS))}&alcance=todos`)
  await expect(listo(page, AJENO_CARLOS)).toBeVisible()
  await capturar(page, info, 'duena-busca-global-5127')
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  await sinScrollHorizontal(page)
})

test('D · Berta buscando 482 ve su lead como «Tu n.º 482»', async ({ page }, info) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, buscar(String(PROPIO_DE_BERTA)))
  await expect(listo(page, PROPIO_BERTA)).toBeVisible()
  await capturar(page, info, 'berta-busca-482')
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(
    delLead(page, PROPIO_BERTA).getByText(`Tu n.º ${PROPIO_DE_BERTA}`, { exact: true }),
  ).toBeVisible()
  await sinScrollHorizontal(page)
})

test('E · sin oráculo: quien no ve el lead no lo encuentra por su número, de 3 ni de 4 dígitos', async ({
  page,
}, info) => {
  await entrar(page, t.personas.carlos)
  for (const numero of [PROPIO_DE_BERTA, PROPIO_DE_LA_DUENA]) {
    await irALeads(page, buscar(String(numero)))
    await expect(sinResultados(page)).toBeVisible()
    await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)
    await expect(fila(page, PROPIO_DALIA)).toHaveCount(0)
  }
  await capturar(page, info, 'carlos-busca-4821')
})
