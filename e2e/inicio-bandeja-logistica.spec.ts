import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarDocumentos, sembrarDocumentos, type TerrenoDeDocumentos } from './soporte/documentos'

// La bandeja de logística en Inicio (6.12-2): sobre el terreno de documentos, la fase B pasa a alertar con 1 día, la unidad en B lleva 3 días en ella y
// tiene un BL subido sin aprobar. Así queda demorada, trabada (C pide el BL aprobado) y con un documento por aprobar a la vez. Quien aprueba la ve en los
// tres bloques; «Ver todas» de las demoras abre la cadena del origen filtrada por demoradas y la fila abre el panel de la unidad.
test.describe.configure({ mode: 'serial' })

const DIA = 86_400_000

let proyecto = ''
let terreno: TerrenoDeDocumentos

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-bandeja-logistica-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Bandeja',
  })
  terreno = await sembrarDocumentos(proyecto)
  const cliente = admin()
  const { error: errorDeLaFase } = await cliente
    .from('fases')
    .update({ demora_dias: 1 })
    .eq('id', terreno.b.id)
  exigir(errorDeLaFase, 'poner la demora de la fase B')
  const { error: errorDeLaUnidad } = await cliente
    .from('vehiculos')
    .update({ fase_desde: new Date(Date.now() - 3 * DIA).toISOString() })
    .eq('id', terreno.enB.id)
  exigir(errorDeLaUnidad, 'correr la entrada a la fase B')
  // Nace «subido» (el trigger `documento_sellos`): espera revisión y no cumple el requisito de C.
  const { error: errorDelDocumento } = await cliente.from('documentos').insert({
    vehiculo_id: terreno.enB.id,
    tipo_documento_id: terreno.tipoDeBl.id,
    nombre_archivo: 'bl.pdf',
    mime: 'application/pdf',
  })
  exigir(errorDelDocumento, 'subir el BL')
})

test.afterAll(async () => {
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('con una unidad demorada y un documento subido, Inicio los muestra y «Ver todas» abre la cadena filtrada', async ({
  page,
}) => {
  await entrar(page, terreno.quienAprueba.correo, { fresco: true })
  await page.goto('/')

  const demoras = page.getByRole('region', { name: 'Alertas por demora' })
  const filaDemorada = demoras.getByRole('link', { name: new RegExp(terreno.enB.titulo) })
  await expect(filaDemorada).toContainText(`«${terreno.b.nombre}» · Desde hace 3 días en esta fase`)
  await expect(demoras.getByText('1 unidad demorada')).toBeVisible()

  const trabados = page.getByRole('region', { name: 'Vehículos trabados' })
  await expect(trabados.getByRole('link', { name: new RegExp(terreno.enB.titulo) })).toContainText(
    `Falta para «${terreno.c.nombre}»: Documento: ${terreno.tipoDeBl.nombre}`,
  )
  await expect(trabados.getByRole('link', { name: 'Ver todas' })).toHaveCount(0)

  const porAprobar = page.getByRole('region', { name: 'Documentos por aprobar' })
  await expect(
    porAprobar.getByRole('link', { name: new RegExp(terreno.enB.titulo) }),
  ).toContainText(`${terreno.tipoDeBl.nombre} · subido`)
  await expect(porAprobar.getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
    'href',
    '/logistica?por_aprobar=si',
  )

  await demoras.getByRole('link', { name: 'Ver todas' }).click()
  await expect(page).toHaveURL(new RegExp(`/logistica\\?origen=${terreno.origen.id}&demoradas=si`))
  // Con poco ancho la cadena muestra una fase a la vez (pestañas «Fases»): se elige la de la unidad.
  const tarjeta = page.getByRole('article').filter({ hasText: terreno.enB.titulo })
  const fases = page.getByRole('tablist', { name: 'Fases' })
  await expect(fases.or(tarjeta)).toBeVisible()
  if (await fases.isVisible()) {
    await fases.getByRole('tab', { name: new RegExp(`^${terreno.b.nombre}`) }).click()
  }
  await expect(tarjeta).toBeVisible()
  await expect(page.getByRole('article').filter({ hasText: terreno.enA.titulo })).toHaveCount(0)

  await page.goto('/')
  await page
    .getByRole('region', { name: 'Alertas por demora' })
    .getByRole('link', { name: new RegExp(terreno.enB.titulo) })
    .click()
  await expect(page).toHaveURL(new RegExp(`/logistica/vehiculo/${terreno.enB.id}`))
  await expect(page.getByRole('heading', { name: terreno.enB.titulo })).toBeVisible()
})
