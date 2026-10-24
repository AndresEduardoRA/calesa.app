// El contexto del compilador (los nodos que el texto puede nombrar) y cómo se resuelve un nombre. Los índices se arman en una
// pasada y toda búsqueda es un `Map` o un `Set` del medidor.
import type { CodigoDeCompilacion, DatosDeError } from './motivos-del-compilador'
import { buscar, esta, recorrer, type Medidor } from './medidor'
import type { Formato, Nodo } from './nodos'

// La fila que se compila: lo que el texto no dice y la fila lleva.
export type DestinoDeCompilacion = {
  id: string
  etiqueta: string
  formato?: Formato
  descripcion?: string
  grupo?: string
  salida?: 'total' | 'base_imponible' | 'aparte'
  bucket?: string
  solo_en?: string[]
}

export type ContextoDeCompilacion = {
  // Los nodos anteriores a la fila, en el orden de la lista: lo único que el texto puede nombrar.
  nodos: readonly Nodo[]
  // Los posteriores, sólo para decir «está más abajo» en vez de «no existe».
  posteriores?: readonly { id: string; grupo?: string }[]
  // Los ids de los grupos de la fórmula.
  grupos: readonly string[]
  // Las constantes que ya existen (sus claves reservan nombres).
  params: Readonly<Record<string, number>>
  destino: DestinoDeCompilacion
}

export type Nombres = {
  porId: ReadonlyMap<string, Nodo>
  posteriores: ReadonlySet<string>
  grupos: ReadonlySet<string>
  miembros: ReadonlyMap<string, Nodo[]>
  conMiembrosPosteriores: ReadonlySet<string>
  // Todo id que una fila nueva no puede tomar.
  ocupados: ReadonlySet<string>
  destino: DestinoDeCompilacion
  m: Medidor
}

export function crearNombres(ctx: ContextoDeCompilacion, m: Medidor): Nombres {
  const porId = new Map<string, Nodo>()
  const miembros = new Map<string, Nodo[]>()
  const ocupados = new Set<string>([ctx.destino.id])
  for (const n of recorrer(ctx.nodos, m)) {
    porId.set(n.id, n)
    ocupados.add(n.id)
    if (n.grupo !== undefined) {
      const lista = miembros.get(n.grupo)
      if (lista === undefined) miembros.set(n.grupo, [n])
      else lista.push(n)
    }
  }
  const posteriores = new Set<string>()
  const conMiembrosPosteriores = new Set<string>()
  for (const p of recorrer(ctx.posteriores ?? [], m)) {
    posteriores.add(p.id)
    ocupados.add(p.id)
    if (p.grupo !== undefined) conMiembrosPosteriores.add(p.grupo)
  }
  for (const clave of recorrer(Object.keys(ctx.params), m)) ocupados.add(clave)
  const grupos = new Set<string>(recorrer(ctx.grupos, m))
  return {
    porId,
    posteriores,
    grupos,
    miembros,
    conMiembrosPosteriores,
    ocupados,
    destino: ctx.destino,
    m,
  }
}

export type Resolucion = { nodo: Nodo } | { codigo: CodigoDeCompilacion; datos: DatosDeError }

// Si un nombre es de la forma de una celda (A1, $A$1, AB12): letras, dígitos, con «$» opcionales.
function pareceA1(s: string): boolean {
  let i = 0
  if (s.charCodeAt(i) === 36) i += 1
  const inicio = i
  while (i < s.length && (s.charCodeAt(i) | 32) >= 97 && (s.charCodeAt(i) | 32) <= 122) i += 1
  if (i === inicio || i - inicio > 3) return false
  if (s.charCodeAt(i) === 36) i += 1
  const digitos = i
  while (i < s.length && s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57) i += 1
  return i > digitos && i === s.length
}

// Qué es un nombre suelto del texto. `permiteVariante`: el primer argumento de SI, donde la variante es «no es una bandera»
// y no «no se usa en un cálculo».
export function resolverNombre(
  nombres: Nombres,
  texto: string,
  permiteVariante: boolean,
): Resolucion {
  const datos = { nombre: texto }
  if (texto === nombres.destino.id) return { codigo: 'ciclo', datos }
  const nodo = buscar(nombres.porId, texto, nombres.m)
  if (nodo !== undefined) {
    if (nodo.tipo === 'opcion' && !permiteVariante) return { codigo: 'variante_en_calculo', datos }
    return { nodo }
  }
  if (esta(nombres.posteriores, texto, nombres.m))
    return { codigo: 'referencia_hacia_adelante', datos }
  if (esta(nombres.grupos, texto, nombres.m)) return { codigo: 'grupo_sin_suma', datos }
  if (pareceA1(texto)) return { codigo: 'referencia_a1', datos }
  return { codigo: 'nombre_desconocido', datos }
}
