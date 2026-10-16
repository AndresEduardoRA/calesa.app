import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { avisar } from './toasts'
import { useBorrador } from './use-borrador'

vi.mock('./toasts', () => ({ avisar: vi.fn() }))

const CLAVE = 'prueba'
const CAMPOS = ['nit', 'ciudad', 'pais', 'dias'] as const

type Guardado = { nit: string; ciudad: string; pais: string; dias: number }
const GUARDADO: Guardado = { nit: '', ciudad: 'La Paz', pais: 'BO', dias: 30 }

type Limpiar = () => void

// Un formulario sin controlar, como el de la empresa: lo guardado llega como `defaultValue`.
function Formulario(props: {
  activo?: boolean
  guardado?: Guardado
  alMontar?: (limpiar: Limpiar) => void
}) {
  const { activo = true, guardado = GUARDADO, alMontar } = props
  const formulario = useRef<HTMLFormElement>(null)
  const borrador = useBorrador(CLAVE, formulario, CAMPOS, { activo })
  alMontar?.(borrador.limpiar)
  return (
    <form ref={formulario} aria-label="formulario">
      <input aria-label="NIT" name="nit" defaultValue={guardado.nit} />
      <input aria-label="Ciudad" name="ciudad" defaultValue={guardado.ciudad} />
      <select aria-label="País" name="pais" defaultValue={guardado.pais}>
        <option value="AR">Argentina</option>
        <option value="BO">Bolivia</option>
      </select>
      <input aria-label="Días" name="dias" type="number" defaultValue={guardado.dias} />
    </form>
  )
}

// Un formulario controlado, como el de un campo personalizado: el estado vive en React y la lista
// de campos es un arreglo nuevo en cada render.
function FormularioControlado({ guardado }: { guardado: string }) {
  const formulario = useRef<HTMLFormElement>(null)
  const [nombre, setNombre] = useState(guardado)
  const [nota, setNota] = useState('Una nota')
  const [pais, setPais] = useState('BO')
  useBorrador(CLAVE, formulario, ['nombre', 'nota', 'pais'], { controlado: true })
  return (
    <form ref={formulario}>
      <input
        aria-label="Nombre"
        name="nombre"
        value={nombre}
        onChange={(evento) => {
          setNombre(evento.target.value)
        }}
      />
      <input
        aria-label="Nota"
        name="nota"
        value={nota}
        onChange={(evento) => {
          setNota(evento.target.value)
        }}
      />
      <select
        aria-label="País"
        name="pais"
        value={pais}
        onChange={(evento) => {
          setPais(evento.target.value)
        }}
      >
        <option value="">Ninguno</option>
        <option value="BO">Bolivia</option>
      </select>
    </form>
  )
}

const guardadoEnLaPestana = () => window.sessionStorage.getItem(`borrador:${CLAVE}`)
const campo = (nombre: string) => screen.getByLabelText<HTMLInputElement>(nombre)
const tipear = (nombre: string, valor: string) => {
  fireEvent.input(campo(nombre), { target: { value: valor } })
}

beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(avisar).mockClear()
})
afterEach(cleanup)

describe('useBorrador: lo tipeado antes de que el efecto enganche', () => {
  it('queda en el borrador: no cuenta como guardado', () => {
    const { rerender } = render(<Formulario activo={false} />)
    tipear('NIT', '1020304050')
    fireEvent.change(campo('País'), { target: { value: 'AR' } })
    rerender(<Formulario activo />)
    expect(JSON.parse(guardadoEnLaPestana() ?? 'null')).toEqual({ nit: '1020304050', pais: 'AR' })
    // Lo tipeado ya está a la vista: no hay nada que recuperar.
    expect(avisar).not.toHaveBeenCalled()
  })

  it('le gana a un borrador viejo del mismo campo, y el resto del borrador se repone', () => {
    window.sessionStorage.setItem(
      `borrador:${CLAVE}`,
      JSON.stringify({ nit: 'viejo', ciudad: 'Sucre' }),
    )
    const { rerender } = render(<Formulario activo={false} />)
    tipear('NIT', 'nuevo')
    rerender(<Formulario activo />)
    expect(campo('NIT').value).toBe('nuevo')
    expect(campo('Ciudad').value).toBe('Sucre')
    expect(JSON.parse(guardadoEnLaPestana() ?? 'null')).toEqual({ nit: 'nuevo', ciudad: 'Sucre' })
  })
})

describe('useBorrador: al volver a abrir', () => {
  it('repone sólo lo que difiere de lo guardado ahora', () => {
    // Otra persona guardó el NIT mientras tanto: lo tipeado ya coincide y no se repone.
    window.sessionStorage.setItem(
      `borrador:${CLAVE}`,
      JSON.stringify({ nit: '111', ciudad: 'Sucre' }),
    )
    render(<Formulario guardado={{ ...GUARDADO, nit: '111' }} />)
    expect(campo('NIT').value).toBe('111')
    expect(campo('Ciudad').value).toBe('Sucre')
    expect(avisar).toHaveBeenCalledTimes(1)
  })

  it('«Descartar» devuelve lo guardado y borra el borrador', () => {
    window.sessionStorage.setItem(`borrador:${CLAVE}`, JSON.stringify({ ciudad: 'Sucre' }))
    render(<Formulario />)
    expect(campo('Ciudad').value).toBe('Sucre')
    const accion = vi.mocked(avisar).mock.calls[0]?.[1]
    act(() => {
      accion?.alHacer()
    })
    expect(campo('Ciudad').value).toBe('La Paz')
    expect(guardadoEnLaPestana()).toBeNull()
  })

  it('después de limpiar y volver a abrir, no repone nada', () => {
    let limpiar: Limpiar = () => undefined
    const primera = render(
      <Formulario
        alMontar={(fn) => {
          limpiar = fn
        }}
      />,
    )
    tipear('Ciudad', 'Sucre')
    expect(guardadoEnLaPestana()).not.toBeNull()
    limpiar()
    primera.unmount()
    render(<Formulario />)
    expect(campo('Ciudad').value).toBe('La Paz')
    expect(avisar).not.toHaveBeenCalled()
    expect(guardadoEnLaPestana()).toBeNull()
  })
})

describe('useBorrador: en una carga limpia', () => {
  it('no escribe borrador ni avisa, con campos vacíos, selects y números', () => {
    render(<Formulario />)
    expect(guardadoEnLaPestana()).toBeNull()
    expect(avisar).not.toHaveBeenCalled()
  })

  it('un select sin opción marcada cuenta como lo que el navegador muestra', () => {
    render(<Formulario guardado={{ ...GUARDADO, pais: 'sin-opcion' }} />)
    // El navegador muestra la primera opción: es lo guardado, no un cambio.
    expect(campo('País').value).toBe('AR')
    expect(guardadoEnLaPestana()).toBeNull()
    expect(avisar).not.toHaveBeenCalled()
  })

  it('un campo deshabilitado no entra al borrador: el formulario no lo envía', () => {
    function Deshabilitado() {
      const formulario = useRef<HTMLFormElement>(null)
      useBorrador(CLAVE, formulario, ['moneda'])
      return (
        <form ref={formulario}>
          <fieldset disabled>
            <select aria-label="Moneda" name="moneda" defaultValue="USD">
              <option value="BOB">BOB</option>
              <option value="USD">USD</option>
            </select>
          </fieldset>
        </form>
      )
    }
    render(<Deshabilitado />)
    expect(guardadoEnLaPestana()).toBeNull()
    expect(avisar).not.toHaveBeenCalled()
  })
})

describe('useBorrador: con el estado en React', () => {
  it('guarda lo tipeado y no lo «recupera» en cada render', () => {
    render(<FormularioControlado guardado="Marca" />)
    expect(avisar).not.toHaveBeenCalled()
    tipear('Nombre', 'Marca nueva')
    tipear('Nombre', 'Marca nuevas')
    expect(JSON.parse(guardadoEnLaPestana() ?? 'null')).toEqual({ nombre: 'Marca nuevas' })
    expect(avisar).not.toHaveBeenCalled()
  })

  it('un select controlado no se toma por un cambio al abrir', () => {
    // React no marca la opción de un select controlado: lo que se ve es lo guardado.
    render(<FormularioControlado guardado="Marca" />)
    expect(campo('País').value).toBe('BO')
    expect(guardadoEnLaPestana()).toBeNull()
    expect(avisar).not.toHaveBeenCalled()
  })

  it('escribir en un segundo campo no borra del borrador lo del primero', () => {
    render(<FormularioControlado guardado="Marca" />)
    tipear('Nombre', 'Marca nueva')
    tipear('Nota', 'Otra nota')
    expect(JSON.parse(guardadoEnLaPestana() ?? 'null')).toEqual({
      nombre: 'Marca nueva',
      nota: 'Otra nota',
    })
  })

  it('volver a lo guardado saca ese campo del borrador', () => {
    render(<FormularioControlado guardado="Marca" />)
    tipear('Nombre', 'Marca nueva')
    tipear('Nota', 'Otra nota')
    tipear('Nombre', 'Marca')
    expect(JSON.parse(guardadoEnLaPestana() ?? 'null')).toEqual({ nota: 'Otra nota' })
  })

  it('al volver a abrir repone lo tipeado', () => {
    window.sessionStorage.setItem(`borrador:${CLAVE}`, JSON.stringify({ nombre: 'Marca nueva' }))
    render(<FormularioControlado guardado="Marca" />)
    expect(campo('Nombre').value).toBe('Marca nueva')
    expect(avisar).toHaveBeenCalledTimes(1)
  })
})
