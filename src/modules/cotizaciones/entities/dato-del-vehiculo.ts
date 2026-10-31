import { ok, type Resultado } from '@/shared/lib/errores'
import type { HojaLista } from './hoja'
import type { TablaDeAyuda } from './tabla-de-ayuda'

// El dato del vehículo que casa con una tabla de la hoja (4.14-2c3): el panel del vehículo lo ofrece para elegir entre las filas de la tabla. Puro: viaja al navegador.

// Una tabla de la hoja y su columna que casa con el campo.
export type TablaDelDato = { tabla: string; columna: string }
export type DatoDeLaHoja = { campo: string; tablas: TablaDelDato[] }

// Los datos del vehículo que casan con alguna tabla de la hoja, por campo, en el orden en que aparecen por primera vez y sin repetir una tabla. Devuelve todo lo que viaja (también
// una columna fija del vehículo): qué se elige lo decide el panel.
export function datosDelVehiculoDeLaHoja(hoja: Pick<HojaLista, 'secciones'>): DatoDeLaHoja[] {
  const porCampo = new Map<string, TablaDelDato[]>()
  for (const item of hoja.secciones.flatMap((seccion) => seccion.items)) {
    if (item.tipo !== 'celda' || item.datoDelVehiculo === null) {
      continue
    }
    const { tabla, columnas } = item.datoDelVehiculo
    for (const { columna, campo } of columnas) {
      const tablas = porCampo.get(campo) ?? []
      if (!tablas.some((t) => t.tabla === tabla && t.columna === columna)) {
        tablas.push({ tabla, columna })
      }
      porCampo.set(campo, tablas)
    }
  }
  return [...porCampo].map(([campo, tablas]) => ({ campo, tablas }))
}

// Las opciones de un dato: los textos de su columna en las filas de sus tablas, tal cual (P1 del 2c3), y la etiqueta de la columna.
export type OpcionesDelDato = { etiqueta: string | null; opciones: string[]; hayMas: boolean }

// Sólo un texto no vacío es una opción: un número se guardaría como texto en un campo de texto y el motor, que compara con igualdad estricta, no lo casaría.
export function opcionesDelDato(
  leidas: readonly { tabla: TablaDeAyuda; columna: string }[],
): OpcionesDelDato {
  const opciones = new Set<string>()
  let etiqueta: string | null = null
  let hayMas = false
  for (const { tabla, columna } of leidas) {
    etiqueta ??= tabla.columnas.find((c) => c.clave === columna)?.etiqueta ?? null
    hayMas ||= tabla.hayMas
    for (const fila of tabla.filas) {
      const valor = fila[columna]
      if (typeof valor === 'string' && valor.trim() !== '') {
        opciones.add(valor)
      }
    }
  }
  return { etiqueta, opciones: [...opciones], hayMas }
}

// Lee cada tabla distinta una sola vez, en paralelo, y junta sus opciones. Una tabla que falla hace fallar la lectura.
export async function leerOpcionesCon(
  leer: (tabla: string) => Promise<Resultado<TablaDeAyuda>>,
  tablas: readonly TablaDelDato[],
): Promise<Resultado<OpcionesDelDato>> {
  const distintas = [...new Set(tablas.map((t) => t.tabla))]
  const leidas = await Promise.all(distintas.map((tabla) => leer(tabla)))
  const porTabla = new Map<string, TablaDeAyuda>()
  for (const [i, leida] of leidas.entries()) {
    if (!leida.ok) {
      return leida
    }
    porTabla.set(distintas[i] ?? '', leida.data)
  }
  return ok(
    opcionesDelDato(
      tablas.flatMap(({ tabla, columna }) => {
        const leida = porTabla.get(tabla)
        return leida ? [{ tabla: leida, columna }] : []
      }),
    ),
  )
}
