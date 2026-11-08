// Un cliente que se porta como PostgREST para probar la lectura de las tablas de referencia (4.23-2): sólo para las pruebas. Aplica `eq`, el `or` del cursor
// `(orden, id)` y el de los orígenes, `order` y `limit`, y **recorta toda respuesta a `maxRows`** aunque se pida más (el `max_rows` del despliegue).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'

export const ORIGEN = '11111111-1111-4111-8111-111111111111'
export const TABLA = '22222222-2222-4222-8222-222222222222'
export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

type Fila = Record<string, unknown>
export type Llamada = { tabla: string; filtros: string[]; limite: number | null }

const CURSOR = /^orden\.gt\.(-?\d+),and\(orden\.eq\.-?\d+,id\.gt\.([0-9a-f-]+)\)$/

function aplicarOr(filas: Fila[], condicion: string): Fila[] {
  const cursor = CURSOR.exec(condicion)
  if (cursor) {
    const orden = Number(cursor[1])
    const ultimo = String(cursor[2])
    return filas.filter(
      (f) => Number(f['orden']) > orden || (f['orden'] === orden && String(f['id']) > ultimo),
    )
  }
  return filas.filter((f) => f['origen_id'] === ORIGEN || f['origen_id'] === null)
}

function ordenar(filas: Fila[], orden: string[]): Fila[] {
  return [...filas].sort((a, b) => {
    for (const c of orden) {
      const x = a[c]
      const y = b[c]
      if (x === y) continue
      if (typeof x === 'number' && typeof y === 'number') return x - y
      return String(x) < String(y) ? -1 : 1
    }
    return 0
  })
}

export function clienteSimulado(datos: Record<string, Fila[]>, maxRows = 1000) {
  const llamadas: Llamada[] = []
  const cliente = {
    from(tabla: string) {
      const llamada: Llamada = { tabla, filtros: [], limite: null }
      llamadas.push(llamada)
      let filas = [...(datos[tabla] ?? [])]
      const orden: string[] = []
      const resultado = () => {
        const tope = Math.min(llamada.limite ?? maxRows, maxRows)
        return { data: ordenar(filas, orden).slice(0, tope), error: null }
      }
      const constructor = {
        select: () => constructor,
        eq(columna: string, valor: unknown) {
          llamada.filtros.push(`eq:${columna}`)
          filas = filas.filter((f) => f[columna] === valor)
          return constructor
        },
        or(condicion: string) {
          llamada.filtros.push(`or:${condicion}`)
          filas = aplicarOr(filas, condicion)
          return constructor
        },
        order(columna: string) {
          orden.push(columna)
          return constructor
        },
        limit(n: number) {
          llamada.limite = n
          return constructor
        },
        maybeSingle() {
          const { data } = resultado()
          return Promise.resolve({ data: data[0] ?? null, error: null })
        },
        then(resolver: (r: { data: unknown; error: unknown }) => unknown) {
          return Promise.resolve(resolver(resultado()))
        },
      }
      return constructor
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

export const tablaDeLaBase = (activa = true): Fila => ({
  id: TABLA,
  origen_id: ORIGEN,
  clave: 'fletes',
  nombre: 'Fletes',
  descripcion: null,
  columnas: [{ clave: 'monto', etiqueta: 'Monto', tipo: 'numero' }],
  version: 3,
  nota: 'precios de octubre',
  publicado_en: '2026-11-08T10:00:00+00:00',
  autor: { nombre: 'Ana' },
  activa,
})

// `cuantas` filas activas de la tabla, con órdenes que se repiten de a dos (el id desempata) y desordenadas en el arreglo.
export const filasDe = (cuantas: number): Fila[] =>
  Array.from({ length: cuantas }, (_, n) => ({
    id: id(1_000_000 + n),
    tabla_id: TABLA,
    activa: true,
    orden: Math.floor(n / 2),
    valores: { monto: n },
  })).reverse()

export const pedidosDe = (llamadas: Llamada[], tabla: string) =>
  llamadas.filter((l) => l.tabla === tabla)
