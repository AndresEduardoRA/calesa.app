import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { BotonesDeOrden } from './botones-de-orden'

afterEach(cleanup)

function dibujar(extra: { motivoSinOrden?: string; puedeSubir?: boolean; puedeBajar?: boolean }) {
  render(
    <BotonesDeOrden
      prefijo="lista"
      id="a"
      nombre="BL"
      puedeSubir={extra.puedeSubir ?? false}
      puedeBajar={extra.puedeBajar ?? false}
      alMover={() => undefined}
      motivoSinOrden={extra.motivoSinOrden}
    />,
  )
}

it('una fila con motivoSinOrden lo usa como title de los dos botones apagados', () => {
  dibujar({ motivoSinOrden: 'Sólo quien gestiona los catálogos puede ordenar.' })
  expect(screen.getByRole('button', { name: 'Subir BL' }).getAttribute('title')).toBe(
    'Sólo quien gestiona los catálogos puede ordenar.',
  )
  expect(screen.getByRole('button', { name: 'Bajar BL' }).getAttribute('title')).toBe(
    'Sólo quien gestiona los catálogos puede ordenar.',
  )
})

it('sin motivoSinOrden dice «primero» y «último» como siempre', () => {
  dibujar({})
  expect(screen.getByRole('button', { name: 'Subir BL' }).getAttribute('title')).toBe(
    'Ya es el primero de la lista.',
  )
  expect(screen.getByRole('button', { name: 'Bajar BL' }).getAttribute('title')).toBe(
    'Ya es el último de la lista.',
  )
})

it('un botón activo no lleva title aunque haya motivoSinOrden', () => {
  dibujar({ motivoSinOrden: 'x', puedeSubir: true, puedeBajar: true })
  expect(screen.getByRole('button', { name: 'Subir BL' }).hasAttribute('title')).toBe(false)
})
