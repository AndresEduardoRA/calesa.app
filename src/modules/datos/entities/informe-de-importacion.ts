// Lo que no entró de una importación total (`importaciones_filas`) como el CSV de «Descargar las rechazadas» (9.06-5, D54). Sin I/O.
// La base guarda el «ya existe» de un lead sin motivo: nunca dice de quién es el lead que ya estaba, y este archivo tampoco.
import { z } from 'zod'

export type FilaDelInforme = {
  // La fila del archivo normalizado: la `n + 1` del de la persona (D32).
  fila: number
  resultado: 'ya_existe' | 'error'
  campo: string | null
  motivo: string | null
}

export type ArchivoEnMemoria = {
  encabezados: readonly string[]
  filas: readonly (readonly string[])[]
}

export const NOMBRE_DE_LAS_RECHAZADAS = 'importacion-rechazadas.csv'

const esquemaDeLaFila = z.object({
  fila: z.number().int().positive(),
  resultado: z.enum(['ya_existe', 'error']),
  campo: z.string().nullable(),
  motivo: z.string().nullable(),
})

export function filasDelInformeDesde(crudo: unknown): FilaDelInforme[] | null {
  const leidas = z.array(esquemaDeLaFila).safeParse(crudo)
  return leidas.success ? leidas.data : null
}

export function motivoDeLaFila(f: FilaDelInforme, entidad: 'leads' | 'vehiculos'): string {
  if (f.motivo) return f.motivo
  if (f.resultado === 'error') return 'Con errores.'
  return entidad === 'leads' ? 'Ya hay un lead con este teléfono.' : 'Ya existe.'
}

const RESULTADO: Record<FilaDelInforme['resultado'], string> = {
  ya_existe: 'Ya existe',
  error: 'Con errores',
}

function campoVisible(campo: string | null): string {
  return campo === 'telefono_principal' ? 'Teléfono' : (campo ?? '')
}

/**
 * Con el archivo de la persona en memoria, cada rechazada lleva sus propias celdas (`archivo.filas[n - 1]`, D32); sin él (desde la lista),
 * sólo fila, resultado, campo y motivo. «Fila» es la de la persona, contando el encabezado.
 */
export function tablaDeRechazadas(
  filas: readonly FilaDelInforme[],
  entidad: 'leads' | 'vehiculos',
  archivo: ArchivoEnMemoria | null,
): string[][] {
  if (archivo === null) {
    return [
      ['Fila', 'Resultado', 'Campo', 'Motivo'],
      ...filas.map((f) => [
        String(f.fila + 1),
        RESULTADO[f.resultado],
        campoVisible(f.campo),
        motivoDeLaFila(f, entidad),
      ]),
    ]
  }
  const ancho = archivo.encabezados.length
  return [
    ['Fila', ...archivo.encabezados, 'Resultado', 'Motivo'],
    ...filas.map((f) => {
      const celdas = archivo.filas[f.fila - 1] ?? []
      const completas = Array.from({ length: ancho }, (_, i) => celdas[i] ?? '')
      return [String(f.fila + 1), ...completas, RESULTADO[f.resultado], motivoDeLaFila(f, entidad)]
    }),
  ]
}
