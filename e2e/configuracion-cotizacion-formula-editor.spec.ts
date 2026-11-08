// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  AUXILIAR_DEL_PORCENTAJE,
  FILA_CON_TEXTO,
  ajustarConstante,
  publicarFormulaConTexto,
  sembrarBorradorDeNFilas,
} from './soporte/formula-editor'
import { sembrarBorrador } from './soporte/formula-versiones'

// El editor de la fórmula en texto (4.21-3a-1, `docs/UX.md` › «Cotización: fórmula»): desde la pestaña «Fórmula», `?panel=editar-formula` lee la definición del
// borrador o de la publicada y muestra cada fila con su texto vigente; compila al aplicar y deja el error en su fila. Cierra 4-6 (2.001 caracteres, en la fila, sin
// `validarFormula()`) y 4-5 (tras un ⚙ la fila dice el valor nuevo, o que el texto ya no manda, y recompilar no pisa el ⚙ sin preguntar). Nada se guarda en la base:
// lo aplicado vive en la pestaña del navegador hasta el 4.21-3b.
test.describe.configure({ mode: 'serial' })

// Lo medido en escritorio con 600 filas (4.21-3a-1: 77.017 B, 957 ms del clic a la fila 497, informativo; 3.992 nodos, que con la cifra de prueba y «Sumar fila» de cada
// fila —4.21-3a-2— son 5.996), más un 5 %: los bytes de la lectura de la definición y los nodos de la lista con 500 filas dibujadas.
const TOPE_DE_BYTES_DE_LA_DEFINICION = 80_900
const TOPE_DE_NODOS_CON_500 = 6_300

let proyecto = ''
let duena = ''
let conTexto = { id: '', nombre: '' }
let ajustado = { id: '', nombre: '' }
let negativo = { id: '', nombre: '' }
let conBorrador = { id: '', nombre: '' }
let sinFormula = { id: '', nombre: '' }
let grande = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-editor-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Eda Edita' })
  conTexto = await crearOrigenDeCotizar(proyecto, 'edtexto', false)
  publicarFormulaConTexto(conTexto.id)
  // El ⚙ deja la auxiliar del `4%` en 5 % (el texto lo puede escribir) y en −3 % (no puede: un negativo no se escribe).
  ajustado = await crearOrigenDeCotizar(proyecto, 'edajuste', false)
  publicarFormulaConTexto(ajustado.id)
  ajustarConstante(ajustado.id, AUXILIAR_DEL_PORCENTAJE, 0.05)
  negativo = await crearOrigenDeCotizar(proyecto, 'ednegat', false)
  publicarFormulaConTexto(negativo.id)
  ajustarConstante(negativo.id, AUXILIAR_DEL_PORCENTAJE, -0.03)
  conBorrador = await crearOrigenDeCotizar(proyecto, 'edborr', true)
  sembrarBorrador(conBorrador.id, { autor: duena, sobre: 'publicada', conDiseno: true })
  sinFormula = await crearOrigenDeCotizar(proyecto, 'edsinf', false)
  grande = await crearOrigenDeCotizar(proyecto, 'edgrande', false)
  sembrarBorradorDeNFilas(grande.id, 600, duena)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function abrirFormula(page: Page, origenId: string, resto = '') {
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origenId}${resto}`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
}

const editor = (page: Page) => page.getByRole('region', { name: 'Editor de la fórmula' })
const filas = (page: Page) => page.getByRole('list', { name: 'Filas de la fórmula' })
const fila = (page: Page, id: string) => filas(page).locator(`li[data-fila="${id}"]`)
const texto = (page: Page, etiqueta: string) =>
  page.getByRole('textbox', { name: `Texto de ${etiqueta}` })

async function abrirEditor(page: Page, origenId: string) {
  await abrirFormula(page, origenId)
  await page.getByRole('button', { name: 'Editar en un borrador', exact: true }).click()
  await expect(page).toHaveURL(/panel=editar-formula/)
  await expect(filas(page)).toBeVisible()
}

test('4-6: 2.001 caracteres dan el error en su fila y no cambian nada; con 2.000 se aplica', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, conTexto.id)
  const comision = fila(page, FILA_CON_TEXTO.id)
  await expect(comision).toContainText(FILA_CON_TEXTO.texto)
  await comision.getByRole('button', { name: `Editar ${FILA_CON_TEXTO.etiqueta}` }).click()
  const campo = texto(page, FILA_CON_TEXTO.etiqueta)
  await campo.fill('=pub'.padEnd(2001, ' '))
  await comision.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(comision).toContainText('El texto de la fila pasa de 2.000 caracteres.')
  await expect(campo).toHaveAttribute('aria-invalid', 'true')
  // Sigue abierta y la fórmula no cambió: cancelar vuelve al texto de antes.
  await comision.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(comision).toContainText(FILA_CON_TEXTO.texto)
  await comision.getByRole('button', { name: `Editar ${FILA_CON_TEXTO.etiqueta}` }).click()
  await texto(page, FILA_CON_TEXTO.etiqueta).fill('=pub'.padEnd(2000, ' '))
  await comision.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(texto(page, FILA_CON_TEXTO.etiqueta)).toBeHidden()
  await expect(comision).not.toContainText('pasa de 2.000')
})

test('4-5: tras un ⚙ que el texto puede escribir, la fila dice el valor nuevo', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, ajustado.id)
  const comision = fila(page, FILA_CON_TEXTO.id)
  await expect(comision).toContainText('=pub*5%')
  await expect(comision).toContainText(/Con ⚙ se cambió 4\s?% por 5\s?%/)
})

test('4-5: tras un ⚙ que el texto no puede escribir, el texto ya no manda y recompilar pregunta antes de pisar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, negativo.id)
  const comision = fila(page, FILA_CON_TEXTO.id)
  await expect(comision).toContainText(FILA_CON_TEXTO.texto)
  await expect(comision).toContainText(/El texto ya no manda: con ⚙ quedó -3\s?%/)
  await comision.getByRole('button', { name: `Editar ${FILA_CON_TEXTO.etiqueta}` }).click()
  await comision.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(comision).toContainText('confirma que quieres pisarlo')
  await expect(comision).toContainText(AUXILIAR_DEL_PORCENTAJE)
  await comision.getByRole('button', { name: 'Pisar el valor', exact: true }).click()
  await expect(texto(page, FILA_CON_TEXTO.etiqueta)).toBeHidden()
  await expect(comision).not.toContainText('ya no manda')
})

test('un texto que compila y deja la fórmula inválida aplica y dice el rechazo en su fila', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, conTexto.id)
  const total = fila(page, 'total')
  await total.getByRole('button', { name: 'Editar Total' }).click()
  await texto(page, 'Total').fill('SI(activar; pub)')
  await total.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(total).toContainText('El total «total» no puede depender de una variante')
  await expect(total).toContainText('SI(activar; pub)')
})

test('lo aplicado vuelve al recargar, con su «Descartar»', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, conTexto.id)
  const comision = fila(page, FILA_CON_TEXTO.id)
  await comision.getByRole('button', { name: `Editar ${FILA_CON_TEXTO.etiqueta}` }).click()
  await texto(page, FILA_CON_TEXTO.etiqueta).fill('=pub*7%')
  await comision.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(comision).toContainText('=pub*7%')
  await page.reload()
  await expect(fila(page, FILA_CON_TEXTO.id)).toContainText('=pub*7%')
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(fila(page, FILA_CON_TEXTO.id)).toContainText(FILA_CON_TEXTO.texto)
})

test('se entra desde el borrador o la publicada, «atrás» vuelve, un tipo de cambio no se edita y sin fórmula no abre', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirFormula(page, conBorrador.id)
  // Con borrador, la publicada no ofrece otro.
  await expect(page.getByRole('button', { name: 'Editar en un borrador' })).toHaveCount(0)
  const editar = page
    .getByRole('region', { name: 'Borrador' })
    .getByRole('button', { name: 'Editar', exact: true })
  await editar.click()
  await expect(page).toHaveURL(/panel=editar-formula/)
  await expect(editor(page)).toContainText('Sobre el borrador de Eda Edita.')
  await expect(fila(page, 'tc')).toBeVisible()
  await expect(fila(page, 'tc').getByRole('button', { name: /^Editar/ })).toHaveCount(0)
  await page.goBack()
  await expect(editor(page)).toBeHidden()
  await expect(editar).toBeFocused()

  await abrirEditor(page, conTexto.id)
  await expect(editor(page)).toContainText('Sobre la versión 1 publicada.')
  await page.getByRole('button', { name: 'Volver a la fórmula' }).click()
  await expect(editor(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)

  await abrirFormula(page, sinFormula.id, '&panel=editar-formula')
  await expect(
    page.getByText(`No hay una fórmula para editar en ${sinFormula.nombre}.`),
  ).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(editor(page)).toHaveCount(0)
})

test('con 600 filas dibuja 500 con su aviso y «Buscar fila» lleva a las demás', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await abrirFormula(page, grande.id)
  const respuesta = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/formulas') && r.url().includes('definicion'),
  )
  const desde = Date.now()
  await page
    .getByRole('region', { name: 'Borrador' })
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  await expect(fila(page, 'fila_497')).toBeVisible()
  const ms = Date.now() - desde
  const bytes = (await (await respuesta).body()).length
  await expect(filas(page).locator('li[data-fila]')).toHaveCount(500)
  await expect(fila(page, 'fila_498')).toHaveCount(0)
  await expect(
    editor(page).getByRole('status').filter({ hasText: 'Mostrando las 500 primeras filas.' }),
  ).toBeVisible()
  const nodos = await filas(page).evaluate((lista) => lista.querySelectorAll('*').length + 1)
  info.annotations.push({
    type: 'medida',
    description: `${String(bytes)} B de la definición, ${String(nodos)} nodos con 500, ${String(ms)} ms hasta la fila 497`,
  })
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES_DE_LA_DEFINICION)
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_500)

  const buscar = page.getByRole('searchbox', { name: 'Buscar fila' })
  await buscar.fill('fila_599')
  await expect(fila(page, 'fila_599')).toBeVisible()
  await expect(filas(page).locator('li[data-fila]')).toHaveCount(1)
  await buscar.fill('no-existe')
  await expect(editor(page).getByText('Nada coincide con los filtros')).toBeVisible()
  await expect(
    editor(page).getByText('Ninguna fila tiene «no-existe» en el nombre ni en la etiqueta.'),
  ).toBeVisible()
  await expect(editor(page).getByRole('button', { name: 'Limpiar filtros' })).toHaveCount(0)
})
