import { expect, test } from './soporte/prueba'
import { formatearNumero } from '../src/shared/lib/formato'
import { entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead, tituloDeLaFicha } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { embudoPorDefecto, etapa, muchasOportunidades } from './soporte/leads-oportunidades'
import {
  PRESUPUESTO_DE_LA_FICHA_CON_10_OPORTUNIDADES_EN_KB,
  PRESUPUESTO_DE_LA_FICHA_CON_TODAS_EN_KB,
} from './soporte/presupuestos'

// La sección «Oportunidades» de la ficha muestra las 10 más recientes y «Ver todas» (`?todas=1`) trae las que lee la base, hasta 100
// (cierre 5b). Lo que no se ve no viaja con el documento de la ficha. El resto de la sección va en `leads-oportunidades.spec.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Un lead de Berta con `cantidad` oportunidades, y su ficha en «Oportunidades» como ella.
async function leadConOportunidades(
  page: Parameters<typeof irAFicha>[0],
  corto: string,
  cantidad: number,
) {
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  if (cantidad > 0) {
    const embudo = await embudoPorDefecto(t.personas.berta)
    await muchasOportunidades({
      usuarioId: await idDe(t.personas.berta),
      leadId: lead.id,
      embudo,
      etapaId: etapa(embudo, 'Nuevo'),
      cantidad,
    })
  }
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?seccion=oportunidades')
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  return lead
}

const items = (page: Parameters<typeof irAFicha>[0]) => page.getByRole('article')

test('con 12: se ven 10 con «Ver todas», que trae las 12 y se puede volver a las 10', async ({
  page,
}, info) => {
  const lead = await leadConOportunidades(page, `VerTodas ${info.project.name}`, 12)
  await expect(items(page)).toHaveCount(10)
  await expect(
    page.getByText('Mostrando las 10 más recientes, las abiertas primero.'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Ver todas' }).click()
  await expect(page).toHaveURL(new RegExp(`/leads/${lead.id}\\?seccion=oportunidades&todas=1`))
  await expect(items(page)).toHaveCount(12)
  await expect(page.getByText('Mostrando las 12, las abiertas primero.')).toBeVisible()
  await page.getByRole('link', { name: 'Ver sólo las 10 más recientes' }).click()
  await expect(items(page)).toHaveCount(10)
  // «Atrás» también vuelve: la URL es el estado.
  await page.goBack()
  await expect(items(page)).toHaveCount(12)
})

test('con 10 o menos no hay nada que ver: sin aviso ni «Ver todas»', async ({ page }, info) => {
  await leadConOportunidades(page, `Diez ${info.project.name}`, 10)
  await expect(items(page)).toHaveCount(10)
  await expect(page.getByRole('link', { name: 'Ver todas' })).toHaveCount(0)
  await expect(page.getByText(/Mostrando las/)).toHaveCount(0)
})

test('con más de 100: el documento pesa lo de 10 aunque haya 105, y «Ver todas» llega a 100 y lo dice', async ({
  page,
}, info) => {
  const lead = await leadConOportunidades(page, `Cien ${info.project.name}`, 105)
  await expect(items(page)).toHaveCount(10)
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const documento = async (ruta: string) =>
    (await (await page.goto(ruta))?.body())?.toString() ?? ''
  const base = (await documento('/perfil')).length
  const conDiez = (await documento(`/leads/${lead.id}?seccion=oportunidades`)).length - base
  const conTodas =
    (await documento(`/leads/${lead.id}?seccion=oportunidades&todas=1`)).length - base
  const resumen = `con 105 oportunidades la sección aporta ${kb(conDiez)} KB (se ven 10) y ${kb(conTodas)} KB con «Ver todas» (100)`
  console.warn(`[ficha] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'ficha con 105 oportunidades', description: resumen })
  // Cada oportunidad pesa ~3,5 KB en el documento: 10 a la vista tienen su presupuesto (el de la ficha está medido con las 3 de la semilla)
  // y «Ver todas», una acción de quien lo pide, el suyo. Con las 100 a la vista por defecto, cada visita habría pagado el segundo.
  expect(conDiez).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_CON_10_OPORTUNIDADES_EN_KB * 1024)
  expect(conTodas).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_CON_TODAS_EN_KB * 1024)

  await page.goto(`/leads/${lead.id}?seccion=oportunidades&todas=1`)
  await expect(items(page)).toHaveCount(100)
  await expect(
    page.getByText('Mostrando las 100 más recientes, las abiertas primero.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver sólo las 10 más recientes' })).toBeVisible()
})
