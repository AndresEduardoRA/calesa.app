import { test, expect } from './soporte/prueba'
import { leerApibara, restaurarApibara, type EstadoDeApibara } from './soporte/apibara'
import {
  asegurarClaveDeRelleno,
  CLAVE_DE_RELLENO,
  huellaDelSecretoDeApibara,
  idDelSecretoDeApibara,
} from './soporte/apibara-clave'
import { admin } from './soporte/base'
import { limpiarInventario, prepararInventario } from './soporte/inventario'
import { literal, sql } from './soporte/sql'

// @sin-celular-archivo: no abre ninguna página: habla con la base y con Vault, y el ancho de la pantalla no interviene en sus pruebas

// La regla de `asegurarClaveDeRelleno()` (`e2e/soporte/apibara-clave.ts`), la que deja a un spec llamar a la función de apibara en una
// base recién reseteada: deja su clave de relleno sólo si no hay ninguna, nunca pisa ni borra una que exista (puede ser la real de quien
// usa la app local) y, al quitarla, no queda nada. Nada de esto lee una clave: se mira si existe y la huella de lo cifrado.
test.describe.configure({ mode: 'serial' })

let duena = ''
let apibaraAntes: EstadoDeApibara
// Los secretos que creó este spec, para borrarlos aunque una prueba caiga a medias.
const creados = new Set<string>()

const hayUnaClave = () => idDelSecretoDeApibara() !== null

test.beforeAll(async ({}, info) => {
  ;({ duena } = await prepararInventario(info.project.name, ['empresa.ajustes.gestionar']))
  apibaraAntes = await leerApibara()
})

test.afterAll(async () => {
  for (const id of creados) {
    sql(`delete from vault.secrets where id = ${literal(id)} and name = 'integracion:apibara'`)
  }
  await restaurarApibara(apibaraAntes)
  await limpiarInventario()
})

test('con una clave ya guardada, el relleno no la pisa ni la borra', async () => {
  if (!hayUnaClave()) {
    // Una clave previa de prueba, para tener algo que no se debe pisar.
    sql(`select vault.create_secret('e2e-clave-previa-no-real', 'integracion:apibara')`)
    creados.add(idDelSecretoDeApibara() ?? '')
  }
  const antes = huellaDelSecretoDeApibara()

  const quitar = await asegurarClaveDeRelleno(duena)
  expect(huellaDelSecretoDeApibara(), 'dejar el relleno no toca la clave que había').toBe(antes)

  await quitar()
  expect(huellaDelSecretoDeApibara(), 'quitar el relleno no borra la clave que había').toBe(antes)
})

test('sin clave, deja el relleno y al quitarlo no queda ninguna', async () => {
  test.skip(
    hayUnaClave() && creados.size === 0,
    'hay una clave que no es de este spec (puede ser la real): no se toca',
  )
  // La clave previa de la prueba anterior se va; con una real no se llega aquí.
  for (const id of creados) {
    sql(`delete from vault.secrets where id = ${literal(id)} and name = 'integracion:apibara'`)
  }
  creados.clear()
  expect(hayUnaClave(), 'sin clave al empezar').toBe(false)

  const quitar = await asegurarClaveDeRelleno(duena)
  const id = idDelSecretoDeApibara()
  expect(id, 'el relleno quedó en Vault').not.toBeNull()
  creados.add(id ?? '')
  // Es lo que puso este spec: leerlo no abre nada ajeno.
  const { data } = await admin().rpc('integracion_secreto', { p_clave: 'apibara' })
  expect(data).toBe(CLAVE_DE_RELLENO)

  await quitar()
  expect(hayUnaClave(), 'al quitarla no queda ninguna').toBe(false)
  creados.delete(id ?? '')
})
