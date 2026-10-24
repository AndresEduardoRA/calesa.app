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
import { noAbre } from './soporte/confirmar-por-url'
import { sesionDe } from './soporte/leads-alta'
import {
  PREFIJO_DE_NIVEL_E2E,
  abrirNiveles,
  borrarNivelesDePrueba,
  filaDeNivel,
  nivelEnLaBase,
  nombresAbribles,
  sembrarNivel,
} from './soporte/niveles'
import { capturar, crearAsesoraDeLaSemilla } from './soporte/recorrido'

// Quién ve qué en Configuración › Cotización › Niveles (paso 4.09-2): quien sólo lee los roles (`equipo.roles.ver`) ve la lista sin «Nuevo nivel» ni
// «⋯» y la base no le deja escribir; la asesora, sin ninguno de los dos permisos, no ve la pantalla ni la tarjeta en Configuración.
test.describe.configure({ mode: 'serial' })

let lectora = ''
let asesora = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_NIVEL_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-niveles-permisos-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Permisos',
  })
  lectora = correoDePrueba(`lectora-niveles-${proyecto}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lía Lectora',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lee roles ${proyecto}`, clave: `e2e_lee_roles_${proyecto}` },
    permisos: ['equipo.roles.ver'],
  })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
})

test.afterAll(async () => {
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('quien sólo lee los roles ve la lista sin «Nuevo nivel» ni «⋯», y la base no le deja escribir', async ({
  page,
}, info) => {
  const visible = sembrarNivel(nombre('Para leer'))
  await page.context().clearCookies()
  await entrar(page, lectora, { fresco: true })
  await page.goto('/configuracion')
  await expect(page.getByRole('link', { name: /Cotización/ })).toBeVisible()
  await abrirNiveles(page)
  await expect(filaDeNivel(page, visible.nombre)).toBeVisible()
  await expect(page.getByText(/de 10 niveles posibles\./)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo nivel' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Más acciones de / })).toHaveCount(0)
  await expect(nombresAbribles(page)).toHaveCount(0)
  await capturar(page, info, 'niveles-solo-lectura')
  // Escribiendo la URL tampoco abre un formulario.
  await noAbre(
    page,
    '/configuracion/cotizacion?seccion=niveles&panel=nuevo-nivel',
    'No tienes permiso para cambiar los niveles de acceso.',
    /panel=nuevo-nivel/,
  )
  const cliente = await sesionDe(lectora, CONTRASENA)
  expect((await cliente.rpc('niveles_con_uso')).error).toBeNull()
  const crear = await cliente.rpc('nivel_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre('Intruso'),
  })
  expect(crear.error?.message).toContain('equipo.roles.gestionar')
  const restaurar = await cliente.rpc('nivel_restaurar', {
    p_id: visible.id,
    p_actualizado_en_esperado: visible.actualizado_en,
  })
  expect(restaurar.error?.message).toContain('equipo.roles.gestionar')
})

test('la asesora sin permisos de roles no ve la pantalla, ni la tarjeta en Configuración, ni puede leer el uso por la API', async ({
  page,
}, info) => {
  await page.context().clearCookies()
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/cotizacion')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Niveles de acceso' })).toHaveCount(0)
  await capturar(page, info, 'niveles-asesora-sin-permiso')
  const cliente = await sesionDe(asesora, CONTRASENA)
  const uso = await cliente.rpc('niveles_con_uso')
  expect(uso.error?.message).toContain('equipo.roles.ver')
  // Los niveles, sí los lee (la tabla es de lectura abierta); escribirlos, no.
  expect((await cliente.from('cotizaciones_niveles').select('id').limit(1)).error).toBeNull()
  const directo = await cliente
    .from('cotizaciones_niveles')
    .update({ nombre: 'Intruso' })
    .eq('clave', 'costos')
  expect(directo.error).not.toBeNull()
  expect(nivelEnLaBase('Costos')).toBeDefined()
})
