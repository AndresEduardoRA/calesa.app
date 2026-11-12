// @sin-celular-archivo: pantalla de Configuración; la persona pidió no probarla en celular (e2e.md, 2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  admin,
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

// El tablero de la cola web (8.04-2, abierto 8-1). Una vendedora habilitada en la cola, con WhatsApp y disponible, pero cuyo rol no tiene
// `web.cola.participar`: la dueña la ve aparte, en «Habilitada, pero su rol no recibe turnos de la web», y no en la rueda. Cuando su rol recibe el permiso,
// «Actualizar» la pasa a la rueda. Arriba, «Sin asignar» muestra la solicitud que no encontró asesor. La 8.04-3 suma «habilitar sin el permiso avisa».
const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Cola'
const VENDEDORA = 'Vera Cola'
const EN_LA_RUEDA = 'En la rueda'
const SIN_ROL = 'Habilitada, pero su rol no recibe turnos de la web'

let duena = ''
let rolId = ''
let token = ''
let codigo = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await exigirEquipoSinAjenos()
  const proyecto = info.project.name
  duena = correoDePrueba(`duena-cola-${proyecto}`)
  const vendedora = correoDePrueba(`vendedora-cola-${proyecto}`)
  const rol = `${PREFIJO_ROL_E2E}Cola ${proyecto}`
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
  await crearPersona({ email: vendedora, contrasena: CLAVE, nombre: VENDEDORA, invitada: true })
  // Vende (leads) pero el rol no trae `web.cola.participar`.
  await darRolDePrueba({
    email: vendedora,
    rol: { nombre: rol, clave: `e2e_cola_${proyecto}` },
    permisos: [{ clave: 'leads.ver', alcance: 'propios' }],
  })
  const cliente = admin()
  const { data: perfil } = await cliente
    .from('perfiles')
    .select('id')
    .eq('email', vendedora)
    .single<{ id: string }>()
  const { data: fila } = await cliente
    .from('roles')
    .select('id')
    .eq('nombre', rol)
    .single<{ id: string }>()
  rolId = fila?.id ?? ''
  token = `e2ecolatablero${proyecto}0001`
  codigo = `#WEB-E2E-${proyecto.slice(0, 4).toUpperCase()}`
  // Habilitada en la cola, con WhatsApp y disponible: sólo le falta el permiso del rol. Y una solicitud que no encontró asesor.
  sql(`
    update public.perfiles set whatsapp_web = '+59175550102' where id = ${literal(perfil?.id ?? '')};
    update public.cola_web_asesores set habilitado = true, disponible = true where usuario_id = ${literal(perfil?.id ?? '')};
    delete from public.solicitudes_contacto_web where token_visitante like 'e2ecolatablero%';
    insert into public.solicitudes_contacto_web (codigo, token_visitante, estado, fuente)
      values (${literal(codigo)}, ${literal(token)}, 'sin_asignar', 'boton_general');
  `)
})

test.afterAll(async () => {
  sql(`delete from public.solicitudes_contacto_web where token_visitante like 'e2ecolatablero%'`)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Cada prueba deja el permiso del rol como lo necesita: no depende de la otra.
function permisoDeLaRueda(dar: boolean) {
  sql(
    dar
      ? `insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
           values (${literal(rolId)}, 'web.cola.participar', null, 'todos') on conflict do nothing`
      : `delete from public.roles_permisos where rol_id = ${literal(rolId)} and permiso_clave = 'web.cola.participar'`,
  )
}

async function abrirElTablero(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto('/configuracion/cola-web')
  await expect(page.getByRole('heading', { name: 'Cola web', level: 1 })).toBeVisible()
}

test('la habilitada cuyo rol no recibe turnos figura aparte, y la sin asignar arriba', async ({
  page,
}) => {
  permisoDeLaRueda(false)
  await abrirElTablero(page)
  const aparte = page.getByRole('region', { name: SIN_ROL })
  await expect(aparte.getByText(VENDEDORA)).toBeVisible()
  await expect(aparte.getByRole('link', { name: 'Se cambia en Roles.' })).toBeVisible()
  await expect(page.getByRole('region', { name: EN_LA_RUEDA }).getByText(VENDEDORA)).toHaveCount(0)
  const sinAsignar = page.getByRole('region', { name: /^Sin asignar/ })
  await expect(sinAsignar.getByText(codigo)).toBeVisible()
  await expect(sinAsignar.getByText('boton_general')).toBeVisible()
})

test('con el permiso en su rol, «Actualizar» la pasa a la rueda', async ({ page }) => {
  permisoDeLaRueda(false)
  await abrirElTablero(page)
  const rueda = page.getByRole('region', { name: EN_LA_RUEDA })
  await expect(page.getByRole('region', { name: SIN_ROL }).getByText(VENDEDORA)).toBeVisible()

  permisoDeLaRueda(true)
  await page.getByRole('button', { name: 'Actualizar' }).click()
  await expect(rueda.getByText(VENDEDORA)).toBeVisible()
  await expect(page.getByRole('region', { name: SIN_ROL }).getByText(VENDEDORA)).toHaveCount(0)
})
