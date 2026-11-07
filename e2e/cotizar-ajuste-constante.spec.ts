import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { publicarLaVersionSiguiente } from './soporte/cotizar-formula'
import { guardarPorLaHoja } from './soporte/cotizar-guardada'
import {
  celdaDeLaHoja,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tipearEnLaHoja,
} from './soporte/cotizar-guardar'
import { crearOrigenDePrueba } from './soporte/origenes'
import { literal, sql } from './soporte/sql'

// El ⚙ de una constante en la hoja (paso 4.20-3b, `docs/UX.md` › «Cotizar»): el botón de la celda abre «Valor por defecto de <celda>» (`?ajuste=celda&nodo=`), que lee la publicada
// del origen, publica la N+1 con `formula_cambiar_constante()` y, con «Aplicar también a esta cotización», cambia la celda. La hoja no se vuelve a montar (no se revalida). Un
// tipo de cambio abre su propio panel (4.20-3d). Quien no configura el origen no ve ningún ⚙. La fórmula de prueba (`con_ayuda`, 5; `tc`) y una copia de la subasta (`fees_pct`, `flete`).
test.describe.configure({ mode: 'serial' })

// La respuesta de la lectura del valor por defecto (una fila: id, versión y el valor): medida en 66 B (4.20-3b, los dos proyectos); lo medido más un 5 %.
const TOPE_DE_BYTES_DE_LA_LECTURA = 70

let proyecto = ''
let origen = { id: '', nombre: '' }
let subasta = ''
let duena = ''
let lead = ''
let sinAjuste = ''

// Un origen de prueba con la fórmula publicada de `subasta_usa`, copiada: el ⚙ publica la N+1 de ese origen y no toca el de la semilla, que miran otros specs.
async function crearSubastaCopiada(): Promise<string> {
  const copia = await crearOrigenDePrueba(
    `E2E 4.13 ajuste subasta ${proyecto}`,
    `4_13_ajsub_${proyecto}`,
    { tipo: 'subasta' },
  )
  sql(`
    insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
    select ${literal(copia.id)}::uuid, 1, 'publicada', f.definicion, f.params, f.diseno, f.visibilidad, 'E2E 4.20-3b copia de la subasta', now()
    from public.formulas f join public.origenes o on o.id = f.origen_id
    where o.clave = 'subasta_usa' and f.estado = 'publicada'`)
  return copia.id
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'ajuste'))
  subasta = await crearSubastaCopiada()
  sinAjuste = correoDePrueba(`sin-ajuste-${proyecto}`)
  await crearPersona({
    email: sinAjuste,
    contrasena: CONTRASENA,
    nombre: 'Sara Sin',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinAjuste,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Sin ajuste ${proyecto}`,
      clave: `e2e_sin_ajuste_${proyecto}`,
    },
    permisos: ['cotizaciones.ver', 'cotizaciones.crear'],
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const url = (id = origen.id, resto = '') => `/cotizaciones/nuevo?origen=${id}&lead=${lead}${resto}`
const engranaje = (page: Page, etiqueta: string) =>
  page.getByRole('button', { name: `Cambiar el valor por defecto de ${etiqueta}`, exact: true })
const panel = (page: Page, etiqueta: string) =>
  page.getByRole('dialog', { name: `Valor por defecto de ${etiqueta}` })
const publicada = (id: string, nodo: string) =>
  sql(
    `select version || ':' || (params ->> ${literal(nodo)}) from public.formulas where origen_id = ${literal(id)}::uuid and estado = 'publicada'`,
  )
const aviso = (page: Page, texto: string) =>
  page.locator('[data-sonner-toast]').filter({ hasText: texto })

async function abrir(page: Page, destino = url(), correo = duena): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto(destino)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

async function abrirElPanel(page: Page, etiqueta: string) {
  await engranaje(page, etiqueta).click()
  const abierto = panel(page, etiqueta)
  await expect(abierto.getByRole('button', { name: 'Cerrar' })).toBeFocused()
  await expect(abierto.getByLabel('Cargando el valor por defecto')).toHaveCount(0)
  return abierto
}

test('E1: cambia el valor por defecto sin tocar esta cotización ni lo escrito en otra celda; el foco vuelve al ⚙', async ({
  page,
}) => {
  await abrir(page)
  await tipearEnLaHoja(page, 'pub', '3')
  // Abrir el ⚙ lee una fila de `formulas` por `formulas_publicada_unica`: su respuesta tiene tope (`docs/RENDIMIENTO.md`).
  const lectura = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/formulas') && r.request().method() === 'GET',
  )
  const abierto = await abrirElPanel(page, 'Con ayuda')
  const bytes = (await (await lectura).body()).length
  console.warn(
    `[bytes] el valor por defecto de una constante: ${String(bytes)} B (tope ${String(TOPE_DE_BYTES_DE_LA_LECTURA)})`,
  )
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES_DE_LA_LECTURA)
  const campo = abierto.getByRole('textbox', { name: 'Valor nuevo' })
  await expect(campo).toHaveValue('5')
  await campo.fill('7')
  await abierto.getByRole('button', { name: 'Cambiar el valor por defecto' }).click()
  await expect(abierto).toBeHidden()
  await expect(
    aviso(page, 'Cambiaste el valor por defecto de Con ayuda. Esta cotización no cambia.'),
  ).toBeVisible()
  expect(publicada(origen.id, 'con_ayuda')).toBe('2:7')
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('3,00')
  await expect(celdaDeLaHoja(page, 'con_ayuda')).toContainText('5,00')
  await expect(engranaje(page, 'Con ayuda')).toBeFocused()
  // La hoja sigue en su versión (no se remontó): guardar dice que se publicó otra mientras cotizabas (D2).
  await guardarConElAtajo(page)
  await expect(
    page.getByText('Se publicó una versión nueva de la fórmula mientras cotizabas.'),
  ).toBeVisible()
})

test('E2: con «Aplicar también a esta cotización», la celda toma el valor nuevo', async ({
  page,
}) => {
  await abrir(page)
  const abierto = await abrirElPanel(page, 'Con ayuda')
  await expect(abierto.getByRole('textbox', { name: 'Valor nuevo' })).toHaveValue('7')
  await abierto.getByRole('checkbox', { name: 'Aplicar también a esta cotización' }).click()
  await abierto.getByRole('textbox', { name: 'Valor nuevo' }).fill('9')
  await abierto.getByRole('textbox', { name: 'Valor nuevo' }).press('Enter')
  await expect(abierto).toBeHidden()
  await expect(
    aviso(page, 'Cambiaste el valor por defecto de Con ayuda y lo aplicaste a esta cotización.'),
  ).toBeVisible()
  expect(publicada(origen.id, 'con_ayuda')).toBe('3:9')
  await expect(celdaDeLaHoja(page, 'con_ayuda')).toContainText('9,00')
  // Aplicado como si se tipeara: la celda queda modificada (anillo y ↺).
  await expect(celdaDeLaHoja(page, 'con_ayuda').locator('[data-xcell]')).toHaveAttribute(
    'data-estado',
    /modificado/,
  )
})

test('E3: si otra persona publicó con el panel abierto, dice lo de la base y «Volver a leer» trae lo nuevo sin perder lo tipeado', async ({
  page,
}) => {
  await abrir(page)
  const abierto = await abrirElPanel(page, 'Con ayuda')
  publicarLaVersionSiguiente(origen.id, 11)
  await abierto.getByRole('textbox', { name: 'Valor nuevo' }).fill('12')
  await abierto.getByRole('button', { name: 'Cambiar el valor por defecto' }).click()
  await expect(abierto.getByRole('button', { name: 'Volver a leer' })).toBeVisible()
  expect(publicada(origen.id, 'con_ayuda')).toBe('4:11')
  await abierto.getByRole('button', { name: 'Volver a leer' }).click()
  await expect(abierto.getByText(/Valor por defecto:/)).toContainText('11')
  await expect(abierto.getByRole('textbox', { name: 'Valor nuevo' })).toHaveValue('12')
  await abierto.getByRole('button', { name: 'Cambiar el valor por defecto' }).click()
  await expect(abierto).toBeHidden()
  expect(publicada(origen.id, 'con_ayuda')).toBe('5:12')
})

test('E4: el porcentaje de un par se tipea en puntos y se publica como fracción', async ({
  page,
}) => {
  await abrir(page, url(subasta))
  const abierto = await abrirElPanel(page, 'Fees / Tarifa USA')
  const campo = abierto.getByRole('textbox', { name: 'Valor nuevo' })
  await expect(campo).toHaveValue('13')
  await abierto.getByRole('checkbox', { name: 'Aplicar también a esta cotización' }).click()
  await campo.fill('15')
  await abierto.getByRole('button', { name: 'Cambiar el valor por defecto' }).click()
  await expect(abierto).toBeHidden()
  expect(publicada(subasta, 'fees_pct')).toBe('2:0.15')
  // El lado secundario de la celda (el porcentaje, `data-parada="1"`) dice 15 % y la celda queda modificada.
  await expect(celdaDeLaHoja(page, 'fees').locator('[data-parada="1"]')).toContainText('15')
  await expect(celdaDeLaHoja(page, 'fees').locator('[data-xcell]')).toHaveAttribute(
    'data-estado',
    /modificado/,
  )
})

// No se cambia: `oficial` lo usan los demás specs (el recorrido entero, con un tipo de cambio propio, está en `cotizar-ajuste-tipo-cambio.spec.ts`).
test('E5: una celda de tipo de cambio abre su propio panel, con «Valor nuevo»', async ({
  page,
}) => {
  await abrir(page)
  await engranaje(page, 'TC').click()
  const abierto = page.getByRole('dialog', { name: 'Tipo de cambio de TC' })
  await expect(abierto.getByLabel('Valor nuevo')).toBeVisible()
  await expect(abierto.getByRole('button', { name: 'Cambiar el tipo de cambio' })).toBeVisible()
  await expect(abierto.getByRole('button', { name: 'Cambiar el valor por defecto' })).toHaveCount(0)
})

test('E6: quien no configura el origen no ve ningún ⚙ y la URL no abre nada', async ({ page }) => {
  await abrir(page, url(), sinAjuste)
  await tipearEnLaHoja(page, 'pub', '1')
  await expect(page.getByRole('button', { name: /^Cambiar el valor por defecto de / })).toHaveCount(
    0,
  )
  await page.goto(url(origen.id, '&ajuste=celda&nodo=con_ayuda'))
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await tipearEnLaHoja(page, 'pub', '2')
  await expect(panel(page, 'Con ayuda')).toHaveCount(0)
})

test('E7: en una guardada, «Aplicar también» deja cambios por guardar', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const id = await guardarPorLaHoja(page, { origenId: origen.id, lead, pub: '4' })
  await page.goto(`/cotizaciones/${id}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  const guardar = page.getByRole('button', { name: 'Guardar', exact: true })
  await expect(guardar).toBeDisabled()
  const abierto = await abrirElPanel(page, 'Con ayuda')
  await abierto.getByRole('checkbox', { name: 'Aplicar también a esta cotización' }).click()
  await abierto.getByRole('textbox', { name: 'Valor nuevo' }).fill('13')
  await abierto.getByRole('button', { name: 'Cambiar el valor por defecto' }).click()
  await expect(abierto).toBeHidden()
  await expect(guardar).toBeEnabled()
})

test('E8: dentro de «Avanzado», el ⚙ abre su panel sobre el modal y Esc cierra sólo el panel', async ({
  page,
}) => {
  await abrir(page, url(subasta))
  await page.locator('[data-avanzado]').getByRole('button').click()
  const avanzado = page.getByRole('dialog', { name: 'Avanzado' })
  await expect(avanzado).toBeVisible()
  const abierto = await abrirElPanel(page, 'Flete I y II')
  await page.keyboard.press('Escape')
  await expect(abierto).toBeHidden()
  await expect(avanzado).toBeVisible()
})
