import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  AUXILIAR_DEL_PORCENTAJE,
  FILA_CON_TEXTO,
  ajustarConstante,
  publicarFormulaConTexto,
} from './soporte/formula-editor'
import {
  crearBorradorComoOtraPersona,
  guardarComoOtraPersona,
  idDeLaPublicada,
  leerBorrador,
  textoGuardado,
} from './soporte/formula-editor-guardar'
import { sql, literal } from './soporte/sql'

// «Guardar el borrador» del editor de la fórmula (4.21-3b-1, `docs/UX.md` › «Cotización: fórmula (estados propios)»): sobre la publicada crea el borrador con su
// diseño; sobre el borrador lo pisa con su hora, sin releer la fila; guarda el texto que reescribió el ⚙ (4-5); si otra persona guardó o empezó un borrador, dice
// el texto de la base con «Recargar», que trae lo de ella; avisa qué filas tendrá que mostrar el diseño para publicar (P1: guardar y avisar).
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let otra = ''
let crea = { id: '', nombre: '' }
let ajustado = { id: '', nombre: '' }
let choca = { id: '', nombre: '' }
let empieza = { id: '', nombre: '' }
let sinCelda = { id: '', nombre: '' }
let estados = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-guardar-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Gema Guarda' })
  otra = correoDePrueba(`otra-guardar-${proyecto}`)
  await crearPersona({ email: otra, contrasena: CONTRASENA, nombre: 'Otto Otra', invitada: true })
  crea = await crearOrigenDeCotizar(proyecto, 'gcrea', false)
  publicarFormulaConTexto(crea.id)
  ajustado = await crearOrigenDeCotizar(proyecto, 'gajuste', false)
  publicarFormulaConTexto(ajustado.id)
  ajustarConstante(ajustado.id, AUXILIAR_DEL_PORCENTAJE, 0.06)
  choca = await crearOrigenDeCotizar(proyecto, 'gchoca', false)
  publicarFormulaConTexto(choca.id)
  empieza = await crearOrigenDeCotizar(proyecto, 'gempieza', false)
  publicarFormulaConTexto(empieza.id)
  sinCelda = await crearOrigenDeCotizar(proyecto, 'gsincelda', false)
  publicarFormulaConTexto(sinCelda.id)
  estados = await crearOrigenDeCotizar(proyecto, 'gestados', false)
  publicarFormulaConTexto(estados.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const editor = (page: Page) => page.getByRole('region', { name: 'Editor de la fórmula' })
const filas = (page: Page) => page.getByRole('list', { name: 'Filas de la fórmula' })
const fila = (page: Page, id: string) => filas(page).locator(`li[data-fila="${id}"]`)
const texto = (page: Page, etiqueta: string) =>
  page.getByRole('textbox', { name: `Texto de ${etiqueta}` })
const guardar = (page: Page) =>
  editor(page).getByRole('button', { name: 'Guardar el borrador', exact: true })
const estado = (page: Page) => editor(page).locator('[data-guardado] [role="status"]')

async function abrirFormula(page: Page, origenId: string) {
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origenId}`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
}

async function abrirSobreLaPublicada(page: Page, origenId: string) {
  await abrirFormula(page, origenId)
  await page.getByRole('button', { name: 'Editar en un borrador', exact: true }).click()
  await expect(filas(page)).toBeVisible()
}

async function escribirLaComision(page: Page, valor: string) {
  const comision = fila(page, FILA_CON_TEXTO.id)
  await comision.getByRole('button', { name: `Editar ${FILA_CON_TEXTO.etiqueta}` }).click()
  await texto(page, FILA_CON_TEXTO.etiqueta).fill(valor)
  await comision.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(texto(page, FILA_CON_TEXTO.etiqueta)).toBeHidden()
  await expect(comision).toContainText(valor)
}

const disenoDe = (id: string) =>
  sql(`select diseno::text from public.formulas where id = ${literal(id)}::uuid`)

test('G1: sobre la publicada crea el borrador con su diseño; el segundo guardado pisa con la hora nueva, sin releer ni volver a montar el editor', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirSobreLaPublicada(page, crea.id)
  await expect(editor(page)).toContainText('Sobre la versión 1 publicada.')
  await escribirLaComision(page, '=pub*5%')
  const lecturas: string[] = []
  page.on('request', (r) => {
    if (/\/rest\/v1\/formulas\?.*select=/.test(r.url())) lecturas.push(r.url())
  })
  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
  const publicada = idDeLaPublicada(crea.id)
  const primero = leerBorrador(crea.id)
  expect(primero).not.toBeNull()
  expect(textoGuardado(primero!, FILA_CON_TEXTO.id)).toBe('=pub*5%')
  expect(primero!.params[AUXILIAR_DEL_PORCENTAJE]).toBe(0.05)
  expect(primero!.version_origen_id).toBe(publicada)
  expect(JSON.stringify(primero!.diseno)).toBe(JSON.stringify(JSON.parse(disenoDe(publicada))))
  await expect(editor(page)).toContainText('Sobre el borrador de Gema Guarda.')

  // Sin cerrar el editor: otro cambio y otro guardado pisan el mismo borrador con la hora que devolvió el primero.
  await escribirLaComision(page, '=pub*6%')
  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
  const segundo = leerBorrador(crea.id)
  expect(segundo!.id).toBe(primero!.id)
  expect(textoGuardado(segundo!, FILA_CON_TEXTO.id)).toBe('=pub*6%')
  expect(segundo!.actualizado_en).not.toBe(primero!.actualizado_en)
  expect(lecturas).toEqual([])

  await page.getByRole('button', { name: 'Volver a la fórmula' }).click()
  const tarjeta = page.getByRole('region', { name: 'Borrador' })
  await expect(tarjeta).toBeVisible()
  await tarjeta.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(fila(page, FILA_CON_TEXTO.id)).toContainText('=pub*6%')
  await expect(guardar(page)).toBeDisabled()
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
})

test('G2 (4-5): tras un ⚙, guardar escribe el texto con el valor nuevo, sin tocar la fila', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirSobreLaPublicada(page, ajustado.id)
  const comision = fila(page, FILA_CON_TEXTO.id)
  await expect(comision).toContainText(/Con ⚙ se cambió 4\s?% por 6\s?%/)
  await expect(guardar(page)).toBeEnabled()
  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
  const borrador = leerBorrador(ajustado.id)
  expect(textoGuardado(borrador!, FILA_CON_TEXTO.id)).toBe('=pub*6%')
  await expect(comision).toContainText('=pub*6%')
  await expect(comision).not.toContainText('Con ⚙')
})

test('G3: si otra persona guardó, el texto de la base con «Recargar», que trae lo de ella; si empezó un borrador, «Ya hay un borrador»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirSobreLaPublicada(page, choca.id)
  await escribirLaComision(page, '=pub*5%')
  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')

  guardarComoOtraPersona(choca.id, '=pub*7%')
  await escribirLaComision(page, '=pub*8%')
  await guardar(page).click()
  const conflicto = editor(page).getByRole('alert').filter({ hasText: 'El borrador cambió' })
  await expect(conflicto).toContainText('El borrador cambió después de que lo abriste')
  await expect(conflicto).toContainText(
    'Recargar trae el borrador como quedó; lo que aplicaste y no guardaste se pierde.',
  )
  await expect(fila(page, FILA_CON_TEXTO.id)).toContainText('=pub*8%')
  expect(textoGuardado(leerBorrador(choca.id)!, FILA_CON_TEXTO.id)).toBe('=pub*7%')
  await conflicto.getByRole('button', { name: 'Recargar', exact: true }).click()
  await expect(fila(page, FILA_CON_TEXTO.id)).toContainText('=pub*7%')
  await expect(conflicto).toBeHidden()

  await abrirSobreLaPublicada(page, empieza.id)
  crearBorradorComoOtraPersona(empieza.id, otra)
  await escribirLaComision(page, '=pub*9%')
  await guardar(page).click()
  const yaHay = editor(page).getByRole('alert').filter({ hasText: 'Ya hay un borrador' })
  await expect(yaHay).toContainText('Ya hay un borrador: lo empezó Otto Otra')
  await yaHay.getByRole('button', { name: 'Recargar', exact: true }).click()
  await expect(editor(page)).toContainText('Sobre el borrador de Otto Otra.')
  await expect(fila(page, FILA_CON_TEXTO.id)).toContainText(FILA_CON_TEXTO.texto)
})

test('G4 (P1): una constante sin celda en el diseño se guarda con su aviso, y publicar la rechaza', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirSobreLaPublicada(page, sinCelda.id)
  const comision = fila(page, FILA_CON_TEXTO.id)
  await comision
    .getByRole('button', { name: `Sumar fila debajo de ${FILA_CON_TEXTO.etiqueta}`, exact: true })
    .click()
  await comision.getByLabel('Etiqueta', { exact: true }).fill('Seguro de carga')
  await comision.getByRole('radio', { name: 'Constante' }).check()
  await comision.getByLabel('Texto', { exact: true }).fill('150')
  await comision.getByRole('button', { name: 'Crear fila', exact: true }).click()
  await expect(fila(page, 'seguro_de_carga')).toBeVisible()
  await expect(editor(page)).toContainText(
    'Para publicar, el diseño de la hoja tiene que mostrar: «Seguro de carga». Puedes guardar igual.',
  )
  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
  expect(leerBorrador(sinCelda.id)!.params['seguro_de_carga']).toBe(150)

  await page.getByRole('button', { name: 'Volver a la fórmula' }).click()
  await page.getByRole('button', { name: 'Publicar…' }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar el borrador' })
  await modal.getByLabel('Nota').fill('Con seguro')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toContainText('«seguro_de_carga» no está en ninguna sección del diseño.')
  // No publicó: el borrador sigue y la publicada es la de antes.
  expect(leerBorrador(sinCelda.id)).not.toBeNull()
  expect(
    sql(
      `select version from public.formulas where origen_id = ${literal(sinCelda.id)}::uuid and estado = 'publicada'`,
    ),
  ).toBe('1')
})

test('G5: con una fila abierta, sin cambios o con la fórmula inválida, el botón espera y dice por qué', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirSobreLaPublicada(page, estados.id)
  await expect(guardar(page)).toBeDisabled()
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
  const comision = fila(page, FILA_CON_TEXTO.id)
  await comision.getByRole('button', { name: `Editar ${FILA_CON_TEXTO.etiqueta}` }).click()
  await expect(guardar(page)).toBeDisabled()
  await expect(estado(page)).toHaveText('Aplica o cancela la fila abierta.')
  await comision.getByRole('button', { name: 'Cancelar', exact: true }).click()
  const total = fila(page, 'total')
  await total.getByRole('button', { name: 'Editar Total' }).click()
  await texto(page, 'Total').fill('SI(activar; pub)')
  await total.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(total).toContainText('El total «total» no puede depender de una variante')
  await expect(guardar(page)).toBeDisabled()
  await expect(estado(page)).toHaveText('Corrige lo marcado para guardar.')
  expect(leerBorrador(estados.id)).toBeNull()
})
