import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  concesionesDelRol,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  exigirEquipoSinAjenos,
} from './soporte/base'
import { esMovil } from './soporte/inventario'
import { ingresar } from './soporte/pasos'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La rueda de turnos de la web por rol (`web.cola.participar`). Una vendedora —habilitada en la cola, con `leads.*` y sin el permiso— no
// recibe turnos de la web; la dueña le da el permiso a su rol en Configuración › Roles y la rueda la incluye al instante; se lo quita y
// vuelve a quedar fuera, sin que nadie toque su «habilitada». Lo visible: el interruptor de la matriz y «Turnos de la web» en Mi perfil, también
// bajo «Ver como». Lo que reparte lo decide la base: se comprueba llamando a `web.solicitar_asesor` como lo hace la web pública.
const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Prueba'
const VENDEDORA = 'Vera Vende'
const SIN_RUEDA = 'Tu rol no recibe turnos de la web.'
const CON_RUEDA =
  'Tu rol recibe turnos de la web. Quien administra la cola decide si estás en la rueda.'

let duena = ''
let vendedora = ''
let rol = ''
let vendedoraId = ''
let pedidos = 0

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await exigirEquipoSinAjenos()
  duena = correoDePrueba(`duena-rueda-${info.project.name}`)
  vendedora = correoDePrueba(`vendedora-rueda-${info.project.name}`)
  rol = `${PREFIJO_ROL_E2E}Vende ${info.project.name}`
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
  await crearPersona({ email: vendedora, contrasena: CLAVE, nombre: VENDEDORA, invitada: true })
  // Vende (leads) pero el rol no trae `web.cola.participar`.
  await darRolDePrueba({
    email: vendedora,
    rol: { nombre: rol, clave: `e2e_vende_${info.project.name}` },
    permisos: [
      { clave: 'leads.ver', alcance: 'propios' },
      'leads.crear',
      { clave: 'leads.editar', alcance: 'propios' },
    ],
  })
  const { data } = await admin()
    .from('perfiles')
    .select('id')
    .eq('email', vendedora)
    .single<{ id: string }>()
  vendedoraId = data?.id ?? ''
  // Habilitada en la cola y con WhatsApp: la decisión sobre la persona ya está tomada.
  sql(`
    update public.perfiles set whatsapp_web = '+59175550101' where id = ${literal(vendedoraId)};
    update public.cola_web_asesores set habilitado = true, disponible = true where usuario_id = ${literal(vendedoraId)};
  `)
})

test.afterAll(async () => {
  sql(`delete from public.solicitudes_contacto_web where token_visitante like 'e2eruedaporrol%'`)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Un visitante anónimo pide un asesor (la función que llama la web pública). Devuelve si le dieron el respaldo y a quién le tocó.
function pedirAsesor(proyecto: string): { respaldo: boolean; usuario: string | null } {
  pedidos += 1
  const token = `e2eruedaporrol${proyecto}${String(pedidos).padStart(3, '0')}`
  const r = JSON.parse(sql(`select web.solicitar_asesor(${literal(token)}, 'boton_general')`)) as {
    es_respaldo: boolean
  }
  const asignado = sql(
    `select coalesce(usuario_id::text, '') from public.solicitudes_contacto_web where token_visitante = ${literal(token)}`,
  )
  return { respaldo: r.es_respaldo, usuario: asignado === '' ? null : asignado }
}

// Mirar la app con los permisos de un rol: el menú de la dueña, «Ver como».
async function verComo(page: Page, nombreDelRol: string | null) {
  await page.getByRole('button', { name: `Menú de ${DUENA}` }).click()
  const opcion = page.getByRole('menuitemradio', { name: nombreDelRol ?? 'Yo, con mis permisos' })
  await opcion.click()
  // Elegir una perspectiva no cierra el menú: se espera a que quede marcada y se cierra con Esc.
  await expect(opcion).toBeChecked()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
}

test('la dueña le quita y le pone web.cola.participar a un rol, y la rueda lo respeta al instante', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  await entrar(page, duena)

  // 1) El rol vende pero no tiene el permiso: la matriz lo dice y la rueda no le da el turno aunque esté habilitada.
  await page.goto('/configuracion/roles')
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
  if (esMovil(page)) {
    await page.getByLabel('Rol a la vista').selectOption({ label: rol })
  }
  const interruptor = page.getByRole('switch', { name: `Recibir turnos de la web para ${rol}` })
  await expect(interruptor).not.toBeChecked()
  await interruptor.scrollIntoViewIfNeeded()
  await capturar(page, info, 'matriz-sin-el-permiso')
  expect(pedirAsesor(proyecto)).toEqual({ respaldo: true, usuario: null })

  // 2) Con «Ver como» ese rol, Mi perfil dice que no recibe turnos. Mirar no cambia la cuenta de la dueña.
  await verComo(page, rol)
  await page.goto('/perfil')
  await expect(page.getByText('Turnos de la web', { exact: true })).toBeVisible()
  await expect(page.getByText(SIN_RUEDA)).toBeVisible()
  await capturar(page, info, 'perfil-sin-turnos')

  // 3) La dueña le da el permiso al rol: el interruptor queda encendido, la base lo tiene y la rueda la incluye.
  await verComo(page, null)
  await page.goto('/configuracion/roles')
  if (esMovil(page)) {
    await page.getByLabel('Rol a la vista').selectOption({ label: rol })
  }
  await interruptor.click()
  await expect(interruptor).toBeChecked()
  expect((await concesionesDelRol(rol)).map((c) => c.permiso_clave)).toContain(
    'web.cola.participar',
  )
  expect(pedirAsesor(proyecto)).toEqual({ respaldo: false, usuario: vendedoraId })
  await interruptor.scrollIntoViewIfNeeded()
  await capturar(page, info, 'matriz-con-el-permiso')
  // Al 200 % del texto (reflujo, WCAG 1.4.10): la fila nueva cabe sin ensanchar la página.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await interruptor.scrollIntoViewIfNeeded()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'matriz-con-el-permiso-200')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })

  await verComo(page, rol)
  await page.goto('/perfil')
  await expect(page.getByText(CON_RUEDA)).toBeVisible()
  await expect(page.getByText(SIN_RUEDA)).toBeHidden()
  await capturar(page, info, 'perfil-con-turnos')
  await verComo(page, null)

  // 4) Se lo quita: fuera de la rueda otra vez, y su «habilitada» no se tocó (devolver el permiso la reincorpora como estaba).
  await page.goto('/configuracion/roles')
  if (esMovil(page)) {
    await page.getByLabel('Rol a la vista').selectOption({ label: rol })
  }
  await interruptor.click()
  await expect(interruptor).not.toBeChecked()
  expect(pedirAsesor(proyecto)).toEqual({ respaldo: true, usuario: null })
  expect(
    sql(
      `select habilitado from public.cola_web_asesores where usuario_id = ${literal(vendedoraId)}`,
    ),
  ).toBe('t')
})

test('quien no recibe turnos conserva su leads.* y su perfil se lo dice', async ({
  page,
}, info) => {
  // La vendedora, con su propia sesión y sin el permiso: entra a Leads y su perfil dice que su rol no recibe turnos.
  await entrar(page, vendedora)
  await page.goto('/leads')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Leads', level: 1 })).toBeAttached()
  await page.goto('/perfil')
  await expect(page.getByText(SIN_RUEDA)).toBeVisible()
  await capturar(page, info, 'vendedora-perfil')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(page.getByText(SIN_RUEDA)).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'vendedora-perfil-200')
})
