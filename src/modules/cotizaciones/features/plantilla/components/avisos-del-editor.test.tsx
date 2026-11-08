import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GuardarLaPlantilla } from '../hooks/use-guardar-la-plantilla'
import { AvisosDelEditor } from './avisos-del-editor'

const guardar = (extra: Partial<GuardarLaPlantilla> = {}): GuardarLaPlantilla =>
  ({
    enviar: vi.fn(),
    enCurso: false,
    entro: false,
    conflicto: null,
    aviso: null,
    porCampo: {},
    enLinea: true,
    esperandoConexion: false,
    recargando: false,
    olvidarCampo: vi.fn(),
    reintentar: vi.fn(),
    recargar: vi.fn(),
    ...extra,
  }) as GuardarLaPlantilla

afterEach(cleanup)

describe('AvisosDelEditor', () => {
  it('el conflicto va con el mensaje de la base tal cual, el enlace a la misma URL y «Recargar»', () => {
    const recargar = vi.fn()
    render(
      <AvisosDelEditor
        deLaLectura={[]}
        paraPublicar={null}
        hrefVer="?seccion=tarjeta&origen=o"
        guardar={guardar({
          conflicto: 'El borrador de esta plantilla cambió hace 2 min, mientras lo editabas.',
          recargar,
        })}
      />,
    )
    expect(
      screen.getByText('El borrador de esta plantilla cambió hace 2 min, mientras lo editabas.'),
    ).toBeTruthy()
    expect(
      screen.getByText(/No se guardó nada. Recargar trae su versión y descarta lo que escribiste./),
    ).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe('?seccion=tarjeta&origen=o')
    screen.getByRole('button', { name: /Recargar/ }).click()
    expect(recargar).toHaveBeenCalled()
  })

  it('en este orden: lo de la lectura, lo que impediría publicar y lo de la action', () => {
    const { container } = render(
      <AvisosDelEditor
        deLaLectura={['Primero', 'Segundo']}
        paraPublicar="La tarjeta no puede mostrar «fees»: no es del nivel «todos»."
        hrefVer="?"
        guardar={guardar({ aviso: 'No se pudo guardar.' })}
      />,
    )
    const textos = [...container.querySelectorAll('[role="status"], [role="alert"]')].map(
      (n) => n.textContent,
    )
    expect(textos).toEqual([
      'Primero',
      'Segundo',
      'Con esto no se podría publicar: La tarjeta no puede mostrar «fees»: no es del nivel «todos».',
      'No se pudo guardar.',
    ])
  })

  it('sin conexión, dice que lo escrito sigue ahí y ofrece «Reintentar»', () => {
    render(
      <AvisosDelEditor
        deLaLectura={[]}
        paraPublicar={null}
        hrefVer="?"
        guardar={guardar({ esperandoConexion: true })}
      />,
    )
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
