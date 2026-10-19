import { expect, test, type Browser, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  enlaceDelCorreo,
  rolesDe,
} from './soporte/base'
import {
  ajustesGuardados,
  estadoDeApibara,
  pedirSecreto,
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  ultimoCambioDe,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'

// Configuración › Empresa contra la app compilada y el Supabase local. La empresa es una fila
// única: antes de empezar se guarda cómo estaba y al terminar se deja exactamente así, para el
// spec que sigue en la misma corrida.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Prueba'
const CAMBISTA = 'Carla Cambios'
// Sólo `viewBox`, sin ancho ni alto: el caso que hay que saber dibujar.
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" rx="8" fill="#0b7285"/><circle cx="30" cy="30" r="14" fill="#fff"/></svg>'
const MOTIVO_SIN_PERMISO =
  'Puedes ver los ajustes de la empresa, pero no tienes permiso para cambiarlos.'

let duena = ''
let cambista = ''
let proyecto = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  proyecto = info.project.name
  duena = correoDePrueba(`duena-empresa-${proyecto}`)
  cambista = correoDePrueba(`cambista-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
  // Alguien que gestiona los tipos de cambio y nada más de la empresa.
  await crearPersona({ email: cambista, contrasena: CLAVE, nombre: CAMBISTA, invitada: true })
  await darRolDePrueba({
    email: cambista,
    rol: { nombre: `${PREFIJO_ROL_E2E}Cambios ${proyecto}`, clave: `e2e_cambios_${proyecto}` },
    permisos: ['empresa.tipos_cambio.gestionar'],
  })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Otra persona, en su propio navegador (sus cookies no se mezclan con las de la dueña).
async function otraPersona(browser: Browser, page: Page): Promise<Page> {
  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  return contexto.newPage()
}

test('la dueña cambia el nombre y la zona horaria y se ven en el shell', async ({
  page,
  isMobile,
}) => {
  const nombre = `Importadora Andina ${proyecto}`
  await entrar(page, duena)

  // Llega por su menú: Configuración → Empresa.
  await page.getByRole('button', { name: `Menú de ${DUENA}` }).click()
  await page.getByRole('menuitem', { name: 'Configuración' }).click()
  await page.getByRole('link', { name: /Empresa/ }).click()
  await expect(page.getByRole('heading', { name: 'Empresa', level: 1 })).toBeVisible()

  await page.getByLabel('Nombre de la empresa').fill(nombre)
  await page.getByLabel('Zona horaria').fill('Asia/Tokyo')
  // El código de país de los teléfonos de los leads: con la forma de un código o vacío.
  await page.getByLabel('Código de país de los teléfonos').fill('54')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('El código de país lleva un «+» y de 1 a 3 dígitos.')).toBeVisible()
  await expect(page.getByLabel('Código de país de los teléfonos')).toHaveValue('54')
  await page.getByLabel('Código de país de los teléfonos').fill('+54')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()

  // El nombre, en la marca del marco: la barra lateral en escritorio, el menú en el celular.
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
    await expect(page.getByRole('dialog').getByText(nombre)).toBeVisible()
    await page.keyboard.press('Escape')
    // Mientras el menú se va, la barra superior ya se ve y el menú aún tiene su copia del botón: el clic de abajo
    // vería dos «Tipos de cambio» (visto en la corrida del 5a-fix-3: el clic salió 1 ms después del Escape).
    await expect(page.getByRole('dialog')).toBeHidden()
  } else {
    await expect(page.getByRole('complementary').getByText(nombre)).toBeVisible()
  }

  // La zona horaria, en la barra superior: las horas de los tipos de cambio se muestran en ella.
  await page.getByRole('button', { name: 'Tipos de cambio' }).click()
  await expect(page.getByText('Las horas están en Asia/Tokyo.')).toBeVisible()
  await page.keyboard.press('Escape')

  // Lo que quedó en la base.
  expect(await ajustesGuardados()).toMatchObject({
    nombre,
    zona_horaria: 'Asia/Tokyo',
    telefono_cc: '+54',
  })

  // Una zona que no existe se rechaza con el motivo, y lo tipeado queda.
  await page.getByLabel('Zona horaria').fill('Marte/Olympus')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Esa zona horaria no existe')).toBeVisible()
  await expect(page.getByLabel('Zona horaria')).toHaveValue('Marte/Olympus')
  // Y el foco va al campo con error: guardando el formulario estaba deshabilitado.
  await expect(page.getByLabel('Zona horaria')).toBeFocused()
  expect((await ajustesGuardados()).zona_horaria).toBe('Asia/Tokyo')
})

test('edita un tipo de cambio y aparece en la barra superior y en el historial', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa?seccion=monedas')
  await expect(page.getByRole('heading', { name: 'Tipos de cambio' })).toBeVisible()
  const enLaBarra = page.getByRole('button', { name: 'Tipos de cambio' })
  await expect(enLaBarra).toContainText('6,96')

  // Tocar el tipo de cambio abre su panel, con el valor listo para cambiar.
  await page.getByRole('button', { name: /^Oficial/ }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: 'Oficial' })).toBeVisible()
  await panel.getByLabel(/^Valor/).fill('7,13')
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Tipo de cambio «Oficial» guardado')).toBeVisible()

  // El historial del panel dice de cuánto a cuánto y quién.
  const cambio = panel.getByRole('listitem').filter({ hasText: '7,13' }).first()
  await expect(cambio).toContainText('6,96')
  await expect(cambio).toContainText(DUENA)
  expect(await ultimoCambioDe('oficial')).toMatchObject({ valor_anterior: 6.96, valor_nuevo: 7.13 })

  // Y la barra superior muestra el valor nuevo, sin recargar.
  await panel.getByRole('button', { name: 'Cerrar' }).first().click()
  await expect(panel).toBeHidden()
  await expect(enLaBarra).toContainText('7,13')
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin el permiso de ajustes, la pestaña Empresa sale deshabilitada con el motivo', async ({
  page,
  browser,
}) => {
  await page.goto('/ingreso')
  const suya = await otraPersona(browser, page)
  await entrar(suya, cambista)

  // La sección aparece en su Configuración: tiene uno de los dos permisos de la empresa.
  await suya.goto('/configuracion')
  await suya.getByRole('link', { name: /Empresa/ }).click()
  await expect(suya.getByText(MOTIVO_SIN_PERMISO)).toBeVisible()
  await expect(suya.getByLabel('Nombre de la empresa')).toBeDisabled()
  await expect(suya.getByLabel('Zona horaria')).toBeDisabled()
  await expect(suya.getByRole('button', { name: 'Subir logo' })).toBeDisabled()
  await expect(suya.getByRole('button', { name: 'Guardar', exact: true })).toBeHidden()

  // Lo que sí gestiona, lo edita: los tipos de cambio.
  await suya.getByRole('tab', { name: 'Monedas' }).click()
  await expect(suya.getByRole('button', { name: 'Nuevo tipo de cambio' })).toBeVisible()
  await suya.context().close()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('guarda la clave de apibara sin volver a mostrarla, y recién entonces la activa', async ({
  page,
}) => {
  const secreto = `e2e-clave-${proyecto}-0123456789`
  await entrar(page, duena)
  await page.goto('/configuracion/empresa?seccion=integraciones')

  // Sin clave guardada no se puede activar, y se dice por qué.
  const activa = page.getByRole('switch', { name: 'Activa' })
  await expect(activa).toHaveAttribute('data-disabled', '')
  await expect(page.getByText('Guarda la clave antes de activarla.')).toBeVisible()

  await page.getByLabel('Clave', { exact: true }).fill(secreto)
  await page.getByRole('button', { name: 'Guardar clave' }).click()
  await expect(page.getByText('Clave de apibara guardada')).toBeVisible()

  // Queda dicho que está guardada; la clave no vuelve, ni a la vista ni en lo que manda el servidor.
  await expect(page.getByText(/Guardada el .+ No se puede ver/)).toBeVisible()
  await expect(page.getByLabel('Clave', { exact: true })).toBeHidden()
  expect(await page.content()).not.toContain(secreto)
  await page.getByRole('button', { name: 'Reemplazar' }).click()
  await expect(page.getByLabel('Clave nueva')).toHaveValue('')
  await page.getByRole('button', { name: 'Cancelar' }).click()

  // Con la clave en Vault, ahora sí. Prender el interruptor no borra lo tipeado y sin guardar en
  // la configuración, aunque las dos cosas sean la misma fila.
  await page.getByLabel('Dirección del servicio').fill('https://api.apibara.tech/v2')
  await activa.click()
  await expect(page.getByText('apibara activada')).toBeVisible()
  await expect(activa).toBeChecked()
  await expect(page.getByLabel('Dirección del servicio')).toHaveValue('https://api.apibara.tech/v2')

  // La dirección no puede apuntar fuera de apibara.tech: ahí viaja la clave.
  await page.getByLabel('Dirección del servicio').fill('https://atacante.example')
  await page.getByRole('button', { name: 'Guardar configuración' }).click()
  // El error, no la ayuda: las dos dicen «ser de apibara.tech».
  await expect(page.locator('#endpoint-error')).toContainText('ser de apibara.tech')
  expect(await estadoDeApibara()).toEqual({ activa: true, conSecreto: true })

  // Contra la base real: ni quien la guardó ni alguien sin sesión pueden pedir la clave.
  const rechazo = { codigo: '42501', dato: null }
  expect(await pedirSecreto({ email: duena, contrasena: CLAVE })).toEqual(rechazo)
  expect(await pedirSecreto()).toEqual(rechazo)

  await page.reload()
  await expect(page.getByRole('switch', { name: 'Activa' })).toBeChecked()
  expect(await page.content()).not.toContain(secreto)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin conexión, el formulario avisa y conserva lo tipeado', async ({ page, context }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')
  await page.getByLabel('Razón social').fill('Andina SRL')

  await context.setOffline(true)
  await expect(page.getByText('No hay conexión. Puedes seguir escribiendo')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText(/Lo que escribiste sigue acá/)).toBeVisible()
  await expect(page.getByLabel('Razón social')).toHaveValue('Andina SRL')

  // Vuelve la conexión: el mismo formulario, con lo mismo, se guarda.
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()

  // Lo tipeado y no guardado sobrevive a recargar la pantalla, y se puede descartar.
  await page.getByLabel('NIT').fill('1020304050')
  // Lo primero: que lo tipeado haya llegado a un campo que siga ahí (no al formulario que se estaba
  // reemplazando con lo guardado).
  await expect(page.getByLabel('NIT')).toHaveValue('1020304050')
  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito')).toBeVisible()
  await expect(page.getByLabel('NIT')).toHaveValue('1020304050')
  await expect(page.getByLabel('Razón social')).toHaveValue('Andina SRL')
  await page.getByRole('button', { name: 'Descartar' }).click()
  await expect(page.getByLabel('NIT')).toHaveValue('')
})

type Manifest = { name: string; icons: { src: string; purpose?: string }[] }

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('carga el logo al guardar, regenera los íconos y el manifest los sirve', async ({
  page,
  request,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/empresa')
  const selector = page.getByLabel('Elegir el logo de la empresa')

  // Sin logo no hay de dónde dibujarlos, y se dice.
  await expect(page.getByRole('button', { name: 'Regenerar íconos' })).toBeDisabled()
  await expect(page.getByText('Carga el logo y guarda')).toBeVisible()

  // Un formato que no sirve se rechaza al elegirlo, con el motivo.
  await selector.setInputFiles({
    name: 'logo.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a'),
  })
  await expect(page.getByText('El logo tiene que ser SVG, PNG, WebP o JPEG.')).toBeVisible()

  // Elegir uno válido sólo lo muestra: todavía no hay nada en la base.
  await selector.setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(LOGO_SVG),
  })
  await expect(page.getByRole('button', { name: 'Cambiar logo' })).toBeVisible()
  expect((await ajustesGuardados()).logo_ruta).toBeNull()

  // Si el logo no sube, la fila no se guarda.
  await page.route('**/storage/v1/object/marca/**', (ruta) => ruta.abort())
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('No se pudo subir el archivo')).toBeVisible()
  expect((await ajustesGuardados()).logo_ruta).toBeNull()
  await page.unroute('**/storage/v1/object/marca/**')

  // Ahora sí: se sube al guardar.
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()
  expect((await ajustesGuardados()).logo_ruta).toMatch(/^logos\/[0-9a-f]{64}\.svg$/)

  // Regenerar los dibuja y los muestra; recién al confirmar se suben y se guardan.
  await page.getByText('Blanco', { exact: true }).click()
  await page.getByRole('button', { name: 'Regenerar íconos' }).click()
  await expect(page.getByLabel('Vista previa de los íconos')).toBeVisible()
  expect((await ajustesGuardados()).iconos).toBeNull()
  await page.getByRole('button', { name: 'Guardar íconos' }).click()
  await expect(page.getByText('Íconos de la app guardados')).toBeVisible()
  expect(Object.keys((await ajustesGuardados()).iconos ?? {}).sort()).toEqual([
    '180',
    '192',
    '32',
    '512',
    '512m',
  ])

  // El manifest (que se pide sin sesión) trae el nombre de la empresa y los íconos de Storage.
  const manifest = (await (await request.get('/manifest.webmanifest')).json()) as Manifest
  expect(manifest.name).toContain('Importadora Andina')
  expect(manifest.icons).toHaveLength(3)
  for (const icono of manifest.icons) {
    expect(icono.src).toContain('/storage/v1/object/public/marca/iconos/')
    const respuesta = await request.get(icono.src)
    expect(respuesta.headers()['content-type']).toBe('image/png')
  }
  expect(manifest.icons.filter((icono) => icono.purpose === 'maskable')).toHaveLength(1)

  // Y el <link rel="icon"> del documento redirige al generado.
  const vigente = await request.get('/iconos/vigente/32', { maxRedirects: 0 })
  expect(vigente.status()).toBe(307)
  expect(vigente.headers()['location']).toContain('/marca/iconos/')

  // Volver a los neutros deja el manifest como al instalar.
  await page.getByRole('button', { name: 'Volver a los neutros' }).click()
  await expect(page.getByText('La app vuelve a usar los íconos neutros')).toBeVisible()
  const neutro = (await (await request.get('/manifest.webmanifest')).json()) as Manifest
  expect(neutro.icons[0]?.src).toBe('/iconos/icono-192.png')
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('la dueña abre el registro y otra persona crea su cuenta y entra, sin rol', async ({
  page,
  browser,
}) => {
  const nueva = correoDePrueba(`registrada-${proyecto}`)
  await entrar(page, duena)

  // Con el registro cerrado y el equipo ya creado, la pantalla de ingreso no ofrece crear cuenta.
  const suya = await otraPersona(browser, page)
  await suya.goto('/ingreso')
  await expect(suya.getByRole('link', { name: 'Crear cuenta' })).toBeHidden()

  await page.goto('/configuracion/empresa')
  // Mientras la página llega en streaming el título puede estar dos veces: se toca el visible.
  await page.getByText('Políticas', { exact: true }).filter({ visible: true }).click()
  await page.getByRole('switch', { name: 'Registro abierto' }).click()
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Ajustes de la empresa guardados')).toBeVisible()

  // Ahora sí: se registra, confirma su correo y queda adentro, sin ningún rol.
  await suya.reload()
  await suya.getByRole('link', { name: 'Crear cuenta' }).click()
  await suya.getByLabel('Nombre y apellido').fill('Nora Nueva')
  await suya.getByLabel('Correo').fill(nueva)
  await suya.getByLabel('Contraseña').fill(CLAVE)
  await suya.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(suya).toHaveURL('/ingreso?aviso=confirmar_correo')
  await suya.goto(await enlaceDelCorreo(nueva))
  await expect(suya).toHaveURL('/')
  expect(await rolesDe(nueva)).toEqual([])
  await suya.context().close()
})
