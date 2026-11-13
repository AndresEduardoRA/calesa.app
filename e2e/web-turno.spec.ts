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

// La tarjeta de turno en Inicio (8.05-1). Una asesora habilitada en la cola, con WhatsApp y su rol con `web.cola.participar`, recibe un turno cuando un visitante
// anónimo pide un asesor (`web.solicitar_asesor`, lo que llama la web pública). Inicio lo muestra con su código, la fuente y la cuenta regresiva; «Contacté» lo confirma
// en un toque y la tarjeta se va; «Vincular a lead» abre el panel, elige uno de sus leads y lo deja vinculado. La dueña, que gestiona la cola y por eso la RLS le deja
// ver todos los turnos, en su Inicio sólo ve los suyos.
const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Turno'
const ASESORA = 'Aida Turno'
const BLOQUE = 'Turnos de la web sin confirmar'

let duena = ''
let asesora = ''
let asesoraId = ''
let nombreDelLead = ''
let leadId = ''
let pedidos = 0

// El lead lo creó la asesora: hay que quitarlo antes de borrar a la persona.
const quitarLeads = () =>
  sql(`delete from public.solicitudes_contacto_web where token_visitante like 'e2eturno%';
       delete from public.leads where nombre like 'E2E Turno %';`)

test.beforeAll(async ({}, info) => {
  quitarLeads()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await exigirEquipoSinAjenos()
  const proyecto = info.project.name
  duena = correoDePrueba(`duena-turno-${proyecto}`)
  asesora = correoDePrueba(`asesora-turno-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
  await crearPersona({ email: asesora, contrasena: CLAVE, nombre: ASESORA, invitada: true })
  await darRolDePrueba({
    email: asesora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Turno ${proyecto}`, clave: `e2e_turno_${proyecto}` },
    permisos: [
      { clave: 'leads.ver', alcance: 'propios' },
      'leads.crear',
      { clave: 'leads.editar', alcance: 'propios' },
      'web.cola.participar',
    ],
  })
  asesoraId = sql(`select id from public.perfiles where email = ${literal(asesora)}`)
  nombreDelLead = `E2E Turno ${proyecto}`
  const telefono = `591788${proyecto === 'movil' ? '2' : '1'}0001`
  sql(`
    update public.perfiles set whatsapp_web = '+59175550103' where id = ${literal(asesoraId)};
    update public.cola_web_asesores set habilitado = true, disponible = true where usuario_id = ${literal(asesoraId)};
    delete from public.solicitudes_contacto_web where token_visitante like 'e2eturno%';
  `)
  leadId = sql(`with l as (insert into public.leads (nombre, telefono_principal, creado_por)
                           values (${literal(nombreDelLead)}, ${literal(telefono)}, ${literal(asesoraId)}) returning id),
                     a as (insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso)
                           select id, ${literal(asesoraId)}, 'dueno' from l)
                select id from l`)
})

test.afterAll(async () => {
  sql(`delete from public.notificaciones where usuario_id = ${literal(asesoraId)}`)
  sql(`delete from public.solicitudes_contacto_web where token_visitante like 'e2eturno%'`)
  quitarLeads()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Un visitante anónimo pide un asesor y le toca a la asesora (la única habilitada). Devuelve el código del turno y su id.
function pedirTurno(proyecto: string): { id: string; codigo: string } {
  pedidos += 1
  const token = `e2eturno${proyecto}${String(pedidos).padStart(3, '0')}`
  sql(`select web.solicitar_asesor(${literal(token)}, 'boton_general')`)
  const fila = sql(
    `select id || '|' || codigo from public.solicitudes_contacto_web where token_visitante = ${literal(token)} and usuario_id = ${literal(asesoraId)}`,
  )
  const [id = '', codigo = ''] = fila.split('|')
  expect(id).not.toBe('')
  return { id, codigo }
}

const solicitud = (id: string, columna: string) =>
  sql(`select ${columna}::text from public.solicitudes_contacto_web where id = ${literal(id)}`)

test('«Contacté» confirma el turno en un toque y la tarjeta se va', async ({ page }, info) => {
  const turno = pedirTurno(info.project.name)
  const antes = Number(
    sql(
      `select contactadas_total from public.cola_web_asesores where usuario_id = ${literal(asesoraId)}`,
    ),
  )
  await entrar(page, asesora)
  const bloque = page.getByRole('region', { name: BLOQUE })
  const tarjeta = bloque.getByRole('article', { name: `Turno ${turno.codigo}` })
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta.getByText('boton_general')).toBeVisible()
  await expect(tarjeta.getByText(/^Vence en /)).toBeVisible()

  let toques = 0
  await tarjeta.getByRole('button', { name: 'Contacté' }).click()
  toques += 1
  expect(toques).toBeLessThanOrEqual(2)

  await expect(tarjeta).toHaveCount(0)
  expect(solicitud(turno.id, 'estado')).toBe('contactada')
  expect(solicitud(turno.id, 'senal_contacto')).toBe('manual')
  const despues = Number(
    sql(
      `select contactadas_total from public.cola_web_asesores where usuario_id = ${literal(asesoraId)}`,
    ),
  )
  expect(despues).toBe(antes + 1)
})

test('«Vincular a lead» elige uno de sus leads y deja el turno vinculado', async ({
  page,
}, info) => {
  const turno = pedirTurno(info.project.name)
  await entrar(page, asesora)
  const tarjeta = page
    .getByRole('region', { name: BLOQUE })
    .getByRole('article', { name: `Turno ${turno.codigo}` })
  await expect(tarjeta).toBeVisible()
  await tarjeta.getByRole('button', { name: 'Vincular a lead' }).click()

  const panel = page.getByRole('dialog', { name: 'Vincular a un lead' })
  await expect(panel).toBeVisible()
  await expect(page).toHaveURL(
    new RegExp(`panel=vincular-turno.*turno=${turno.id}|turno=${turno.id}.*panel=vincular-turno`),
  )
  await panel.getByText(nombreDelLead).first().click()

  await expect(panel).toBeHidden()
  await expect(tarjeta).toHaveCount(0)
  expect(solicitud(turno.id, 'lead_id')).toBe(leadId)
  expect(solicitud(turno.id, 'senal_contacto')).toBe('lead')
  expect(solicitud(turno.id, 'estado')).toBe('contactada')
})

test('quien gestiona la cola no ve en su Inicio los turnos de otra persona', async ({
  page,
}, info) => {
  const turno = pedirTurno(info.project.name)
  await entrar(page, duena)
  const bloque = page.getByRole('region', { name: BLOQUE })
  await expect(bloque).toBeVisible()
  await expect(bloque.getByText('Sin turnos pendientes', { exact: false })).toBeVisible()
  await expect(page.getByText(turno.codigo)).toHaveCount(0)
})

// El «nunca» de la tarea de oro 4 (docs/UX.md): un turno no vence sin que la asesora se entere. Se adelanta el vencimiento y se corre lo que corre el job cada
// 5 min (`web_expirar_solicitudes`); el número que devuelve no se afirma porque el job pudo correr antes.
test('un turno que vence sin «Contacté» queda «Vencido» en Inicio y avisa a la asesora', async ({
  page,
}, info) => {
  const turno = pedirTurno(info.project.name)
  sql(`update public.solicitudes_contacto_web set vence_en = now() - interval '1 minute' where id = ${literal(turno.id)};
       select public.web_expirar_solicitudes();`)
  expect(solicitud(turno.id, 'estado')).toBe('vencida')
  expect(
    sql(`select count(*) from public.notificaciones where usuario_id = ${literal(asesoraId)}
           and tipo = 'turno_web_perdido' and referencia_id = ${literal(turno.id)}`),
  ).toBe('1')

  await entrar(page, asesora)
  const tarjeta = page
    .getByRole('region', { name: BLOQUE })
    .getByRole('article', { name: `Turno ${turno.codigo}` })
  await expect(tarjeta.getByText('Vencido')).toBeVisible()

  await page.goto('/notificaciones')
  const aviso = page
    .locator('li[data-notificacion]')
    .filter({ hasText: 'Se venció un turno de la web' })
    .filter({ hasText: turno.codigo })
  await expect(aviso).toBeVisible()
})
