import { expect, test } from './soporte/prueba'
import {
  dejarVaultDeApibaraComoEstaba,
  huellaDeVaultAlEmpezar,
  huellaDelSecretoDeApibara,
  idDelSecretoDeApibara,
} from './soporte/apibara-clave'
import { literal, sql } from './soporte/sql'

// @sin-celular-archivo: no abre ninguna página: habla con Vault por SQL y el ancho de la pantalla no interviene en sus pruebas

// 9-8: `empresa.spec.ts` escribe la clave de apibara por la interfaz y debe dejar Vault como estaba. Aquí se prueba la regla de
// `dejarVaultDeApibaraComoEstaba()` (`e2e/soporte/apibara-clave.ts`): sin clave al empezar, quita la que dejó la prueba; con una, no
// toca nada. Nunca se lee una clave: se mira si existe y la huella de lo cifrado. Si hay una real en la base local, no se prueba
// (sería pisarla).
test.describe.configure({ mode: 'serial' })

let habiaClave = false

test.beforeAll(() => {
  habiaClave = idDelSecretoDeApibara() !== null
})

test.afterAll(() => {
  if (!habiaClave) {
    sql(`delete from vault.secrets where name = 'integracion:apibara'`)
  }
})

const plantar = (texto: string) =>
  sql(`select vault.create_secret(${literal(texto)}, 'integracion:apibara')`)

test('sin clave al empezar, quita la que dejó la prueba', () => {
  test.skip(habiaClave, 'hay una clave real de apibara: plantar otra la pisaría')
  const antes = huellaDeVaultAlEmpezar()
  expect(antes, 'no hay clave al empezar').toBe('')

  plantar('e2e-clave-que-escribe-la-prueba')
  expect(huellaDelSecretoDeApibara(), 'la prueba dejó una clave').not.toBe('')

  expect(dejarVaultDeApibaraComoEstaba(antes), 'Vault queda como estaba').toBe(antes)
  expect(idDelSecretoDeApibara()).toBeNull()
})

test('con una clave al empezar, no la toca', () => {
  test.skip(habiaClave, 'hay una clave real de apibara: plantar otra la pisaría')
  plantar('e2e-clave-previa-no-real')
  const antes = huellaDeVaultAlEmpezar()
  expect(antes, 'hay clave al empezar').not.toBe('')

  expect(dejarVaultDeApibaraComoEstaba(antes), 'la clave previa sigue igual').toBe(antes)
  expect(idDelSecretoDeApibara()).not.toBeNull()
})
