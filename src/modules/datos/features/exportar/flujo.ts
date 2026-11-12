import 'server-only'
import { BOM_UTF8, lineaDeCsv, lineasDeCsv, type Delimitador } from '@/shared/lib/csv/escribir'
import type { Cursor } from '@/shared/lib/paginacion'
import {
  quedaToken,
  type ColumnasDeExportacion,
  type LectorDeExportacion,
  type Rango,
} from '../../entities/exportacion'

type EntradaDelFlujo<Fila> = {
  lector: LectorDeExportacion<Fila>
  columnas: ColumnasDeExportacion<Fila>
  rango: Rango
  // Las que dice la constancia: el archivo nunca lleva más.
  filas: number
  delimitador: Delimitador
  // Cuándo vence el token del cliente del flujo (segundos desde 1970).
  venceEn: number
  ahora: () => number
}

// El archivo de «exportar todo», de a una página por vez y sólo cuando el navegador tira (`highWaterMark` 0: en memoria, una página). Se crea
// **después** de dejar la constancia: el primer byte sale después del registrar. Un fallo a mitad de camino lo corta con error (el navegador ve
// una descarga fallida, nunca un CSV que parezca entero); tampoco se pide una página si al token le queda menos del margen.
export function armarFlujo<Fila>(entrada: EntradaDelFlujo<Fila>): ReadableStream<Uint8Array> {
  const { lector, columnas, rango, filas, delimitador, venceEn, ahora } = entrada
  const codificar = new TextEncoder()
  let cursor: Cursor | null = null
  let enviadas = 0
  let cancelado = false
  // Una función y no la variable: el análisis de tipos no ve que `cancel()` la cambia mientras se espera una página.
  const fueCancelado = () => cancelado

  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        controller.enqueue(
          codificar.encode(BOM_UTF8 + lineaDeCsv(columnas.encabezados, delimitador) + '\r\n'),
        )
      },
      async pull(controller) {
        if (!quedaToken(venceEn, ahora())) {
          controller.error(new Error('La sesión venció antes de terminar la exportación.'))
          return
        }
        const pagina = await lector.pagina(rango, cursor)
        if (fueCancelado()) {
          return
        }
        if (!pagina.ok) {
          controller.error(new Error(pagina.error.mensaje))
          return
        }
        const deLaPagina = pagina.data.filas.slice(0, filas - enviadas)
        const antes = columnas.antesDeEscribir ? await columnas.antesDeEscribir(deLaPagina) : null
        if (fueCancelado()) {
          return
        }
        if (antes !== null && !antes.ok) {
          controller.error(new Error(antes.error.mensaje))
          return
        }
        if (deLaPagina.length > 0) {
          controller.enqueue(
            codificar.encode(lineasDeCsv(deLaPagina.map(columnas.fila), delimitador)),
          )
        }
        enviadas += deLaPagina.length
        cursor = pagina.data.siguiente
        if (cursor === null || enviadas >= filas) {
          controller.close()
        }
      },
      cancel() {
        cancelado = true
      },
    },
    { highWaterMark: 0 },
  )
}
