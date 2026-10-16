import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  conRed,
  enfocarPrimerError,
  errorDeAccion,
  errorDeCampo,
  resultadoDeAccion,
  valoresDe,
  valoresGuardadosDe,
} from './formularios'

describe('valoresDe', () => {
  it('lee los campos pedidos por nombre', () => {
    const formulario = document.createElement('form')
    formulario.innerHTML =
      '<input name="email" value="ana@ejemplo.com"><input name="otro" value="x">'
    expect(valoresDe(formulario, ['email'])).toEqual({ email: 'ana@ejemplo.com' })
  })

  it('un campo ausente queda vacío', () => {
    const formulario = document.createElement('form')
    expect(valoresDe(formulario, ['nombre'])).toEqual({ nombre: '' })
  })
})

describe('valoresGuardadosDe', () => {
  function formulario(html: string): HTMLFormElement {
    const nuevo = document.createElement('form')
    nuevo.innerHTML = html
    return nuevo
  }

  it('lee lo que mandó el servidor, no lo que se escribió después', () => {
    const f = formulario('<input name="nit" value="123"><textarea name="nota">Hola</textarea>')
    const nit = f.elements.namedItem('nit')
    const nota = f.elements.namedItem('nota')
    if (!(nit instanceof HTMLInputElement) || !(nota instanceof HTMLTextAreaElement)) {
      throw new Error('Faltan campos')
    }
    nit.value = 'tipeado'
    nota.value = 'tipeado'
    expect(valoresGuardadosDe(f, ['nit', 'nota'])).toEqual({ nit: '123', nota: 'Hola' })
    expect(valoresDe(f, ['nit', 'nota'])).toEqual({ nit: 'tipeado', nota: 'tipeado' })
  })

  it('un select: la opción marcada, o la primera si ninguna lo está', () => {
    const f = formulario(
      '<select name="a"><option value="x">X</option><option value="y" selected>Y</option></select>' +
        '<select name="b"><option value="p">P</option><option value="q">Q</option></select>',
    )
    const b = f.elements.namedItem('b')
    if (b instanceof HTMLSelectElement) {
      b.value = 'q'
    }
    expect(valoresGuardadosDe(f, ['a', 'b'])).toEqual({ a: 'y', b: 'p' })
  })

  it('normaliza como el navegador: un número válido queda, un correo pierde los espacios', () => {
    const f = formulario(
      '<input name="dias" type="number" value="30"><input name="malo" type="number" value="abc">' +
        '<input name="correo" type="email" value="  a@b.co  ">',
    )
    expect(valoresGuardadosDe(f, ['dias', 'malo', 'correo'])).toEqual({
      dias: '30',
      malo: '',
      correo: 'a@b.co',
    })
  })

  it('un campo deshabilitado (o dentro de un fieldset deshabilitado) se lee vacío, como en valoresDe', () => {
    const f = formulario(
      '<input name="uno" value="x" disabled><fieldset disabled><input name="dos" value="y"></fieldset>' +
        '<select name="tres" disabled><option value="z" selected>Z</option></select>',
    )
    expect(valoresGuardadosDe(f, ['uno', 'dos', 'tres'])).toEqual({ uno: '', dos: '', tres: '' })
    expect(valoresDe(f, ['uno', 'dos', 'tres'])).toEqual({ uno: '', dos: '', tres: '' })
  })

  it('un campo ausente, o que no es de texto, queda vacío', () => {
    const f = formulario('<input name="ok" type="checkbox" value="on" checked>')
    expect(valoresGuardadosDe(f, ['ok', 'nada'])).toEqual({ ok: '', nada: '' })
  })
})

describe('errorDeAccion', () => {
  const error = { codigo: 'regla', mensaje: 'No se puede.' } as const

  it('toma el error que cortó la action antes de ejecutar', () => {
    expect(errorDeAccion({ serverError: error })).toBe(error)
  })

  it('toma el error del Resultado que devolvió la action', () => {
    expect(errorDeAccion({ data: { ok: false, error } })).toBe(error)
  })

  it('sin error devuelve null', () => {
    expect(errorDeAccion({})).toBeNull()
    expect(errorDeAccion({ data: { ok: true, data: 1 } })).toBeNull()
  })
})

describe('errorDeCampo', () => {
  it('da el primer mensaje del campo', () => {
    expect(errorDeCampo({ email: ['Falta el correo.', 'Otro'] }, 'email')).toBe('Falta el correo.')
  })

  it('sin errores o sin ese campo devuelve undefined', () => {
    expect(errorDeCampo(undefined, 'email')).toBeUndefined()
    expect(errorDeCampo<'email' | 'nombre'>({ nombre: ['x'] }, 'email')).toBeUndefined()
  })
})

describe('conRed', () => {
  it('deja pasar la respuesta de la action', async () => {
    const respuesta = { data: { ok: true as const, data: 1 } }
    expect(await conRed(Promise.resolve(respuesta))).toBe(respuesta)
  })

  it('si la action no llega al servidor, lo devuelve como un error que conserva el formulario', async () => {
    const resultado = await conRed(Promise.reject(new TypeError('Failed to fetch')))
    const error = errorDeAccion(resultado)
    expect(error?.codigo).toBe('inesperado')
    expect(error?.mensaje).toContain('Lo que escribiste sigue acá')
  })

  it('una respuesta vacía también es un error', async () => {
    expect(errorDeAccion(await conRed(Promise.resolve(undefined)))).not.toBeNull()
  })
})

describe('resultadoDeAccion', () => {
  const error = { codigo: 'conflicto', mensaje: 'Otra persona lo cambió.' } as const

  it('devuelve el resultado de la action', () => {
    expect(resultadoDeAccion({ data: { ok: true, data: 7 } })).toEqual({ ok: true, data: 7 })
    expect(resultadoDeAccion({ data: { ok: false, error } })).toEqual({ ok: false, error })
  })

  it('el error que cortó la action antes de ejecutar también es un resultado', () => {
    expect(resultadoDeAccion({ serverError: error })).toEqual({ ok: false, error })
  })

  it('si no ejecutó por validación, queda un error de validación', () => {
    const resultado = resultadoDeAccion({})
    expect(!resultado.ok && resultado.error.codigo).toBe('validacion')
  })
})

describe('enfocarPrimerError', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  function formularioConErrores(): HTMLFormElement {
    const formulario = document.createElement('form')
    formulario.innerHTML =
      '<input id="uno" name="uno"><input id="dos" name="dos" aria-invalid="true"><input id="tres" name="tres" aria-invalid="true">'
    document.body.append(formulario)
    return formulario
  }

  it('enfoca el primer campo con error, un cuadro después', () => {
    const formulario = formularioConErrores()
    enfocarPrimerError(formulario)
    expect(document.activeElement).toBe(document.body)
    vi.advanceTimersByTime(20)
    expect(document.activeElement?.id).toBe('dos')
  })

  it('sin errores, o sin formulario, no hace nada', () => {
    const formulario = document.createElement('form')
    document.body.append(formulario)
    enfocarPrimerError(formulario)
    enfocarPrimerError(null)
    vi.advanceTimersByTime(500)
    expect(document.activeElement).toBe(document.body)
  })

  it('si los errores se pintan unos cuadros después, enfoca cuando aparecen', () => {
    const formulario = document.createElement('form')
    formulario.innerHTML = '<input id="uno" name="uno"><input id="dos" name="dos">'
    document.body.append(formulario)
    enfocarPrimerError(formulario)
    vi.advanceTimersByTime(48)
    expect(document.activeElement).toBe(document.body)
    formulario.querySelector('#dos')?.setAttribute('aria-invalid', 'true')
    vi.advanceTimersByTime(20)
    expect(document.activeElement?.id).toBe('dos')
  })

  it('sin errores deja de insistir', () => {
    const formulario = document.createElement('form')
    formulario.innerHTML = '<input name="uno">'
    document.body.append(formulario)
    enfocarPrimerError(formulario)
    vi.advanceTimersByTime(5_000)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('si el formulario sigue deshabilitado, espera a que vuelva a editarse', () => {
    // Guardando, el formulario se deshabilita; un envío que falla lo habilita unos cuadros después.
    const formulario = formularioConErrores()
    const bloqueado = document.createElement('fieldset')
    bloqueado.disabled = true
    bloqueado.append(...Array.from(formulario.children))
    formulario.append(bloqueado)
    enfocarPrimerError(formulario)
    vi.advanceTimersByTime(48)
    expect(document.activeElement).toBe(document.body)
    bloqueado.disabled = false
    vi.advanceTimersByTime(20)
    expect(document.activeElement?.id).toBe('dos')
  })

  it('no insiste para siempre con un campo que no se puede enfocar', () => {
    const formulario = formularioConErrores()
    for (const campo of formulario.querySelectorAll('input')) {
      campo.disabled = true
    }
    enfocarPrimerError(formulario)
    vi.advanceTimersByTime(5_000)
    expect(vi.getTimerCount()).toBe(0)
  })
})
