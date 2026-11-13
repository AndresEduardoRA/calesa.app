// importar-csv: el trabajo de una invocación, sin `Deno` (la prueba de contrato lo carga en Node con dependencias falsas).
// Baja el archivo normalizado, lo lee y valida contra la plantilla, y manda lotes de 50 a `importacion_procesar_lote` hasta
// terminar o gastar el presupuesto. La marca de avance la dice siempre la base: dos invocaciones a la vez no procesan dos veces
// la misma fila (la base es idempotente por importación y fila, y forma en fila los lotes con el candado de la importación).
import { leerCsv, mensajeDeLectura, textoDeBytes } from './leer.ts'
import {
  FILAS_POR_LOTE,
  LIMITES_DEL_ARCHIVO,
  filaDelLote,
  validarEncabezados,
  type EntidadImportable,
  type FilaDelLote,
} from './plantillas.ts'

// Por debajo de los 60 s del `pg_net` del job que la despierta; lo que falte lo retoma el job.
export const PRESUPUESTO_MS = 45_000

const MAX_ERROR = 500

export type Importacion = {
  id: string
  entidad: string
  archivo_ruta: string | null
  estado: string
}

export type Dependencias = {
  rpc: <T>(nombre: string, argumentos: Record<string, unknown>) => Promise<T>
  leerImportacion: (id: string) => Promise<Importacion | null>
  bajar: (ruta: string) => Promise<Uint8Array | null>
  borrar: (ruta: string) => Promise<boolean>
  ahora: () => number
}

export type Resultado = {
  importacion: string
  estado: string
  procesadas: number | null
  filas_total: number | null
}

type Empezada =
  { estado: 'fallida' } | { estado: 'procesando'; filas_total: number; procesadas: number }

type Lote = { estado: 'fallida' } | { estado?: undefined; procesadas: number; saltadas: number }

function esEntidad(entidad: string): entidad is EntidadImportable {
  return entidad === 'leads' || entidad === 'vehiculos'
}

// Nunca antes de `terminada` o `fallida`. Que falle no cambia el resultado: queda anotado.
async function borrarArchivo(dep: Dependencias, imp: Importacion & { archivo_ruta: string }) {
  const borrado = await dep.borrar(imp.archivo_ruta).catch(() => false)
  if (!borrado) {
    console.warn(`importar-csv: no se pudo borrar el archivo de ${imp.id}`)
  }
}

async function fallar(
  dep: Dependencias,
  imp: Importacion & { archivo_ruta: string },
  motivo: string,
): Promise<Resultado> {
  await dep.rpc('importacion_terminar', {
    p_importacion: imp.id,
    p_error: motivo.slice(0, MAX_ERROR),
  })
  await borrarArchivo(dep, imp)
  return { importacion: imp.id, estado: 'fallida', procesadas: null, filas_total: null }
}

// Las filas de datos del archivo, ya validadas en su forma; o el motivo por el que el archivo no sirve.
function leerArchivo(
  bytes: Uint8Array,
  entidad: EntidadImportable,
): { ok: true; filas: string[][] } | { ok: false; motivo: string } {
  const texto = textoDeBytes(bytes, LIMITES_DEL_ARCHIVO)
  if (!texto.ok) {
    return { ok: false, motivo: mensajeDeLectura(texto.error, LIMITES_DEL_ARCHIVO) }
  }
  const leido = leerCsv(texto.texto, LIMITES_DEL_ARCHIVO)
  if (!leido.ok) {
    return { ok: false, motivo: mensajeDeLectura(leido.error, LIMITES_DEL_ARCHIVO) }
  }
  const motivo = validarEncabezados(entidad, leido.encabezados)
  return motivo === null ? { ok: true, filas: leido.filas } : { ok: false, motivo }
}

function armarLote(
  entidad: EntidadImportable,
  filas: string[][],
  desde: number,
  total: number,
): FilaDelLote[] {
  const lote: FilaDelLote[] = []
  for (let n = desde; n <= Math.min(desde + FILAS_POR_LOTE - 1, total); n++) {
    lote.push(filaDelLote(entidad, filas[n - 1] ?? [], n))
  }
  return lote
}

export async function procesarImportacion(
  id: string,
  dep: Dependencias,
  inicio: number,
): Promise<Resultado> {
  const imp = await dep.leerImportacion(id)
  if (!imp || imp.archivo_ruta === null || imp.estado === 'terminada' || imp.estado === 'fallida') {
    return {
      importacion: id,
      estado: imp?.estado ?? 'no_existe',
      procesadas: null,
      filas_total: null,
    }
  }
  const conArchivo = { ...imp, archivo_ruta: imp.archivo_ruta }
  if (!esEntidad(imp.entidad)) {
    return fallar(dep, conArchivo, 'Esta importación no es de leads ni de vehículos.')
  }
  const bytes = await dep.bajar(conArchivo.archivo_ruta)
  if (!bytes) {
    // No hay nada que borrar.
    await dep.rpc('importacion_terminar', {
      p_importacion: id,
      p_error: 'No encontramos el archivo de la importación: vuelve a subirlo.',
    })
    return { importacion: id, estado: 'fallida', procesadas: null, filas_total: null }
  }
  const archivo = leerArchivo(bytes, imp.entidad)
  if (!archivo.ok) {
    return fallar(dep, conArchivo, archivo.motivo)
  }
  return procesarLotes(conArchivo, imp.entidad, archivo.filas, dep, inicio)
}

async function procesarLotes(
  imp: Importacion & { archivo_ruta: string },
  entidad: EntidadImportable,
  filas: string[][],
  dep: Dependencias,
  inicio: number,
): Promise<Resultado> {
  const empezada = await dep.rpc<Empezada>('importacion_empezar', {
    p_importacion: imp.id,
    p_total: filas.length,
  })
  if (empezada.estado === 'fallida') {
    await borrarArchivo(dep, imp)
    return { importacion: imp.id, estado: 'fallida', procesadas: null, filas_total: null }
  }
  const total = empezada.filas_total
  let procesadas = empezada.procesadas
  const enCurso = (): Resultado => ({
    importacion: imp.id,
    estado: 'procesando',
    procesadas,
    filas_total: total,
  })
  while (procesadas < total && dep.ahora() - inicio < PRESUPUESTO_MS) {
    const lote = armarLote(entidad, filas, procesadas + 1, total)
    const respuesta = await dep.rpc<Lote>('importacion_procesar_lote', {
      p_importacion: imp.id,
      p_desde: procesadas + 1,
      p_filas: lote,
    })
    if (respuesta.estado === 'fallida') {
      await borrarArchivo(dep, imp)
      return { importacion: imp.id, estado: 'fallida', procesadas, filas_total: total }
    }
    // La marca de la base, nunca la cuenta propia.
    procesadas = respuesta.procesadas
    if (respuesta.saltadas === lote.length) {
      // Otra invocación va adelante: ella termina.
      return enCurso()
    }
  }
  if (procesadas < total) {
    // Se acabó el tiempo: el job la retoma.
    return enCurso()
  }
  await dep.rpc('importacion_terminar', { p_importacion: imp.id })
  await borrarArchivo(dep, imp)
  return { importacion: imp.id, estado: 'terminada', procesadas, filas_total: total }
}
