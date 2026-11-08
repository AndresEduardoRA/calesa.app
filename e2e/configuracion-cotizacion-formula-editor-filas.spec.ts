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
  borrarLoDePrevia,
  sembrarBorradorDePrevia,
  sembrarTabla,
  sembrarTipoDeCambio,
} from './soporte/formula-editor-previa'

// «Sumar fila» del editor de la fórmula (4.21-3a-2, P4 y P6, `docs/UX.md` › «Cotización: fórmula (estados propios)»): una fila nueva debajo de otra, cálculo o
// constante, con su etiqueta y un nombre propuesto desde ella que se puede cambiar. Cada error se dice junto a su campo y lo escrito queda; hay una sola cosa abierta a
// la vez; lo creado vive en la pestaña (vuelve al recargar, con su «Descartar»). Una fila que ya existe no tiene campo de nombre: con otro nombre es una fila nueva.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-filas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Fina Filas' })
  sembrarTipoDeCambio(proyecto, 7)
  sembrarTabla({ proyecto, origenId: null, factor: 0.5 })
  origen = await crearOrigenDeCotizar(proyecto, 'sfila', false)
  sembrarBorradorDePrevia(origen.id, duena, proyecto)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const filas = (page: Page) => page.getByRole('list', { name: 'Filas de la fórmula' })
const fila = (page: Page, id: string) => filas(page).locator(`li[data-fila="${id}"]`)
const sumar = (page: Page, etiqueta: string) =>
  page.getByRole('button', { name: `Sumar fila debajo de ${etiqueta}`, exact: true })

async function abrirEditor(page: Page) {
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origen.id}`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
  await page
    .getByRole('region', { name: 'Borrador' })
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  await expect(filas(page)).toBeVisible()
}

const orden = (page: Page) =>
  filas(page)
    .locator('li[data-fila]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-fila')))

const etiqueta = (li: ReturnType<typeof fila>) => li.getByLabel('Etiqueta', { exact: true })
const nombre = (li: ReturnType<typeof fila>) => li.getByLabel('Nombre', { exact: true })
const texto = (li: ReturnType<typeof fila>) => li.getByLabel('Texto', { exact: true })

test('E7: «Sumar fila» propone el nombre, se puede cambiar y la fila nueva queda justo debajo, con su cifra y el foco', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page)
  const base = fila(page, 'base')
  await sumar(page, 'Base').click()
  await etiqueta(base).fill('Seguro de carga')
  await expect(nombre(base)).toHaveValue('seguro_de_carga')
  await expect(base.getByRole('radio', { name: 'Cálculo' })).toBeChecked()
  await texto(base).fill('=base*3')
  await base.getByRole('button', { name: 'Crear fila', exact: true }).click()
  const nueva = fila(page, 'seguro_de_carga')
  await expect(nueva).toBeVisible()
  const ids = await orden(page)
  expect(ids[ids.indexOf('base') + 1]).toBe('seguro_de_carga')
  await expect(nueva.locator('[data-cifra]')).toContainText('2.700')
  await expect(nueva.getByRole('button', { name: 'Editar Seguro de carga' })).toBeFocused()

  // Con el nombre tocado, la etiqueta ya no lo cambia; con «Constante» el aviso del diseño.
  const doble = fila(page, 'doble')
  await sumar(page, 'Doble').click()
  await etiqueta(doble).fill('Descuento')
  await nombre(doble).fill('mi_descuento')
  await etiqueta(doble).fill('Otro descuento')
  await expect(nombre(doble)).toHaveValue('mi_descuento')
  await doble.getByRole('radio', { name: 'Constante' }).check()
  await expect(texto(doble)).toHaveValue('0')
  await expect(
    doble.getByText(
      'Una constante nueva aún no aparece en la hoja: hay que colocarla en el diseño.',
    ),
  ).toBeVisible()
  await doble.getByRole('button', { name: 'Crear fila', exact: true }).click()
  await expect(fila(page, 'mi_descuento').locator('[data-cifra]')).toContainText('0')
})

test('E8: cada error se dice junto a su campo y lo escrito queda; Esc cancela', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page)
  const base = fila(page, 'base')
  const crear = () => base.getByRole('button', { name: 'Crear fila', exact: true }).click()
  await sumar(page, 'Base').click()
  await crear()
  await expect(base).toContainText('Escribe cómo se llama la fila.')
  await expect(etiqueta(base)).toHaveAttribute('aria-invalid', 'true')

  await etiqueta(base).fill('Seguro')
  await nombre(base).fill('Mi Fila')
  await texto(base).fill('base*2')
  await crear()
  await expect(base).toContainText('no es un nombre válido para una fila.')
  await expect(nombre(base)).toHaveAttribute('aria-invalid', 'true')

  await nombre(base).fill('doble')
  await crear()
  await expect(base).toContainText('Ya hay una fila llamada «doble».')

  await nombre(base).fill('seguro')
  await texto(base).fill('5')
  await crear()
  await expect(base).toContainText('Un número solo es una constante')
  await expect(texto(base)).toHaveAttribute('aria-invalid', 'true')
  await base.getByRole('radio', { name: 'Constante' }).check()
  await texto(base).fill('base+1')
  await crear()
  await expect(base).toContainText('Una constante es un número solo')
  await base.getByRole('radio', { name: 'Cálculo' }).check()
  await texto(base).fill('base+')
  await crear()
  await expect(texto(base)).toHaveAttribute('aria-invalid', 'true')
  // Lo escrito sigue ahí.
  await expect(etiqueta(base)).toHaveValue('Seguro')
  await expect(nombre(base)).toHaveValue('seguro')
  await expect(texto(base)).toHaveValue('base+')
  await texto(base).press('Escape')
  await expect(etiqueta(base)).toBeHidden()
  expect(await orden(page)).not.toContain('seguro')
})

test('E9: con una cosa abierta, lo demás espera; la fila de «debajo de» sigue dibujada con «Buscar fila»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page)
  const base = fila(page, 'base')
  await sumar(page, 'Base').click()
  const espera = 'Aplica o cancela la fila abierta.'
  await expect(fila(page, 'doble').getByRole('button', { name: 'Editar Doble' })).toBeDisabled()
  await expect(sumar(page, 'Doble')).toBeDisabled()
  await expect(sumar(page, 'Doble')).toHaveAttribute('title', espera)
  // «Buscar fila» sin coincidencias con «Base»: la fila de la que se suma se dibuja igual.
  await page.getByRole('searchbox', { name: 'Buscar fila' }).fill('doble')
  await expect(base).toBeVisible()
  await expect(etiqueta(base)).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar fila' }).fill('')
  await base.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(etiqueta(base)).toBeHidden()

  // Con una fila en edición, también esperan los «Sumar fila».
  await fila(page, 'doble').getByRole('button', { name: 'Editar Doble' }).click()
  await expect(sumar(page, 'Base')).toBeDisabled()
  await expect(sumar(page, 'Doble')).toBeDisabled()
  await expect(fila(page, 'base').getByRole('button', { name: 'Editar Base' })).toBeDisabled()
})

test('E10: la fila creada vuelve al recargar, con su «Descartar»; una fila que existe no tiene campo de nombre', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page)
  const base = fila(page, 'base')
  await sumar(page, 'Base').click()
  await etiqueta(base).fill('Seguro')
  await texto(base).fill('base*3')
  await base.getByRole('button', { name: 'Crear fila', exact: true }).click()
  await expect(fila(page, 'seguro')).toBeVisible()
  await page.reload()
  await expect(fila(page, 'seguro')).toBeVisible()
  // P4: «Editar» no tiene campo de nombre.
  await fila(page, 'seguro').getByRole('button', { name: 'Editar Seguro' }).click()
  await expect(fila(page, 'seguro').getByLabel('Nombre', { exact: true })).toHaveCount(0)
  await fila(page, 'seguro').getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(fila(page, 'seguro')).toHaveCount(0)
})
