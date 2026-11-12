import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  exigirEquipoSinAjenos,
} from './soporte/base'
import { ingresar } from './soporte/pasos'
import { literal, sql } from './soporte/sql'

// Disponibilidad y ficha en Mi perfil (8.05-2). Una asesora habilitada en la cola, con WhatsApp y su rol con `web.cola.participar`: apaga «Disponible para recibir turnos» y
// la web ya no le reparte (cae al respaldo); lo enciende y vuelve a repartirle. Una vendedora cuyo rol no recibe turnos ve el interruptor apagado y deshabilitado, con su motivo.
// «Tu ficha en la web» guarda WhatsApp, identificador y «Aparecer en la web» en su fila de `perfiles`.
const CLAVE = 'una-clave-de-prueba-9'
const ASESORA = 'Alba Disponible'
const SIN_TURNOS = 'Sofía Sin Turnos'
const INTERRUPTOR = 'Disponible para recibir turnos'

let asesora = ''
let asesoraId = ''
let sinTurnos = ''
let pedidos = 0

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await exigirEquipoSinAjenos()
  const proyecto = info.project.name
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-disp-${proyecto}`),
    contrasena: CLAVE,
    nombre: 'Dora Disponible',
  })
  asesora = correoDePrueba(`asesora-disp-${proyecto}`)
  sinTurnos = correoDePrueba(`sinturnos-disp-${proyecto}`)
  await crearPersona({ email: asesora, contrasena: CLAVE, nombre: ASESORA, invitada: true })
  await crearPersona({ email: sinTurnos, contrasena: CLAVE, nombre: SIN_TURNOS, invitada: true })
  await darRolDePrueba({
    email: asesora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Disp ${proyecto}`, clave: `e2e_disp_${proyecto}` },
    permisos: [{ clave: 'leads.ver', alcance: 'propios' }, 'web.cola.participar'],
  })
  await darRolDePrueba({
    email: sinTurnos,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sin turnos ${proyecto}`, clave: `e2e_sinturnos_${proyecto}` },
    permisos: [{ clave: 'leads.ver', alcance: 'propios' }],
  })
  asesoraId = sql(`select id from public.perfiles where email = ${literal(asesora)}`)
  sql(`
    update public.perfiles set whatsapp_web = '+59175550104', handle = null, publico_web = false where id = ${literal(asesoraId)};
    update public.cola_web_asesores set habilitado = true, disponible = true where usuario_id = ${literal(asesoraId)};
  `)
})

test.afterAll(async () => {
  sql(`delete from public.solicitudes_contacto_web where token_visitante like 'e2eperfildisp%'`)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrarAlPerfil(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto('/perfil')
  await expect(page.getByRole('heading', { name: 'Mi perfil', level: 1 })).toBeVisible()
}

// Un visitante anónimo pide un asesor (lo que llama la web pública): devuelve a quién le tocó, o `null` si fue al respaldo.
function pedirAsesor(proyecto: string): string | null {
  pedidos += 1
  const token = `e2eperfildisp${proyecto}${String(pedidos).padStart(3, '0')}`
  sql(`select web.solicitar_asesor(${literal(token)}, 'boton_general')`)
  const usuario = sql(
    `select coalesce(usuario_id::text, '') from public.solicitudes_contacto_web where token_visitante = ${literal(token)}`,
  )
  return usuario === '' ? null : usuario
}

const disponibleEnLaBase = () =>
  sql(
    `select disponible::text from public.cola_web_asesores where usuario_id = ${literal(asesoraId)}`,
  )

test('apagar la disponibilidad corta el reparto y encenderla lo devuelve', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  await entrarAlPerfil(page, asesora)
  const interruptor = page.getByRole('switch', { name: INTERRUPTOR })
  await expect(interruptor).toBeChecked()
  expect(pedirAsesor(proyecto)).toBe(asesoraId)

  await interruptor.click()
  await expect(interruptor).not.toBeChecked()
  await expect.poll(disponibleEnLaBase).toBe('false')
  expect(pedirAsesor(proyecto)).toBeNull()

  await interruptor.click()
  await expect(interruptor).toBeChecked()
  await expect.poll(disponibleEnLaBase).toBe('true')
  expect(pedirAsesor(proyecto)).toBe(asesoraId)

  // Al volver a abrir la pantalla queda como se dejó.
  await page.reload()
  await expect(page.getByRole('switch', { name: INTERRUPTOR })).toBeChecked()
})

test('con un rol que no recibe turnos, el interruptor queda apagado y dice por qué', async ({
  page,
}) => {
  await entrarAlPerfil(page, sinTurnos)
  const interruptor = page.getByRole('switch', { name: INTERRUPTOR })
  await expect(interruptor).not.toBeChecked()
  await expect(interruptor).toBeDisabled()
  await expect(page.getByText('Tu rol no recibe turnos de la web.').first()).toBeVisible()
})

test('«Tu ficha en la web» guarda el WhatsApp, el identificador y aparecer en la web', async ({
  page,
}, info) => {
  const handle = `e2e-ficha-${info.project.name}`
  await entrarAlPerfil(page, asesora)
  await page.locator('summary', { hasText: 'Tu ficha en la web' }).click()
  await page.getByLabel('Identificador').fill(handle.toUpperCase())
  await page.getByLabel('WhatsApp', { exact: true }).fill('+59171112222')
  await page.getByLabel('Cargo').fill('Asesora de ventas')
  await page.getByLabel('Especialidades').fill('SUV, camionetas')
  await page.getByRole('switch', { name: 'Aparecer en la web' }).click()
  await page.getByRole('button', { name: 'Guardar' }).last().click()

  await expect
    .poll(() =>
      sql(
        `select handle || '|' || whatsapp_web || '|' || cargo_web || '|' || array_to_string(especialidades, ',') || '|' || publico_web::text from public.perfiles where id = ${literal(asesoraId)}`,
      ),
    )
    .toBe(`${handle}|+59171112222|Asesora de ventas|SUV,camionetas|true`)

  // «Tus datos» sigue guardando después: su versión se renovó con la de la ficha.
  await expect(page.getByLabel('Identificador')).toHaveValue(handle)
})
