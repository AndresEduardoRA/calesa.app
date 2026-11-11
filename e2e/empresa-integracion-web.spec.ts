// @sin-celular-archivo: Configuración › Empresa › Integraciones se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { randomBytes } from 'node:crypto'
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { sql } from './soporte/sql'

// La tarjeta «Web pública» de Configuración › Empresa › Integraciones (8.06-2): encenderla, guardar la dirección de revalidación y el
// secreto, y «Probar» contra un receptor que levanta el propio spec. La regla de la dirección y el orden «permiso antes del admin» los
// prueban `entities/integraciones.test.ts` e `infra/revalidacion-prueba.test.ts`; la cola y el job, `supabase/tests/areas/web/revalidar.sql`.

type Pedido = { metodo: string | undefined; cabeceras: IncomingHttpHeaders; cuerpo: string }

const pedidos: Pedido[] = []
let receptor: Server
let puerto = 0
let duena = ''

// Como la deja la semilla: apagada, sin dirección y sin secreto (`vehiculos-vitrina` espera la web apagada).
function dejarLaWebComoEnLaSemilla() {
  sql(`
    delete from vault.secrets where name = 'integracion:web_publica';
    update public.integraciones
       set activa = false, config = '{"revalidar_url": null}'::jsonb, secreto_guardado_en = null
     where clave = 'web_publica';`)
}

test.beforeAll(async ({}, info) => {
  receptor = createServer((pedido, respuesta) => {
    let cuerpo = ''
    pedido.on('data', (parte: Buffer) => {
      cuerpo += parte.toString('utf8')
    })
    pedido.on('end', () => {
      pedidos.push({ metodo: pedido.method, cabeceras: pedido.headers, cuerpo })
      respuesta.writeHead(204).end()
    })
  })
  await new Promise<void>((listo) => receptor.listen(0, '127.0.0.1', listo))
  puerto = (receptor.address() as AddressInfo).port
  dejarLaWebComoEnLaSemilla()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-web-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Wanda Web' })
})

test.afterAll(async () => {
  dejarLaWebComoEnLaSemilla()
  await borrarPersonasDePrueba()
  await new Promise<void>((listo) => receptor.close(() => listo()))
})

test('E2E escritorio · encender la web pública, guardar dirección y secreto, y probar', async ({
  page,
}) => {
  const secreto = `e2e-revalidar-${randomBytes(8).toString('hex')}`
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/empresa?seccion=integraciones')
  const web = page.locator('details', { has: page.getByText('Web pública', { exact: true }) })
  const activa = web.getByRole('switch', { name: 'Activa' })

  // La ayuda dice cuántos vehículos empiezan a verse (la semilla puede no tener ninguno).
  await expect(
    web.getByText(/Al encenderla, .+ empiezan? a verse en el sitio\.|Con la integración activa/),
  ).toBeVisible()
  const probar = web.getByRole('button', { name: 'Probar' })
  await expect(probar).toBeDisabled()
  await expect(web.getByText('Guarda la dirección para probar.')).toBeVisible()

  await activa.click()
  await expect(page.getByText('Web pública activada')).toBeVisible()
  await expect(activa).toBeChecked()

  // Sin https no se guarda; el loopback sí, porque la base del e2e es local.
  const direccion = web.getByLabel('Dirección de revalidación')
  await direccion.fill('http://ejemplo.com')
  await web.getByRole('button', { name: 'Guardar dirección' }).click()
  await expect(page.locator('#revalidarUrl-error')).toContainText('https://')
  await direccion.fill(`http://127.0.0.1:${puerto}/api/revalidar`)
  await web.getByRole('button', { name: 'Guardar dirección' }).click()
  await expect(page.getByText('Dirección de revalidación guardada')).toBeVisible()
  await expect(web.getByText('Guarda el secreto para probar.')).toBeVisible()

  // El secreto se guarda y no vuelve, ni a la vista ni en lo que manda el servidor.
  await web.getByLabel('Secreto', { exact: true }).fill(secreto)
  await web.getByRole('button', { name: 'Guardar secreto' }).click()
  await expect(page.getByText('Secreto de revalidación guardado')).toBeVisible()
  await expect(web.getByText(/Guardado el .+ No se puede ver/)).toBeVisible()
  expect(await page.content()).not.toContain(secreto)

  await probar.click()
  await expect(web.getByText('Respondió 204.')).toBeVisible()
  await expect(web.getByText(/Con http:\/\/ sólo se prueba/)).toBeVisible()
  expect(await page.content()).not.toContain(secreto)

  // Un solo pedido, con el secreto en la cabecera y nunca en el cuerpo.
  expect(pedidos).toHaveLength(1)
  const [pedido] = pedidos
  expect(pedido?.metodo).toBe('POST')
  expect(pedido?.cabeceras['authorization']).toBe(`Bearer ${secreto}`)
  expect(pedido?.cabeceras['content-type']).toBe('application/json')
  expect(pedido?.cuerpo).toBe('{"etiquetas":[]}')
})
