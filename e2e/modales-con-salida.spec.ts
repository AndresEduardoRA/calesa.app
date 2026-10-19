import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar, limpiarAlta, prepararAlta } from './soporte/alta'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'
import { irAlEmbudo } from './soporte/leads-oportunidades'

// Los modales con formulario que no eran `ModalDeFormulario` (nuevo rol, invitar, nuevo embudo) y el de las etiquetas:
// con algo escrito, Esc o «Cancelar» preguntan en el mismo modal; sin nada, cierran; cada apertura empieza vacía;
// sin conexión lo escrito queda y se guarda al volver; y sin permiso la URL no abre nada. La guarda de código es
// `scripts/guardas/modales-con-salida.test.ts`.
test.describe.configure({ mode: 'serial' })

let terreno: Awaited<ReturnType<typeof prepararAlta>>
let soloVe = ''

test.beforeAll(async ({}, info) => {
  terreno = await prepararAlta(info.project.name)
  soloVe = correoDePrueba(`solo-ve-modales-${info.project.name}`)
  await crearPersona({
    email: soloVe,
    contrasena: CONTRASENA,
    nombre: 'Solo Ve Equipo',
    invitada: true,
  })
  await darRolDePrueba({
    email: soloVe,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Modales ver ${info.project.name}`,
      clave: `e2e_modales_ver_${info.project.name.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: ['equipo.roles.ver', 'equipo.usuarios.ver'],
  })
})

test.afterAll(async () => {
  await limpiarAlta(terreno.restaurarCatalogos)
})

const PREGUNTA = 'Tienes cambios sin guardar.'

// Escribir y salir por Esc: pregunta en el mismo modal, con «Seguir editando» a mano; seguir conserva lo escrito.
// Salir por «Cancelar» (si el modal lo tiene) o por Esc otra vez pregunta lo mismo; «Descartar» cierra.
async function preguntaAlDescartar(
  page: Page,
  dialogo: Locator,
  campo: Locator,
  { texto, conCancelar = true }: { texto: string; conCancelar?: boolean },
) {
  await campo.fill(texto)
  await page.keyboard.press('Escape')
  await expect(dialogo.getByText(PREGUNTA)).toBeVisible()
  const seguir = dialogo.getByRole('button', { name: 'Seguir editando' })
  await expect(seguir).toBeFocused()
  await seguir.click()
  await expect(dialogo.getByText(PREGUNTA)).toBeHidden()
  await expect(campo).toHaveValue(texto)

  if (conCancelar) {
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  } else {
    await campo.focus()
    await page.keyboard.press('Escape')
  }
  await expect(dialogo.getByText(PREGUNTA)).toBeVisible()
  await dialogo.getByRole('button', { name: 'Descartar' }).click()
  await expect(dialogo).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
}

test('nuevo rol: sin nada cierra; con algo escrito pregunta; descartar lo tira y la apertura siguiente empieza vacía', async ({
  page,
}) => {
  await entrar(page, terreno.personas.duena)
  await page.goto('/configuracion/roles')
  const abrir = () => page.getByRole('button', { name: 'Nuevo rol' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo rol' })
  const campo = dialogo.getByLabel('Nombre del rol')

  await abrir()
  await expect(campo).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()

  await abrir()
  await preguntaAlDescartar(page, dialogo, campo, { texto: 'Rol que no se crea' })
  await abrir()
  await expect(campo).toHaveValue('')
})

test('nuevo rol: un nombre sin letras se dice junto al campo y el foco va ahí', async ({
  page,
}) => {
  await entrar(page, terreno.personas.duena)
  await page.goto('/configuracion/roles')
  await page.getByRole('button', { name: 'Nuevo rol' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo rol' })
  await dialogo.getByLabel('Nombre del rol').fill('1234')
  await dialogo.getByRole('button', { name: 'Crear rol' }).click()
  await expect(
    dialogo.getByText('Usa un nombre con letras, como «Ventas» o «Logística».'),
  ).toBeVisible()
  await expect(dialogo.getByLabel('Nombre del rol')).toBeFocused()
  await expect(dialogo.getByLabel('Nombre del rol')).toHaveAttribute('aria-invalid', 'true')
})

// Con el texto al 200 %, ningún campo de un modal se sale de él ni queda cortado (se mide sin desplazar: desplazar el cuerpo de costado
// lo acomoda a la vista y el desborde desaparece de la medida): el `<select>` del rol de «Invitar» tiene una opción larga que
// ensanchaba la columna del formulario, y el campo de «Nueva etiqueta» se achicaba hasta no leerse.
async function cabeEnElModal(dialogo: Locator, campo: Locator, anchoMinimo = 0) {
  // Las dos cajas se leen en la misma evaluación (el mismo cuadro): el modal tiene una transición de 100 ms (`duration-100`, y la propiedad por
  // defecto es `all`), así que al cambiar la raíz su ancho crece durante unos cuadros y dos lecturas sueltas podían caer a un lado y otro de uno.
  const medida = await campo.evaluate((el) => {
    const modal = el.closest('[role=dialog]')?.getBoundingClientRect()
    const caja = el.getBoundingClientRect()
    return modal ? { dx: modal.x, dw: modal.width, cx: caja.x, cw: caja.width } : null
  })
  expect(medida, 'el campo está dentro de un modal').not.toBeNull()
  expect(await dialogo.count(), 'el modal está').toBeGreaterThan(0)
  if (!medida) return
  const detalle = `modal x ${String(Math.round(medida.dx))} ancho ${String(Math.round(medida.dw))}, campo x ${String(Math.round(medida.cx))} ancho ${String(Math.round(medida.cw))}`
  expect(
    medida.cx + medida.cw,
    `el campo no se sale del modal por la derecha (${detalle})`,
  ).toBeLessThanOrEqual(medida.dx + medida.dw + 1)
  expect(
    medida.cx,
    `el campo no se sale del modal por la izquierda (${detalle})`,
  ).toBeGreaterThanOrEqual(medida.dx - 1)
  expect(medida.cw, `el campo no se achica hasta no leerse (${detalle})`).toBeGreaterThanOrEqual(
    anchoMinimo,
  )
}

test('al 200 % los campos de invitar caben en su modal', async ({ page }) => {
  await entrar(page, terreno.personas.duena)
  await page.goto('/configuracion/equipo')
  await page.getByRole('button', { name: 'Invitar' }).click()
  const invitar = page.getByRole('dialog', { name: 'Invitar a una persona' })
  await invitar.getByLabel('Correo', { exact: true }).fill('invitada.del.recorrido@ejemplo.com')
  await invitar.getByRole('button', { name: 'Invitar' }).click()
  await expect(invitar.getByText('Elige el rol con el que entra.')).toBeVisible()
  // El texto crece con el modal ya abierto, con el motivo a la vista (como lo pide quien lo agranda a mitad de una tarea).
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  for (const campo of [
    invitar.getByLabel('Correo', { exact: true }),
    invitar.getByLabel('Nombre y apellido'),
    invitar.getByLabel('Rol con el que entra'),
  ]) {
    await cabeEnElModal(invitar, campo)
  }
})

test('al 200 % el campo de una etiqueta nueva cabe en su modal y se lee', async ({ page }) => {
  await entrar(page, terreno.personas.berta)
  await page.goto('/leads?panel=etiquetas')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  const etiquetas = page.getByRole('dialog', { name: 'Tus etiquetas' })
  await expect(etiquetas).toBeVisible()
  await cabeEnElModal(etiquetas, etiquetas.getByLabel('Nombre de la etiqueta nueva'), 200)
})

test('invitar: con algo escrito pregunta; sin rol dice el motivo junto al campo', async ({
  page,
}) => {
  await entrar(page, terreno.personas.duena)
  await page.goto('/configuracion/equipo')
  const abrir = () => page.getByRole('button', { name: 'Invitar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Invitar a una persona' })

  await abrir()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()

  await abrir()
  await dialogo.getByLabel('Correo', { exact: true }).fill(correoDePrueba('invitar-modal'))
  await dialogo.getByRole('button', { name: 'Invitar' }).click()
  await expect(dialogo.getByText('Elige el rol con el que entra.')).toBeVisible()

  await preguntaAlDescartar(page, dialogo, dialogo.getByLabel('Nombre y apellido'), {
    texto: 'Ana Medida',
  })
  await abrir()
  await expect(dialogo.getByLabel('Correo', { exact: true })).toHaveValue('')
  await expect(dialogo.getByLabel('Nombre y apellido')).toHaveValue('')
})

test('nuevo embudo: con algo escrito pregunta; un nombre repetido se dice junto al campo', async ({
  page,
}) => {
  await entrar(page, terreno.personas.berta)
  await irAlEmbudo(page)
  const abrir = () => page.getByRole('button', { name: 'Nuevo embudo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo embudo' })

  await abrir()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()

  await abrir()
  await dialogo.getByLabel('Nombre').fill('ventas')
  await dialogo.getByRole('button', { name: 'Crear embudo' }).click()
  await expect(dialogo.getByText('Ya tienes un embudo «Ventas».')).toBeVisible()
  await expect(dialogo.getByLabel('Nombre')).toBeFocused()

  await preguntaAlDescartar(page, dialogo, dialogo.getByLabel('Nombre'), {
    texto: 'Embudo que no se crea',
  })
  await abrir()
  await expect(dialogo.getByLabel('Nombre')).toHaveValue('')
})

test('nuevo embudo sin conexión: lo escrito queda, se dice, y se crea solo al volver', async ({
  page,
}, info) => {
  const nombre = `Sin red ${info.project.name}`
  await entrar(page, terreno.personas.berta)
  await irAlEmbudo(page)
  await page.getByRole('button', { name: 'Nuevo embudo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo embudo' })
  await dialogo.getByLabel('Nombre').fill(nombre)

  await page.context().setOffline(true)
  await expect(dialogo.getByText(/No hay conexión/)).toBeVisible()
  await dialogo.getByRole('button', { name: 'Crear embudo' }).click()
  await expect(
    dialogo.getByText(/Lo que escribiste sigue acá y se va a guardar solo/),
  ).toBeVisible()
  await expect(dialogo.getByLabel('Nombre')).toHaveValue(nombre)
  // Con la conexión caída el modal no se cierra por su cuenta ni tira lo escrito.
  await expect(dialogo).toBeVisible()

  await page.context().setOffline(false)
  await expect(page.getByRole('button', { name: `Embudo: ${nombre}` })).toBeVisible()
  await expect(dialogo).toBeHidden()
})

test('etiquetas: lo escrito en «Nueva etiqueta» pregunta antes de descartar', async ({ page }) => {
  await entrar(page, terreno.personas.berta)
  await page.goto('/leads?panel=etiquetas')
  const dialogo = page.getByRole('dialog', { name: 'Tus etiquetas' })
  const campo = dialogo.getByLabel('Nombre de la etiqueta nueva')

  await expect(dialogo).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()

  await page.goto('/leads?panel=etiquetas')
  await expect(dialogo).toBeVisible()
  await preguntaAlDescartar(page, dialogo, campo, {
    texto: 'Etiqueta que no se crea',
    conCancelar: false,
  })
})

test('sin permiso para gestionar, la URL de nuevo rol o de invitar no abre nada', async ({
  page,
}) => {
  await entrar(page, soloVe)
  await page.goto('/configuracion/roles?panel=nuevo-rol')
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nuevo rol' })).toHaveCount(0)

  await page.goto('/configuracion/equipo?panel=invitar')
  await expect(page.getByRole('heading', { name: 'Equipo', level: 1 })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
