// Un cliente que se porta como PostgREST para probar la lectura de lo de prueba (4.21-3a-2): sólo para las pruebas.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { FILAS_POR_PAGINA } from '../../entities/formula/terreno-de-prueba'

export const ORIGEN = '11111111-1111-4111-8111-111111111111'
export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export type Tabla = Record<string, unknown>
export type Llamada = { tabla: string; filtros: string[]; limite: number | null; columnas: string }

// Un cliente que se porta como PostgREST: aplica `in`, `eq`, `or`, `order` y `limit`, y **recorta toda respuesta a 1.000 filas** (`max_rows`) aunque se pida más.
export function clienteSimulado(datos: Record<string, Tabla[]>, fallaEn?: string) {
  const llamadas: Llamada[] = []
  const cliente = {
    from(tabla: string) {
      const llamada: Llamada = { tabla, filtros: [], limite: null, columnas: '' }
      llamadas.push(llamada)
      let filas = [...(datos[tabla] ?? [])]
      const orden: string[] = []
      const constructor = {
        select(columnas: string) {
          llamada.columnas = columnas
          return constructor
        },
        in(columna: string, valores: unknown[]) {
          llamada.filtros.push(`in:${columna}`)
          filas = filas.filter((f) => valores.includes(f[columna]))
          return constructor
        },
        eq(columna: string, valor: unknown) {
          llamada.filtros.push(`eq:${columna}`)
          filas = filas.filter((f) => f[columna] === valor)
          return constructor
        },
        or(condicion: string) {
          llamada.filtros.push(`or:${condicion}`)
          filas = filas.filter((f) => f['origen_id'] === ORIGEN || f['origen_id'] === null)
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
        then(resolver: (r: { data: unknown; error: unknown }) => unknown) {
          if (fallaEn === tabla) {
            return Promise.resolve(resolver({ data: null, error: { message: 'x', code: 'XX000' } }))
          }
          const ordenadas = [...filas].sort((a, b) => {
            for (const c of orden) {
              const x = String(a[c])
              const y = String(b[c])
              if (x !== y)
                return typeof a[c] === 'number' ? Number(a[c]) - Number(b[c]) : x < y ? -1 : 1
            }
            return 0
          })
          const tope = Math.min(llamada.limite ?? FILAS_POR_PAGINA, FILAS_POR_PAGINA)
          return Promise.resolve(resolver({ data: ordenadas.slice(0, tope), error: null }))
        },
      }
      return constructor
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

export const tablaDeRef = (n: number, clave: string, origen_id: string | null = null): Tabla => ({
  id: id(n),
  origen_id,
  clave,
  activa: true,
})
export const filasDe = (tablaN: number, cuantas: number): Tabla[] =>
  Array.from({ length: cuantas }, (_, orden) => ({
    id: id(100000 + tablaN * 10000 + orden),
    tabla_id: id(tablaN),
    activa: true,
    orden,
    valores: { orden },
  }))
export const pidiendo = (llamadas: Llamada[], tabla: string) =>
  llamadas.filter((l) => l.tabla === tabla)
