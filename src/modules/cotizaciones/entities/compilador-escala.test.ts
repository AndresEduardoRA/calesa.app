import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compilarExpresion } from './compilador'
import type { ContextoDeCompilacion } from './compilador-nombres'
import { recorrer, type Medidor } from './medidor'
import type { Nodo } from './nodos'

// El contexto: `miembros` inputs n0…n{miembros-1}, todos del grupo `g`.
function contexto(miembros: number): ContextoDeCompilacion {
  const nodos: Nodo[] = Array.from({ length: miembros }, (_, i) => ({
    id: `n${String(i)}`,
    tipo: 'input',
    etiqueta: `N ${String(i)}`,
    grupo: 'g',
  }))
  return { nodos, grupos: ['g'], params: {}, destino: { id: 'total', etiqueta: 'Total' } }
}

// Un texto de al menos `largo` caracteres: n0+n1+…+n{miembros-1}+n0+… (una sola cadena, un solo suma).
function cadena(largo: number, miembros: number): string {
  const partes: string[] = []
  let n = 0
  for (let i = 0; n < largo; i += 1) {
    const p = `n${String(i % miembros)}`
    partes.push(p)
    n += p.length + 1
  }
  return partes.join('+')
}

// Alternando - y +: el árbol sale un nodo adentro del otro, sin un solo paréntesis (30.000 niveles).
const alternada = (ops: number, miembros: number): string =>
  Array.from({ length: ops }, (_, i) => `n${String(i % miembros)}${i % 2 === 0 ? '-' : '+'}`).join(
    '',
  ) + 'n0'

// (a+b)*(c+d)+…: paréntesis y precedencia.
const agrupada = (veces: number, miembros: number): string =>
  Array.from({ length: veces }, (_, i) => {
    const [a, b] = [`n${String((2 * i) % miembros)}`, `n${String((2 * i + 1) % miembros)}`]
    return `(${a}+${b})*(${b}-${a})`
  }).join('+')

const sumas = (veces: number): string => Array.from({ length: veces }, () => 'SUMA(g)').join('+')

type Familia = {
  nombre: string
  miembros: number
  texto: (escala: number) => string
  chica: number
  grande: number
  expandidos: (escala: number) => number
}
const FAMILIAS: Familia[] = [
  {
    nombre: '2.000 referencias en 100.000 caracteres',
    miembros: 2000,
    texto: (n) => cadena(n, 2000),
    chica: 10_000,
    grande: 100_000,
    expandidos: () => 0,
  },
  {
    nombre: '30.000 operadores alternados, sin paréntesis',
    miembros: 2000,
    texto: (n) => alternada(n, 2000),
    chica: 3000,
    grande: 30_000,
    expandidos: () => 0,
  },
  {
    nombre: 'paréntesis y precedencia',
    miembros: 2000,
    texto: (n) => agrupada(n, 2000),
    chica: 1000,
    grande: 10_000,
    expandidos: () => 0,
  },
  {
    nombre: 'SUMA(g) de 1.000 miembros, repetida',
    miembros: 1000,
    texto: sumas,
    chica: 9,
    grande: 90,
    expandidos: (n) => n * 1000,
  },
]

// Lo que mide un texto: sus caracteres, los nodos y grupos del contexto y los miembros que expande cada SUMA.
const tamano = (texto: string, ctx: ContextoDeCompilacion, expandidos: number) =>
  texto.length + ctx.nodos.length + ctx.grupos.length + expandidos

function visitas(texto: string, ctx: ContextoDeCompilacion): number {
  const medidor: Medidor = { visitas: 0 }
  const r = compilarExpresion(texto, ctx, medidor)
  if (!r.ok) throw new Error(`no compiló: ${r.error.codigo}`)
  return medidor.visitas
}

// k contada por pasadas, no medida. Por carácter: el léxico (1) y la tabla de líneas (1). Por token (a lo sumo uno cada dos
// caracteres, «a+»): leerlo (1), el bucle del parser (1), buscar su nombre (1) y reducirlo (1). Por nodo auxiliar (a lo sumo uno
// cada dos caracteres): la pasada de emisión (3), su etiqueta (a lo sumo 100 caracteres), su posición (la búsqueda binaria en las
// líneas: 0 con una línea) y su id (1). El contexto: un nodo cuesta 3 (el índice, su grupo y los ocupados) y un miembro de SUMA 3.
// 2 + (4 + 3 + 100 + 1) / 2 = 56; con el margen de los nodos del contexto, 70.
const K = 70

describe('compilarExpresion con volumen', () => {
  for (const f of FAMILIAS) {
    describe(f.nombre, () => {
      const [chica, grande] = [f.chica, f.grande].map((n) => ({ texto: f.texto(n), n }))
      const ctx = contexto(f.miembros)

      it('visita a lo sumo k veces el tamaño: es lineal', () => {
        for (const x of [chica, grande]) {
          if (x === undefined) continue
          expect(visitas(x.texto, ctx)).toBeLessThanOrEqual(
            K * tamano(x.texto, ctx, f.expandidos(x.n)),
          )
        }
      })

      it('diez veces más texto son a lo sumo 10,5 veces más visitas, no cien', () => {
        if (chica === undefined || grande === undefined) return
        expect(visitas(grande.texto, ctx)).toBeLessThanOrEqual(10.5 * visitas(chica.texto, ctx))
      })
    })
  }

  it('10.000 paréntesis anidados dan un error de profundidad, no un RangeError, en tiempo lineal', () => {
    const texto = `${'('.repeat(10_000)}n0${')'.repeat(10_000)}`
    const ctx = contexto(10)
    const medidor: Medidor = { visitas: 0 }
    const r = compilarExpresion(texto, ctx, medidor)
    expect(r.ok ? 'compiló' : [r.error.codigo, r.error.tramo.desde]).toEqual([
      'demasiado_profundo',
      64,
    ])
    expect(medidor.visitas).toBeLessThanOrEqual(K * tamano(texto, ctx, 0))
  })

  it('un error cuesta lo mismo que un éxito: el texto entero de 100.000 caracteres con un error al final', () => {
    const ctx = contexto(2000)
    const medidor: Medidor = { visitas: 0 }
    const r = compilarExpresion(`${cadena(100_000, 2000)}+zzz`, ctx, medidor)
    expect(r.ok ? 'compiló' : r.error.codigo).toBe('nombre_desconocido')
    expect(medidor.visitas).toBeLessThanOrEqual(K * tamano('x'.repeat(100_005), ctx, 0))
  })

  it('las cotas caen con una versión cuadrática: buscar cada nombre recorriendo la lista del contexto', () => {
    const ctx = contexto(2000)
    const texto = cadena(10_000, 2000)
    const medidor: Medidor = { visitas: 0 }
    for (const nombre of texto.split('+')) {
      for (const n of recorrer(ctx.nodos, medidor)) if (n.id === nombre) break
    }
    expect(medidor.visitas + visitas(texto, ctx)).toBeGreaterThan(K * tamano(texto, ctx, 0))
  })

  it('las cotas caen con una versión cuadrática: copiar la lista de términos en cada término', () => {
    const texto = cadena(10_000, 2000)
    const ctx = contexto(2000)
    const medidor: Medidor = { visitas: 0 }
    let de: string[] = []
    for (const nombre of texto.split('+')) {
      de = Array.from(recorrer(de, medidor))
      de.push(nombre)
    }
    expect(medidor.visitas + visitas(texto, ctx)).toBeGreaterThan(K * tamano(texto, ctx, 0))
  })
})

describe('el código del compilador', () => {
  const ARCHIVOS = [
    'compilador.ts',
    'compilador-arbol.ts',
    'compilador-emitir.ts',
    'compilador-estado.ts',
    'compilador-funciones.ts',
    'compilador-lexico.ts',
    'compilador-nombres.ts',
    'compilador-reducir.ts',
    'compilador-sintaxis.ts',
    'motivos-del-compilador.ts',
  ]
  const fuente = (a: string) => readFileSync(new URL(a, import.meta.url), 'utf8')

  it('no usa eval, Function ni expresiones regulares: el texto lo escribe una persona', () => {
    for (const a of ARCHIVOS) {
      const f = fuente(a)
      expect(f, a).not.toMatch(/\beval\s*\(/)
      expect(f, a).not.toMatch(/\bnew\s+Function\b|\bFunction\s*\(/)
      expect(f, a).not.toMatch(/\bRegExp\b/)
      // Un literal de regex: una barra que sigue a «(», «=», «,» o «:» y no es un comentario.
      expect(f, a).not.toMatch(/[(=,:]\s*\/[^/*\s][^/\n]*\/[gimsuy]*[.),;]/)
      expect(f, a).not.toMatch(/\.(match|matchAll|replace|replaceAll|search|test|exec|split)\(/)
    }
  })

  it('no busca en una lista (el contador no lo vería): todo pasa por Map, Set y el medidor', () => {
    for (const a of ARCHIVOS) {
      expect(fuente(a), a).not.toMatch(
        /\.(includes|lastIndexOf|find|findIndex|findLast|filter|some|every)\(/,
      )
    }
  })

  it('no hace recursión de pila sobre el texto: ninguna función se nombra dentro de su propio cuerpo', () => {
    for (const a of ARCHIVOS) {
      // Cada declaración de primer nivel con el texto que va hasta la siguiente.
      const trozos = fuente(a).split(/\n(?=(?:export )?(?:function|const|type) )/)
      for (const t of trozos) {
        const nombre = /^(?:export )?function\*? (\w+)/.exec(t)?.[1]
        if (nombre === undefined) continue
        const veces = t.split(new RegExp(`\\b${nombre}\\b`)).length - 1
        expect(veces, `${a}: ${nombre}`).toBe(1)
      }
    }
  })
})
