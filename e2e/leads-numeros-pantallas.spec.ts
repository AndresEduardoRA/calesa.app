import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from './soporte/prueba'
import { abrirConN, dialogo, entrar as entrarComo } from './soporte/alta'
import { admin } from './soporte/base'
import { aLaVista } from './soporte/inventario'
import { exigir, vincular } from './soporte/leads'
import { irAFicha } from './soporte/leads-ficha'
import { rpcComo } from './soporte/leads-cartera'
import { delLead, fila, irALeads } from './soporte/leads-listado'
import { quieto } from './soporte/recorrido'
import {
  embudoPorDefecto,
  irAlEmbudo,
  oportunidad,
  tarjeta,
  verEtapa,
} from './soporte/leads-oportunidades'
import { loteDe } from './soporte/leads-papelera'
import { compartirCon, vehiculoDe } from './soporte/leads-vehiculos'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import {
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  sinScrollHorizontal,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'
import { borrarVehiculosDe } from './soporte/vehiculos'
import { formatearNumero } from '../src/shared/lib/formato'

// El resto de las pantallas que dibujan el número de un lead (9f-2), con la dueña (con
// `leads.numero_global.ver`) y con Ana, la asesora de la semilla (sin él): el kanban, la papelera, el
// vehículo con su lead vinculado, la búsqueda «#n» y el archivo exportado. El listado, la ficha y el drawer
// están en `leads-numeros-recorrido.spec.ts`. Capturas: `E2E_CAPTURAS=e2e-capturas/9f-2b`.
//
// 9g: la dueña mira un lead que creó Ana en cada superficie y **nunca** lee «Tu n.º» (el 2 era de Ana): el propio
// de otra persona lleva su nombre o no se dice. También con el nombre de Ana en blanco.
test.describe.configure({ mode: 'serial' })

const GLOBAL = 7_654_321
const PROPIO = 123_456
const escrito = (n: number) => formatearNumero(n, { decimales: 0 })
const CLAVE_DEL_ORIGEN = 'numeros_pant'

let r: TerrenoDelRecorrido
let proyecto = ''
let vehiculoId = ''
let titulo = ''
let tituloDeLaOportunidad = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  r = await prepararRecorrido(proyecto, 'Pantallas')
  const copias = (tabla: string, numero: number) =>
    admin().from(tabla).update({ numero }).eq('lead_id', r.uno.id)
  expect((await copias('leads_numeros_globales', GLOBAL)).error).toBeNull()
  expect((await copias('leads_numeros_propios', PROPIO)).error).toBeNull()

  // La dueña tiene el lead de Ana en su cartera (compartido): así puede abrir una oportunidad y ver su vínculo.
  await compartirCon(r.uno.id, r.t.personas.duena, r.ana.email)
  tituloDeLaOportunidad = `Op Pantallas ${proyecto}`
  await embudoPorDefecto(r.ana.email)
  await embudoPorDefecto(r.t.personas.duena)
  await oportunidad(r.ana.email, r.uno.id, { titulo: tituloDeLaOportunidad })
  await oportunidad(r.t.personas.duena, r.uno.id, { titulo: tituloDeLaOportunidad })

  const origen = await crearOrigenDePrueba('Origen Números', CLAVE_DEL_ORIGEN)
  titulo = `Numeros Vehiculo ${proyecto}`
  vehiculoId = await vehiculoDe(origen.id, titulo, r.t.personas.duena)
  await vincular(vehiculoId, r.uno.id)
})

test.afterAll(async () => {
  await borrarVehiculosDe([`${PREFIJO_CLAVE_E2E}${CLAVE_DEL_ORIGEN}`])
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${CLAVE_DEL_ORIGEN}`])
  await limpiarRecorrido(r)
})

// Una persona por vez en la misma página: sin esto el contexto conserva la sesión de la anterior.
async function entrar(page: Page, correo: string): Promise<void> {
  await page.context().clearCookies()
  await entrarComo(page, correo)
}

const busqueda = (texto: string) => `?${new URLSearchParams({ q: texto }).toString()}`
const nombreCorto = () => `Pantallas Uno ${proyecto}`
// Nada que la dueña lea dice «Tu n.º»: los propios que ve son de otras personas.
const sinTu = (lugar: Pick<Page, 'getByText'>) => expect(lugar.getByText(/Tu n\.º/)).toHaveCount(0)

async function laEtapaDeLaTarjeta(page: Parameters<typeof verEtapa>[0], email: string) {
  const embudo = await embudoPorDefecto(email)
  const inicial = embudo.etapas[0]?.nombre ?? ''
  return verEtapa(page, inicial)
}

test('A · el kanban: la tarjeta lleva el número que cada quien ve', async ({ page }, info) => {
  await entrar(page, r.t.personas.duena)
  await irAlEmbudo(page)
  await laEtapaDeLaTarjeta(page, r.t.personas.duena)
  const deLaDuena = tarjeta(page, tituloDeLaOportunidad)
  await expect(deLaDuena).toBeVisible()
  await expect(deLaDuena.getByText(`N.º ${escrito(GLOBAL)}`)).toBeVisible()
  await sinTu(page)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-kanban')

  await entrar(page, r.ana.email)
  await irAlEmbudo(page)
  await laEtapaDeLaTarjeta(page, r.ana.email)
  const deAna = tarjeta(page, tituloDeLaOportunidad)
  await expect(deAna).toBeVisible()
  await expect(deAna.getByText(`Tu n.º ${escrito(PROPIO)}`)).toBeVisible()
  await expect(page.getByText(escrito(GLOBAL))).toHaveCount(0)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'asesora-kanban')
})

test('B · la papelera: el lote nombra al lead con su número', async ({ page }, info) => {
  const envio = await rpcComo(r.ana.email, 'leads_papelera_enviar', {
    p_lote: crypto.randomUUID(),
    p_leads: [r.dos.id],
  })
  expect(envio.error).toBeNull()

  await entrar(page, r.ana.email)
  await page.goto('/leads/papelera')
  const delLote = loteDe(page, r.dos.nombre)
  await expect(delLote).toBeVisible()
  await expect(delLote.getByText(`Tu n.º ${escrito(r.dos.numeroPropio)}`)).toBeVisible()
  // El global no está: el texto exacto «N.º <n>» (una subcadena como «20» chocaría con otras cifras de la pantalla).
  await expect(
    delLote.getByText(new RegExp(`(^|\\s)N\\.º ${escrito(r.dos.numero)}(\\s|$)`)),
  ).toHaveCount(0)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'asesora-papelera')

  await entrar(page, r.t.personas.duena)
  await page.goto('/leads/papelera')
  const delLoteDeLaDuena = loteDe(page, r.dos.nombre)
  await expect(delLoteDeLaDuena).toBeVisible()
  await expect(delLoteDeLaDuena.getByText(`N.º ${escrito(r.dos.numero)}`)).toBeVisible()
  // El propio de Ana no es «tu» número: la papelera no lo dibuja (no trae quién lo creó).
  await sinTu(page)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-papelera')
})

test('C · el vehículo con un lead vinculado nombra al lead con su número', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await page.goto(`/vehiculos/${vehiculoId}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  const vinculo = aLaVista(page.getByRole('region', { name: 'Vínculo', exact: true }))
  await expect(vinculo.getByText(r.uno.nombre)).toBeVisible()
  await expect(vinculo.getByText(`N.º ${escrito(GLOBAL)}`)).toBeVisible()
  await sinTu(page)
  await vinculo.scrollIntoViewIfNeeded()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-vehiculo')

  await entrar(page, r.ana.email)
  await page.goto(`/vehiculos/${vehiculoId}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
  const suyo = aLaVista(page.getByRole('region', { name: 'Vínculo', exact: true }))
  await expect(suyo.getByText(`Tu n.º ${escrito(PROPIO)}`)).toBeVisible()
  await expect(suyo.getByText(escrito(GLOBAL))).toHaveCount(0)
  expect(await page.content()).not.toContain(String(GLOBAL))
  await suyo.scrollIntoViewIfNeeded()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'asesora-vehiculo')
})

test('D · la búsqueda «#n» encuentra por el número que cada quien ve', async ({ page }, info) => {
  await entrar(page, r.t.personas.duena)
  await irALeads(page, `${busqueda(`#${String(GLOBAL)}`)}&alcance=todos`)
  await expect(fila(page, nombreCorto())).toBeVisible()
  await expect(delLead(page, nombreCorto()).getByText(`N.º ${escrito(GLOBAL)}`)).toBeVisible()
  await sinTu(page)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-busqueda')

  await entrar(page, r.ana.email)
  await irALeads(page, busqueda(`#${String(PROPIO)}`))
  await expect(fila(page, nombreCorto())).toBeVisible()
  await expect(delLead(page, nombreCorto()).getByText(`Tu n.º ${escrito(PROPIO)}`)).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'asesora-busqueda')
})

test('E · el archivo exportado: la dueña lleva las dos columnas; quien no puede exportar, nada', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  const exportado = await page.request.post('/leads/exportar', {
    data: { consulta: `q=${encodeURIComponent(nombreCorto())}`, delimitador: ';' },
  })
  expect(exportado.status()).toBe(200)
  const csv = await exportado.text()
  const lineas = csv.split('\r\n')
  expect(lineas[0]?.startsWith('﻿N.º;N.º propio;N.º propio de;Nombre;')).toBe(true)
  const del = lineas.find((l) => l.includes(r.uno.nombre)) ?? ''
  // «N.º propio» es el de Ana: el archivo dice de quién, no lo deja pasar por el de quien exporta.
  expect(
    del.startsWith(`${String(GLOBAL)};${String(PROPIO)};${r.ana.nombre};${r.uno.nombre};`),
  ).toBe(true)
  expect(csv).not.toContain('Tu n.º')
  const carpeta = join(process.env['E2E_CAPTURAS'] ?? '', info.project.name)
  if (process.env['E2E_CAPTURAS']) {
    mkdirSync(carpeta, { recursive: true })
    writeFileSync(join(carpeta, 'leads-numeros-pantallas-exportado-duena.csv'), csv)
  }

  // Ana no tiene `leads.exportar`: la base y la ruta dicen que no, y el número global no viaja en nada.
  await entrar(page, r.ana.email)
  const sin = await page.request.post('/leads/exportar', {
    data: { consulta: `q=${encodeURIComponent(nombreCorto())}`, delimitador: ';' },
  })
  expect(sin.status()).toBe(403)
  expect(await sin.text()).not.toContain(String(GLOBAL))
})

test('F · la dueña mira un lead de Ana: el propio lleva su nombre; con el nombre en blanco, «Otra persona», nunca «Tu»', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await irALeads(page, `${busqueda(nombreCorto())}&alcance=todos`)
  await expect(fila(page, nombreCorto())).toBeVisible()
  await sinTu(page)
  await fila(page, nombreCorto()).click()
  const drawer = page.getByRole('dialog', { name: r.uno.nombre })
  await expect(
    drawer.getByText(new RegExp(`N\\.º ${escrito(PROPIO)} · ${r.ana.nombre}`)),
  ).toBeVisible()
  await sinTu(drawer)
  await irAFicha(page, r.uno.id)
  await expect(
    page.getByText(new RegExp(`N\\.º ${escrito(PROPIO)} · ${r.ana.nombre}`)).first(),
  ).toBeVisible()
  await sinTu(page)

  // El nombre de Ana en blanco: antes la pantalla leía «sin nombre» como «es tuyo».
  const quitar = await admin().from('perfiles').update({ nombre: '' }).eq('email', r.ana.email)
  exigir(quitar.error, 'dejar a Ana sin nombre')
  try {
    await page.reload()
    await expect(
      page.getByText(new RegExp(`N\\.º ${escrito(PROPIO)} · Otra persona`)).first(),
    ).toBeVisible()
    await sinTu(page)
    await capturar(page, info, 'duena-ficha-sin-nombre')
    await irALeads(page, `${busqueda(nombreCorto())}&alcance=todos`)
    await fila(page, nombreCorto()).click()
    const delDrawer = page.getByRole('dialog', { name: r.uno.nombre })
    await expect(
      delDrawer.getByText(new RegExp(`N\\.º ${escrito(PROPIO)} · Otra persona`)),
    ).toBeVisible()
    await quieto(delDrawer)
    await sinTu(page)
    await capturar(page, info, 'duena-drawer-sin-nombre')
  } finally {
    const reponer = await admin()
      .from('perfiles')
      .update({ nombre: r.ana.nombre })
      .eq('email', r.ana.email)
    exigir(reponer.error, 'reponer el nombre de Ana')
  }
})

test('G · el aviso «ya existe» del alta nombra el lead con el número que la dueña ve, sin «Tu»', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await irALeads(page, '')
  await abrirConN(page)
  const panel = dialogo(page)
  // El campo recibe el número nacional: con el prefijo del país escrito lo tomaría por parte del número.
  const prefijo = r.t.codigo.replace(/\D/g, '')
  const nacional = r.uno.telefono.startsWith(prefijo)
    ? r.uno.telefono.slice(prefijo.length)
    : r.uno.telefono
  await panel.getByLabel('Teléfono principal').fill(nacional)
  // El número es el que la base resolvió para la dueña (no el que se fijó en las copias): lo que importa es «N.º», no «Tu n.º».
  const aviso = panel.getByText(new RegExp(`Ya existe: ${r.uno.nombre} \\(N\\.º [\\d.]+\\)`))
  await expect(aviso).toBeVisible()
  await sinTu(panel)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-alta-existe')
})
