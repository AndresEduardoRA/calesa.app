import { expect, test } from './soporte/prueba'
import {
  admin,
  borrarPersonasDePrueba,
  correoDePrueba,
  crearPersona,
  enlaceDelCorreo,
  hayEquipoQueImpide,
  rolesDe,
} from './soporte/base'
import { ingresar } from './soporte/pasos'

// Acceso y shell contra la app compilada y el Supabase local. Los cuatro tests cuentan una sola
// historia, en orden: la primera persona se registra y queda dueña; después se prueba el ingreso
// con esa cuenta. Al terminar se borra todo lo que se creó. El primero corre siempre en
// `pnpm test:e2e:completo` y en CI; sólo un spec suelto sobre una base con cuentas lo salta con un
// aviso: la cuenta que prueba el ingreso se crea entonces por la puerta de atrás, como invitada.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const NOMBRE = 'Dalia Prueba'
let email = ''
let impide = { saltar: false, motivo: '' }
// El registro tiene que estar cerrado para que el segundo test lo compruebe; si la empresa real lo
// tenía abierto, se cierra mientras corre y vuelve a como estaba.
let registroAbierto: boolean | null = null

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  // «La primera persona nace dueña» sólo se puede probar sin nadie en el equipo.
  impide = await hayEquipoQueImpide()
  email = correoDePrueba(`duena-${info.project.name}`)
  const ajustes = await admin()
    .from('ajustes_empresa')
    .select('registro_abierto')
    .eq('id', 1)
    .single<{ registro_abierto: boolean }>()
  registroAbierto = ajustes.data?.registro_abierto ?? null
  if (impide.saltar) {
    await crearPersona({ email, contrasena: CLAVE, nombre: NOMBRE, invitada: true })
    await admin().from('ajustes_empresa').update({ registro_abierto: false }).eq('id', 1)
  }
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  if (registroAbierto !== null) {
    await admin().from('ajustes_empresa').update({ registro_abierto: registroAbierto }).eq('id', 1)
  }
})

test('la primera persona que se registra nace dueña y ve su menú', async ({ page, isMobile }) => {
  test.skip(impide.saltar, impide.motivo)
  await page.goto('/ingreso')
  await page.getByRole('link', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL('/registro')
  await expect(page.getByText('nace con el rol de dueño')).toBeVisible()

  await page.getByLabel('Nombre y apellido').fill(NOMBRE)
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL('/ingreso?aviso=confirmar_correo')
  await expect(page.getByText('Te enviamos un correo para confirmarla')).toBeVisible()

  // El enlace de confirmación la deja adentro, en el inicio.
  await page.goto(await enlaceDelCorreo(email))
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Hola, Dalia' })).toBeVisible()
  expect(await rolesDe(email)).toEqual(['dueno'])

  // Como dueña tiene todos los permisos: la bandeja trae bloques de ventas y de logística.
  await expect(page.getByRole('heading', { name: 'Recordatorios de hoy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vehículos trabados' })).toBeVisible()

  // Su menú: lo que tiene pantalla, y nada que lleve a un 404.
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
  }
  const menu = page.getByRole('navigation', { name: 'Principal' })
  await expect(menu.getByRole('link', { name: 'Inicio' })).toBeVisible()
  for (const enlace of await menu.getByRole('link').all()) {
    const destino = await enlace.getAttribute('href')
    const respuesta = await page.request.get(destino ?? '/no-existe')
    expect(respuesta.status(), `el menú enlaza a ${String(destino)}`).toBe(200)
  }
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('con el equipo ya creado y el registro cerrado no se ofrece crear cuenta', async ({
  page,
}) => {
  await page.goto('/ingreso')
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveCount(0)

  // Y si alguien llega por URL, no hay formulario: se le explica.
  await page.goto('/registro')
  await expect(page.getByText('El registro de cuentas nuevas está cerrado')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('una contraseña mala da un mensaje que no dice si el correo existe', async ({ page }) => {
  await page.goto('/ingreso')

  await ingresar(page, email, 'no-es-la-clave')
  const mensaje = page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos.' })
  await expect(mensaje).toBeVisible()
  await expect(page).toHaveURL('/ingreso')
  // No se pierde lo tipeado.
  await expect(page.getByLabel('Correo')).toHaveValue(email)

  // Un correo que no existe recibe exactamente la misma respuesta.
  await ingresar(page, correoDePrueba('nadie'), 'no-es-la-clave')
  await expect(mensaje).toBeVisible()
})

test('una ruta protegida manda al ingreso y después vuelve a donde iba', async ({ page }) => {
  await page.goto('/perfil?desde=e2e')
  await expect(page).toHaveURL('/ingreso?returnTo=%2Fperfil%3Fdesde%3De2e')

  await ingresar(page, email, CLAVE)
  await expect(page).toHaveURL('/perfil?desde=e2e')
  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible()
  await expect(page.getByLabel('Nombre y apellido')).toHaveValue(NOMBRE)

  // Con sesión, el ingreso ya no se muestra: devuelve al inicio.
  await page.goto('/ingreso')
  await expect(page).toHaveURL('/')
})
