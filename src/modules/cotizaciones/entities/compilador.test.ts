import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compilarExpresion, type ContextoDeCompilacion } from './compilador'
import { formulaDe } from './compilador-formula-de-prueba'
import { CODIGOS_DE_COMPILACION, mensajeDe } from './motivos-del-compilador'
import { validarFormula } from './validar'

// La ruta va por una variable: Vite reescribe un `new URL('literal', import.meta.url)`.
const JUEGO = './casos-del-compilador.json'

type Caso = {
  nombre: string
  texto: string
  contexto?: Partial<ContextoDeCompilacion>
  sinValidar?: boolean
  esperado: {
    nodos?: unknown[]
    params?: Record<string, number>
    tramos?: Record<string, unknown>
    etiquetaDe?: { id: string; largo: number; termina: string }
    error?: { codigo: string; desde: number; largo: number; linea: number; columna: number }
  }
}
const juego = JSON.parse(readFileSync(new URL(JUEGO, import.meta.url), 'utf8')) as {
  contexto: ContextoDeCompilacion
  casos: Caso[]
}
const contextoDe = (c: Caso): ContextoDeCompilacion => ({ ...juego.contexto, ...c.contexto })

function esperarError(c: Caso, r: ReturnType<typeof compilarExpresion>) {
  const { codigo, desde, largo, linea, columna } = c.esperado.error ?? {}
  expect(r.ok ? 'compiló' : { codigo: r.error.codigo, tramo: r.error.tramo }).toEqual({
    codigo,
    tramo: { desde, largo, linea, columna },
  })
}

function esperarCompilado(c: Caso, r: Extract<ReturnType<typeof compilarExpresion>, { ok: true }>) {
  const { nodos, params, tramos, etiquetaDe } = c.esperado
  if (nodos !== undefined) expect(r.nodos).toEqual(nodos)
  if (params !== undefined) expect(r.params).toEqual(params)
  for (const [id, p] of Object.entries(params ?? {}))
    expect(Object.is(r.params[id], p), id).toBe(true)
  if (tramos !== undefined) expect(r.tramos).toMatchObject(tramos)
  if (etiquetaDe !== undefined) {
    const e = r.nodos.find((n) => n.id === etiquetaDe.id)?.etiqueta ?? ''
    expect([e.length, e.slice(-1)]).toEqual([etiquetaDe.largo, etiquetaDe.termina])
  }
}

describe('casos-del-compilador.json', () => {
  it.each(juego.casos)('$nombre', (c) => {
    const ctx = contextoDe(c)
    const r = compilarExpresion(c.texto, ctx)
    if (c.esperado.error !== undefined) return esperarError(c, r)
    if (!r.ok) throw new Error(`no compiló: ${JSON.stringify(r.error)}`)
    esperarCompilado(c, r)
    // Todo lo que compila es un grafo que valida.
    if (c.sinValidar !== true) {
      const f = formulaDe(ctx, r)
      const v = validarFormula(f.definicion, f.params)
      expect(v.ok ? 'válida' : v.error.mensaje).toBe('válida')
    }
  })
})

describe('el contrato del compilador', () => {
  it('cada código de error tiene al menos un caso, menos «demasiados_terminos», que va abajo', () => {
    const vistos = new Set(juego.casos.map((c) => c.esperado.error?.codigo))
    for (const codigo of CODIGOS_DE_COMPILACION) {
      if (codigo !== 'demasiados_terminos') expect(vistos, codigo).toContain(codigo)
    }
  })

  it('el tramo de todo error cae dentro del texto y la línea y la columna son de ese desplazamiento', () => {
    for (const c of juego.casos) {
      const e = c.esperado.error
      if (e === undefined) continue
      expect(e.desde + e.largo, c.nombre).toBeLessThanOrEqual(c.texto.length)
      const antes = c.texto.slice(0, e.desde)
      expect(e.linea, c.nombre).toBe(antes.split('\n').length)
      expect(e.columna, c.nombre).toBe(antes.length - (antes.lastIndexOf('\n') + 1) + 1)
    }
  })

  it('los mensajes hablan con tuteo y ninguno queda vacío', () => {
    for (const codigo of CODIGOS_DE_COMPILACION) {
      const mensaje = mensajeDe(codigo, {
        nombre: 'x',
        texto: 'x',
        esperado: 'otro valor',
        n: 1,
        cantidad: 2,
      })
      expect(mensaje.length, codigo).toBeGreaterThan(8)
      expect(mensaje, codigo).not.toMatch(/\b(vos|tenés|escribí|usá|podés|revisá)\b/)
    }
  })

  it('el mismo texto y el mismo contexto dan los mismos nodos, ids y params, en el mismo orden', () => {
    for (const c of juego.casos) {
      const a = compilarExpresion(c.texto, contextoDe(c))
      const b = compilarExpresion(c.texto, contextoDe(c))
      expect(JSON.stringify(b), c.nombre).toBe(JSON.stringify(a))
    }
  })

  it('no toca el contexto que recibe', () => {
    const ctx = structuredClone(juego.contexto)
    compilarExpresion('(remate+fees)*4%+SUMA(compra)', ctx)
    expect(ctx).toEqual(juego.contexto)
  })

  it('el tope de términos es exacto: 100.000 compilan y 100.001 no', () => {
    const justo = compilarExpresion(`${'remate+'.repeat(99_999)}remate`, juego.contexto)
    expect(justo.ok).toBe(true)
    const uno = compilarExpresion(`${'remate+'.repeat(100_000)}remate`, juego.contexto)
    expect(uno.ok ? 'compiló' : uno.error.codigo).toBe('demasiados_terminos')
  })

  it('demasiados términos es un error, no una excepción', () => {
    const texto = `${'remate+'.repeat(100_001)}remate`
    const r = compilarExpresion(texto, juego.contexto)
    expect(r.ok ? 'compiló' : r.error.codigo).toBe('demasiados_terminos')
  })

  it('64 paréntesis anidados compilan', () => {
    const r = compilarExpresion(`${'('.repeat(64)}remate${')'.repeat(64)}`, juego.contexto)
    expect(r.ok).toBe(true)
  })

  it('una cadena de 30.000 operadores alternados compila sin reventar la pila', () => {
    const texto = Array.from({ length: 30_000 }, (_, i) =>
      i % 2 === 0 ? 'remate-' : 'fees+',
    ).join('')
    const r = compilarExpresion(`${texto}flete`, juego.contexto)
    expect(r.ok).toBe(true)
  })

  it('no depende del texto de la fila: un destino que ya trae `texto` compila igual y el compilador no lo copia', () => {
    const solo = compilarExpresion('(remate+fees)*4%', juego.contexto)
    const destino = { ...juego.contexto.destino, texto: 'otro texto' }
    const con = compilarExpresion('(remate+fees)*4%', { ...juego.contexto, destino })
    expect(con).toEqual(solo)
    expect(JSON.stringify(con)).not.toContain('otro texto')
  })
})
