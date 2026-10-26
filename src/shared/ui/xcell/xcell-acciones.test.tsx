import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLASE_LIVE } from '../guion-live'
import { PARADA_DE_AJUSTES, PARADA_DE_AYUDA, PARADA_DE_RESTABLECER } from './cabecera-de-xcell'
import { ID_DEL_ATAJO, SimbolosDeXCell, TEXTO_DEL_ATAJO } from './simbolos-de-xcell'
import { BASE, celda } from './xcell.soporte'
import { XCell } from './index'

// El Modo Live es una clase en <html> (`../live.ts`): se enciende para una prueba y se apaga al terminar.
const conLive = () => {
  document.documentElement.classList.add(CLASE_LIVE)
}
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
})

const ACCIONES = () => ({ hasHelp: true, onHelp: vi.fn(), hasSettings: true, onSettings: vi.fn() })

describe('la ayuda y el ⚙', () => {
  it('sin banderas no hay botones', () => {
    const c = celda()
    expect(c.parada(PARADA_DE_AYUDA)).toBeNull()
    expect(c.parada(PARADA_DE_AJUSTES)).toBeNull()
  })

  it('con la bandera y sin el callback (o al revés) no se dibujan: la celda no inventa una acción muerta', () => {
    const c = celda({ hasHelp: true, onSettings: vi.fn() })
    expect(c.parada(PARADA_DE_AYUDA)).toBeNull()
    expect(c.parada(PARADA_DE_AJUSTES)).toBeNull()
  })

  it('cada una se llama como el glosario, con la etiqueta de la celda, y no es parada de Tab', () => {
    const c = celda(ACCIONES())
    const ayuda = c.parada(PARADA_DE_AYUDA)
    const ajustes = c.parada(PARADA_DE_AJUSTES)
    expect(ayuda?.getAttribute('aria-label')).toBe('Ayuda de Fees')
    expect(ajustes?.getAttribute('aria-label')).toBe('Cambiar el valor por defecto de Fees')
    expect(ayuda?.getAttribute('tabindex')).toBe('-1')
    expect(ajustes?.getAttribute('tabindex')).toBe('-1')
  })

  it('emiten el id de la celda (no el del secundario) y no mueven el foco', () => {
    const props = ACCIONES()
    const c = celda({
      ...props,
      secondaryId: 'p',
      secondaryFormat: 'porcentaje',
      secondaryValue: 0.1,
    })
    const ayuda = c.parada(PARADA_DE_AYUDA)
    if (!ayuda) throw new Error('sin ayuda')
    ayuda.focus()
    fireEvent.click(ayuda)
    fireEvent.click(c.parada(PARADA_DE_AJUSTES) as HTMLElement)
    expect(props.onHelp).toHaveBeenCalledExactlyOnceWith('fees')
    expect(props.onSettings).toHaveBeenCalledExactlyOnceWith('fees')
    expect(document.activeElement).toBe(ayuda)
  })

  it('el orden de la ranura es ayuda → ⚙ → ↺', () => {
    const c = celda({ ...ACCIONES(), overridden: true })
    const orden = [...c.raiz.querySelectorAll('[data-parada]')]
      .map((e) => Number(e.getAttribute('data-parada')))
      .filter((n) => n >= PARADA_DE_AYUDA)
    expect(orden).toEqual([PARADA_DE_AYUDA, PARADA_DE_AJUSTES, PARADA_DE_RESTABLECER])
  })

  it('deshabilitada: la ayuda y el ⚙ siguen (no escriben aquí); ↺ no', () => {
    const c = celda({ ...ACCIONES(), overridden: true, disabledReason: 'Apagado' })
    expect(c.parada(PARADA_DE_AYUDA)).not.toBeNull()
    expect(c.parada(PARADA_DE_AJUSTES)).not.toBeNull()
    expect(c.parada(PARADA_DE_RESTABLECER)).toBeNull()
  })

  it('en Modo Live siguen y no dicen ninguna cifra', () => {
    conLive()
    const { container } = render(<XCell {...BASE} {...ACCIONES()} />)
    const texto = [...container.querySelectorAll('[data-parada]')]
      .filter((e) => Number(e.getAttribute('data-parada')) >= PARADA_DE_AYUDA)
      .map((e) => `${e.getAttribute('aria-label') ?? ''}${e.getAttribute('title') ?? ''}`)
      .join(' ')
    expect(container.querySelectorAll('[data-parada]')).toHaveLength(3)
    expect(texto).not.toMatch(/\d/)
  })
})

describe('el anuncio de las flechas', () => {
  const descripcion = (e: HTMLElement | null) => e?.getAttribute('aria-describedby') ?? ''

  it('el valor lo dice sólo cuando la celda tiene acciones, en los dos lados del par', () => {
    const par = {
      secondaryId: 'p',
      secondaryFormat: 'porcentaje' as const,
      secondaryValue: 0.1,
    }
    const sin = celda(par)
    expect(descripcion(sin.parada(0))).toBe('')
    expect(sin.parada(0)?.getAttribute('aria-keyshortcuts')).toBeNull()
    cleanup()
    for (const props of [{ hasHelp: true, onHelp: vi.fn() }, { overridden: true }]) {
      const con = celda({ ...par, ...props })
      for (const lado of [0, 1]) {
        expect(descripcion(con.parada(lado))).toContain(ID_DEL_ATAJO)
        expect(con.parada(lado)?.getAttribute('aria-keyshortcuts')).toBe('ArrowRight')
      }
      cleanup()
    }
  })

  it('la nota va antes que el atajo, y el texto vive una vez en el sprite', () => {
    const { container } = render(
      <>
        <SimbolosDeXCell />
        <XCell {...BASE} {...ACCIONES()} disabledReason="Apagado" />
      </>,
    )
    const boton = container.querySelector('[data-parada="0"]')
    const nota = container.querySelector('p')
    expect(boton?.getAttribute('aria-describedby')).toBe(`${nota?.id ?? ''} ${ID_DEL_ATAJO}`)
    expect(container.querySelector(`#${ID_DEL_ATAJO}`)?.textContent).toBe(TEXTO_DEL_ATAJO)
  })
})

describe('Modo Live y los gestores de contraseñas', () => {
  const abrirEntrada = (live: boolean) => {
    if (live) conLive()
    const { container } = render(<XCell {...BASE} />)
    fireEvent.click(container.querySelector('[data-parada="0"]') as HTMLElement)
    return container.querySelector('input') as HTMLInputElement
  }

  it('la entrada de contraseña lleva las marcas que ignoran 1Password, LastPass, Bitwarden y Dashlane', () => {
    const entrada = abrirEntrada(true)
    expect(entrada.type).toBe('password')
    expect(entrada.getAttribute('autocomplete')).toBe('off')
    expect(entrada.hasAttribute('data-1p-ignore')).toBe(true)
    expect(entrada.getAttribute('data-lpignore')).toBe('true')
    expect(entrada.hasAttribute('data-bwignore')).toBe(true)
    expect(entrada.getAttribute('data-form-type')).toBe('other')
  })

  it('sin Live es un cuadro de texto y no las necesita', () => {
    const entrada = abrirEntrada(false)
    expect(entrada.type).toBe('text')
    expect(entrada.hasAttribute('data-1p-ignore')).toBe(false)
  })
})
