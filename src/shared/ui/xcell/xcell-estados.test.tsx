import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { abrir, BASE, celda } from './xcell.soporte'
import { SimbolosDeXCell } from './simbolos-de-xcell'
import { XCell, type XCellProps } from './index'

afterEach(cleanup)

describe('los estados', () => {
  it('normal: sin punto, sin ↺ y sin candado', () => {
    const c = celda()
    expect(c.raiz.dataset['estado']).toBe('normal')
    expect(c.raiz.textContent).not.toContain('Sugerido')
    expect(c.parada(12)).toBeNull()
    expect(c.raiz.querySelector('p')).toBeNull()
  })

  it('sugerido: el punto, dicho también en texto', () => {
    const c = celda({ suggested: true })
    expect(c.raiz.dataset['estado']).toBe('sugerido')
    expect(c.raiz.querySelector('[aria-hidden][title="Sugerido"]')).not.toBeNull()
    expect(c.raiz.textContent).toContain('Sugerido')
  })

  it('modificado: ↺ que dice a qué vuelve, sin la cifra', () => {
    const conDefecto = celda({ overridden: true, defaultValue: 100 })
    expect(conDefecto.raiz.dataset['estado']).toBe('modificado')
    const boton = conDefecto.parada(12)
    expect(boton?.getAttribute('aria-label')).toBe('Volver al valor por defecto de Fees')
    expect(conDefecto.raiz.textContent).not.toContain('100')
    cleanup()
    const sinDefecto = celda({ overridden: true })
    expect(sinDefecto.parada(12)?.getAttribute('aria-label')).toBe('Volver al sugerido de Fees')
  })

  it('modificado no muestra el punto de sugerido', () => {
    const c = celda({ suggested: true, overridden: true })
    expect(c.raiz.dataset['estado']).toBe('modificado')
    expect(c.raiz.textContent).not.toContain('Sugerido')
  })

  it('nunca dice «Sugerido:» junto a nada, en ningún estado', () => {
    const casos: Partial<XCellProps>[] = [
      {},
      { suggested: true },
      { overridden: true, suggested: true },
      { overridden: true, defaultValue: 5 },
      { disabledReason: 'Apagado' },
      { error: 'Fuera de rango' },
      { secondaryId: 'p', secondaryFormat: 'porcentaje', secondaryValue: 0.1, suggested: true },
    ]
    for (const caso of casos) {
      const c = celda(caso)
      expect(c.raiz.textContent, JSON.stringify(caso)).not.toMatch(/Sugerido\s*:/i)
      expect(c.raiz.innerHTML, JSON.stringify(caso)).not.toMatch(/Sugerido\s*:/i)
      cleanup()
    }
  })

  it('un valor vacío dice «Sin valor»', () => {
    const c = celda({ value: null })
    expect(c.raiz.textContent).toContain('Sin valor')
  })

  it('un porcentaje y un número se escriben con el locale', () => {
    expect(celda({ format: 'porcentaje', value: 0.1494 }).raiz.textContent).toContain('14,94')
    cleanup()
    expect(celda({ format: 'numero', value: 12.2 }).raiz.textContent).toContain('12,2')
  })
})

describe('deshabilitada', () => {
  const motivo = 'Se apaga cuando no hay garantía'

  it('dice su motivo escrito, con su candado, y se alcanza con el teclado', () => {
    const c = celda({ disabledReason: motivo })
    expect(c.raiz.dataset['estado']).toBe('deshabilitado')
    const nota = c.raiz.querySelector('p')
    expect(nota?.textContent).toBe(motivo)
    expect(nota?.querySelector('use')?.getAttribute('href')).toBe('#xcell-candado')
    const boton = c.parada(0)
    expect(boton?.getAttribute('aria-disabled')).toBe('true')
    expect(boton?.hasAttribute('disabled')).toBe(false)
    expect(boton?.getAttribute('aria-describedby')).toBe(nota?.id)
    boton?.focus()
    expect(document.activeElement).toBe(boton)
  })

  it('no abre la edición: ni con un clic ni tipeando ni con F2', () => {
    const c = celda({ disabledReason: motivo })
    const boton = c.parada(0)
    if (!boton) throw new Error('sin botón')
    fireEvent.click(boton)
    fireEvent.keyDown(boton, { key: '5' })
    fireEvent.keyDown(boton, { key: 'F2' })
    fireEvent.keyDown(boton, { key: 'Backspace' })
    expect(c.entrada()).toBeNull()
  })

  it('no ofrece ↺ aunque venga modificada', () => {
    const c = celda({ disabledReason: motivo, overridden: true })
    expect(c.parada(12)).toBeNull()
  })

  it('un motivo muy largo se escribe entero (se parte, no se corta)', () => {
    const largo = 'No se puede editar porque '.repeat(20).trim()
    const c = celda({ disabledReason: largo })
    expect(c.raiz.querySelector('p')?.textContent).toBe(largo)
    expect(c.raiz.querySelector('p')?.className).toContain('[overflow-wrap:anywhere]')
  })

  it('si se deshabilita mientras se edita, la edición se va', () => {
    const c = celda()
    abrir(c)
    c.rerender(<XCell {...BASE} disabledReason="Apagado" />)
    expect(c.entrada()).toBeNull()
  })
})

describe('el tono', () => {
  it('lleva la clave en data-tono y lee los colores de las variables, con el neutro de respaldo', () => {
    const c = celda({ tone: 'amarillo' })
    expect(c.raiz.dataset['tono']).toBe('amarillo')
    expect(c.raiz.className).toContain('var(--tono-fondo,var(--color-surface))')
    expect(c.raiz.className).toContain('var(--tono-borde,var(--color-line-strong))')
    expect(c.raiz.className).toContain('var(--tono-tinta,var(--color-ink))')
  })

  it('una clave desconocida no rompe nada y se dibuja igual', () => {
    const c = celda({ tone: 'no_existe' })
    expect(c.raiz.dataset['tono']).toBe('no_existe')
    expect(c.raiz.textContent).toContain('1.234,57')
  })

  it('sin tono no pone el atributo', () => {
    expect(celda().raiz.hasAttribute('data-tono')).toBe(false)
  })

  it('ningún color está escrito a mano en las clases', () => {
    const c = celda({ overridden: true, suggested: true, disabledReason: 'x', error: 'y' })
    expect(c.raiz.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
  })
})

describe('la etiqueta', () => {
  it('muy larga: se parte, nunca se corta ni lleva «…»', () => {
    const largo = 'Impuesto interno de importación de vehículos usados '.repeat(5).trim()
    const c = celda({ label: largo })
    const etiqueta = c.raiz.querySelector(`[id$="e"]`)
    expect(etiqueta?.textContent).toBe(largo)
    expect(etiqueta?.className).toContain('[overflow-wrap:anywhere]')
    expect(c.raiz.innerHTML).not.toMatch(/truncate|text-ellipsis|line-clamp/)
  })

  it('el grupo se llama como la etiqueta', () => {
    celda({ label: 'Flete marítimo' })
    expect(screen.getByRole('group', { name: 'Flete marítimo' })).toBeTruthy()
  })
})

describe('los iconos del sprite', () => {
  it('cada <use> de la celda apunta a un id que el sprite define', () => {
    const casos: Partial<XCellProps>[] = [
      { overridden: true },
      { disabledReason: 'Apagado' },
      { error: 'Mal' },
    ]
    for (const caso of casos) {
      const { container } = render(
        <>
          <SimbolosDeXCell />
          <XCell {...BASE} {...caso} />
        </>,
      )
      const usados = [...container.querySelectorAll('[data-xcell] use')].map((u) =>
        u.getAttribute('href'),
      )
      expect(usados.length).toBeGreaterThan(0)
      for (const href of usados) {
        expect(container.querySelector(`defs ${href ?? '#nada'}`), String(href)).not.toBeNull()
      }
      cleanup()
    }
  })
})
