// @sin-celular-archivo: el service worker y el permiso del navegador no cambian con el ancho; el bloque comparte los componentes de Perfil, que ya corren en celular
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { simularPush } from './soporte/push'
import { literal, sql } from './soporte/sql'

// 7.04: el bloque «Notificaciones» de /perfil y la tarjeta «Avisos push» de Empresa. El navegador es un doble
// (`simularPush`); la acción, la RPC y las filas son reales. La entrega (la función, el pase, el cifrado) la prueban
// `supabase/tests/areas/push/*.sql` y `push-contrato.test.ts`; la seguridad del `sw.js`, `sw.test.ts`.

let duena = ''
let sinPermisos = ''

const filasDe = (tabla: string, correo: string, donde = 'true') =>
  Number(
    sql(`select count(*) from public.${tabla} t join public.perfiles p on p.id = t.usuario_id
          where p.email = ${literal(correo)} and ${donde}`),
  )

const dejarPushWeb = (activa: boolean) =>
  sql(
    `update public.integraciones set activa = ${String(activa)}, actualizado_en = now() where clave = 'push_web'`,
  )

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-push-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Paula Push' })
  // Sin `notificaciones.push` ni `empresa.ajustes.gestionar`; con un permiso de la empresa para poder abrir Configuración.
  sinPermisos = correoDePrueba(`sin-push-${info.project.name}`)
  await crearPersona({
    email: sinPermisos,
    contrasena: CONTRASENA,
    nombre: 'Sara Sinpush',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinPermisos,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Sin push ${info.project.name}`,
      clave: `e2e_sin_push_${info.project.name}`,
    },
    permisos: ['empresa.tipos_cambio.gestionar'],
  })
  dejarPushWeb(true)
})

test.afterAll(async () => {
  // La semilla la espera apagada.
  dejarPushWeb(false)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio · encender los avisos de este navegador crea su fila y apagarlos la quita', async ({
  page,
}) => {
  await simularPush(page, { permiso: 'default' })
  await entrar(page, duena, { fresco: true })
  await page.goto('/perfil')
  const avisos = page.getByRole('switch', { name: 'Recibir avisos en este navegador' })
  await expect(avisos).toBeEnabled()
  await expect(avisos).not.toBeChecked()
  await expect(
    page.getByText('Todavía no has activado los avisos en ningún navegador.'),
  ).toBeVisible()

  await avisos.click()
  await expect(avisos).toBeChecked()
  await expect.poll(() => filasDe('suscripciones_push', duena)).toBe(1)
  expect(
    sql(`select s.endpoint from public.suscripciones_push s join public.perfiles p on p.id = s.usuario_id
          where p.email = ${literal(duena)}`),
  ).toMatch(/^https:\/\/fcm\.googleapis\.com\/fcm\/send\/e2e-/)
  // Sin el endpoint a la vista: la lista nombra el navegador.
  await expect(page.getByText(/· Este navegador/)).toBeVisible()
  await expect(page.getByText('fcm.googleapis.com')).toHaveCount(0)

  await avisos.click()
  await expect(avisos).not.toBeChecked()
  await expect.poll(() => filasDe('suscripciones_push', duena)).toBe(0)
  await expect(
    page.getByText('Todavía no has activado los avisos en ningún navegador.'),
  ).toBeVisible()
})

test('E2E escritorio · apagar un tipo persiste al recargar y volver a encenderlo borra la fila', async ({
  page,
}) => {
  await simularPush(page, { permiso: 'granted' })
  await entrar(page, duena)
  await page.goto('/perfil')
  const recordatorios = page.getByRole('switch', { name: 'Recordatorios' })
  await expect(recordatorios).toBeEnabled()
  await expect(recordatorios).toBeChecked()

  await recordatorios.click()
  await expect(recordatorios).not.toBeChecked()
  await expect
    .poll(() =>
      sql(`select pu.valor::text from public.preferencias_usuario pu join public.perfiles p on p.id = pu.usuario_id
            where p.email = ${literal(duena)} and pu.clave = 'notificaciones.push'`),
    )
    .toBe('{"recordatorio": false}')

  await page.reload()
  const tras = page.getByRole('switch', { name: 'Recordatorios' })
  await expect(tras).toBeEnabled()
  await expect(tras).not.toBeChecked()
  // La campana no cambia: lo apagado sólo detiene el push.
  await expect(page.getByText(/La campana de la barra los sigue mostrando todos\./)).toBeVisible()

  await tras.click()
  await expect(tras).toBeChecked()
  await expect
    .poll(() => filasDe('preferencias_usuario', duena, `t.clave = 'notificaciones.push'`))
    .toBe(0)
})

test('E2E escritorio · sin el permiso los interruptores quedan a la vista, deshabilitados y con su motivo', async ({
  page,
}) => {
  await simularPush(page, { permiso: 'granted' })
  await entrar(page, sinPermisos, { fresco: true })
  await page.goto('/perfil')
  const avisos = page.getByRole('switch', { name: 'Recibir avisos en este navegador' })
  await expect(avisos).toBeDisabled()
  await expect(page.getByText('Tu rol no recibe avisos push.').first()).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Recordatorios' })).toBeDisabled()
  expect(filasDe('suscripciones_push', sinPermisos)).toBe(0)
})

test('E2E escritorio · con los avisos de la empresa apagados el interruptor del perfil dice por qué', async ({
  page,
}) => {
  dejarPushWeb(false)
  await simularPush(page, { permiso: 'granted' })
  await entrar(page, duena, { fresco: true })
  await page.goto('/perfil')
  await expect(
    page.getByRole('switch', { name: 'Recibir avisos en este navegador' }),
  ).toBeDisabled()
  await expect(page.getByText(/La empresa todavía no activó los avisos push\./)).toBeVisible()
  // Los de por tipo son preferencias: siguen disponibles.
  await expect(page.getByRole('switch', { name: 'Recordatorios' })).toBeEnabled()
})

test('E2E escritorio · Empresa › Integraciones enciende «Avisos push»', async ({ page }) => {
  dejarPushWeb(false)
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/empresa?seccion=integraciones')
  const tarjeta = page.locator('details', { has: page.getByText('Avisos push', { exact: true }) })
  const activos = tarjeta.getByRole('switch', { name: 'Activos' })
  await expect(activos).toBeEnabled()
  await expect(activos).not.toBeChecked()
  await activos.click()
  await expect(page.getByText('Avisos push activados')).toBeVisible()
  await expect(activos).toBeChecked()
  expect(sql(`select activa from public.integraciones where clave = 'push_web'`)).toBe('t')
})

test('E2E escritorio · sin el permiso de ajustes «Avisos push» queda deshabilitada', async ({
  page,
}) => {
  await entrar(page, sinPermisos, { fresco: true })
  await page.goto('/configuracion/empresa?seccion=integraciones')
  const tarjeta = page.locator('details', { has: page.getByText('Avisos push', { exact: true }) })
  await expect(tarjeta.getByRole('switch', { name: 'Activos' })).toBeDisabled()
})
