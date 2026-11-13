// El archivo normalizado de la importación total (9.06): el CSV que sube la pantalla de Datos, con las claves de `datos` de
// `importacion_procesar_lote` como columnas, y lo que la función edge hace con cada fila antes de mandarla en un lote.
// Sólo la forma: lo que depende de la base (que el tipo exista, el VIN, los requeridos, los atributos por tipo) lo dice la base por fila.
//
// Sin un solo import: es copia exacta en `supabase/functions/importar-csv/plantillas.ts` (Deno) y la guarda
// `scripts/guardas/areas-c/importar-csv-copias.test.ts` falla si se separan. Se edita acá y se copia.

export type EntidadImportable = 'leads' | 'vehiculos'

export type Validador =
  | { tipo: 'texto'; max: number }
  | { tipo: 'uuid' }
  | { tipo: 'entero'; min: number; max: number }
  | { tipo: 'numero'; min: number; max: number; decimales: number }
  | { tipo: 'si_no' }
  | { tipo: 'objeto'; max: number }

export type ColumnaDePlantilla = { clave: string; validador: Validador }

export type ValorDeCelda = string | number | boolean | Record<string, unknown>

export type Rechazo = { motivo: string; campo?: string }

export type FilaDelLote =
  { fila: number; datos: Record<string, ValorDeCelda> } | { fila: number; rechazo: Rechazo }

// Lo que escribe la pantalla: una fila convertida o una que no se pudo convertir, con su motivo.
export type FilaNormalizada = { datos: Record<string, ValorDeCelda> } | { rechazo: Rechazo }

// Las dos primeras columnas del archivo: la pantalla anota ahí la fila que no pudo convertir (la numeración no se corre).
export const COLUMNAS_DE_RECHAZO = ['rechazo_motivo', 'rechazo_campo'] as const

// El máximo de filas de un lote de `importacion_procesar_lote` (`_importacion_lote_validar`).
export const FILAS_POR_LOTE = 50

const MAX_MOTIVO = 500
const MAX_CAMPO = 120

const texto = (max: number): Validador => ({ tipo: 'texto', max })
const UUID_V: Validador = { tipo: 'uuid' }
const SI_NO: Validador = { tipo: 'si_no' }
const ATRIBUTOS: ColumnaDePlantilla = {
  clave: 'atributos',
  validador: { tipo: 'objeto', max: 20000 },
}

// En el orden de las claves que admite la base: las de leads en `_importacion_fila_lead`, las de vehículos en `vehiculo_crear`.
export const PLANTILLAS: Record<EntidadImportable, readonly ColumnaDePlantilla[]> = {
  leads: [
    { clave: 'nombre', validador: texto(120) },
    { clave: 'telefono_principal', validador: texto(40) },
    { clave: 'tipo_lead_id', validador: UUID_V },
    { clave: 'origen_lead_id', validador: UUID_V },
    ATRIBUTOS,
  ],
  vehiculos: [
    { clave: 'titulo', validador: texto(160) },
    { clave: 'marca', validador: texto(80) },
    { clave: 'modelo', validador: texto(80) },
    { clave: 'anio', validador: { tipo: 'entero', min: 1900, max: 2100 } },
    { clave: 'vin', validador: texto(17) },
    { clave: 'lote', validador: texto(40) },
    { clave: 'plataforma', validador: texto(40) },
    { clave: 'url_origen', validador: texto(500) },
    { clave: 'precio', validador: { tipo: 'numero', min: 0, max: 999999999999, decimales: 2 } },
    { clave: 'precio_negociable', validador: SI_NO },
    { clave: 'acepta_permuta', validador: SI_NO },
    { clave: 'placado', validador: SI_NO },
    { clave: 'kilometraje', validador: { tipo: 'entero', min: 0, max: 2000000000 } },
    { clave: 'categoria_id', validador: UUID_V },
    ATRIBUTOS,
  ],
}

// Con la forma de `LimitesDeLectura` (`shared/lib/csv/leer.ts`). 10 MB: la función lee el archivo entero en cada invocación.
export const LIMITES_DEL_ARCHIVO = {
  bytes: 10 * 1024 * 1024,
  filas: 20000,
  columnas:
    COLUMNAS_DE_RECHAZO.length + Math.max(PLANTILLAS.leads.length, PLANTILLAS.vehiculos.length),
  celda: 20000,
}

export type ResultadoDeCelda = { ok: true; valor: ValorDeCelda } | { ok: false; motivo: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ENTERO = /^-?[0-9]{1,15}$/

const largo = (max: number) => `Pasa de ${String(max)} caracteres.`

function enRango(valor: number, min: number, max: number): boolean {
  return Number.isFinite(valor) && valor >= min && valor <= max
}

type Rango = { min: number; max: number }

function validarNumero(
  celda: string,
  forma: RegExp,
  { min, max }: Rango,
  motivo: string,
): ResultadoDeCelda {
  const valor = Number(celda)
  return forma.test(celda) && enRango(valor, min, max) ? { ok: true, valor } : { ok: false, motivo }
}

function validarSiNo(celda: string): ResultadoDeCelda {
  if (celda === 'true' || celda === 'false') {
    return { ok: true, valor: celda === 'true' }
  }
  return { ok: false, motivo: 'Tiene que ser true o false.' }
}

// Un motivo nunca repite la celda ni una parte: es un dato de una persona.
export function validarCelda(validador: Validador, celda: string): ResultadoDeCelda {
  switch (validador.tipo) {
    case 'texto':
      return celda.length <= validador.max
        ? { ok: true, valor: celda }
        : { ok: false, motivo: largo(validador.max) }
    case 'uuid':
      return UUID.test(celda)
        ? { ok: true, valor: celda }
        : { ok: false, motivo: 'No es un identificador válido.' }
    case 'entero':
      return validarNumero(
        celda,
        ENTERO,
        validador,
        `Tiene que ser un número entero entre ${String(validador.min)} y ${String(validador.max)}.`,
      )
    case 'numero':
      return validarNumero(
        celda,
        new RegExp(`^-?[0-9]{1,15}(\\.[0-9]{1,${String(validador.decimales)}})?$`),
        validador,
        `Tiene que ser un número entre ${String(validador.min)} y ${String(validador.max)}, con punto decimal.`,
      )
    case 'si_no':
      return validarSiNo(celda)
    case 'objeto':
      return validarObjeto(celda, validador.max)
  }
}

function validarObjeto(celda: string, max: number): ResultadoDeCelda {
  if (celda.length > max) {
    return { ok: false, motivo: largo(max) }
  }
  let valor: unknown
  try {
    valor = JSON.parse(celda)
  } catch {
    return { ok: false, motivo: 'No es un objeto JSON.' }
  }
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return { ok: false, motivo: 'No es un objeto JSON.' }
  }
  return { ok: true, valor: valor as Record<string, unknown> }
}

function encabezadosDe(entidad: EntidadImportable): string[] {
  return [...COLUMNAS_DE_RECHAZO, ...PLANTILLAS[entidad].map((c) => c.clave)]
}

// `null` si son exactamente los de la plantilla, en su orden. El motivo no repite los encabezados.
export function validarEncabezados(
  entidad: EntidadImportable,
  encabezados: readonly string[],
): string | null {
  const esperados = encabezadosDe(entidad)
  const iguales =
    encabezados.length === esperados.length && esperados.every((e, i) => encabezados[i] === e)
  return iguales
    ? null
    : 'El archivo no tiene las columnas de la importación: vuelve a subirlo desde la pantalla de Datos.'
}

// Una fila del archivo (las celdas en el orden de los encabezados) como elemento del lote, con su número de fila.
export function filaDelLote(
  entidad: EntidadImportable,
  celdas: readonly string[],
  fila: number,
): FilaDelLote {
  const motivo = (celdas[0] ?? '').trim()
  if (motivo !== '') {
    const campo = (celdas[1] ?? '').trim()
    const rechazo: Rechazo = { motivo: motivo.slice(0, MAX_MOTIVO).trim() }
    if (campo.length >= 1 && campo.length <= MAX_CAMPO) {
      rechazo.campo = campo
    }
    return { fila, rechazo }
  }
  const datos: Record<string, ValorDeCelda> = {}
  for (const [i, columna] of PLANTILLAS[entidad].entries()) {
    const celda = celdas[i + COLUMNAS_DE_RECHAZO.length] ?? ''
    if (celda === '') {
      continue
    }
    const resultado = validarCelda(columna.validador, celda)
    if (!resultado.ok) {
      return { fila, rechazo: { motivo: resultado.motivo, campo: columna.clave } }
    }
    datos[columna.clave] = resultado.valor
  }
  return { fila, datos }
}

const A_COMILLAR = /[",;\r\n]|^\s|\s$/

function celdaCsv(valor: string): string {
  return A_COMILLAR.test(valor) ? `"${valor.replaceAll('"', '""')}"` : valor
}

function textoDeValor(valor: ValorDeCelda | undefined): string {
  if (valor === undefined) {
    return ''
  }
  if (typeof valor === 'object') {
    return JSON.stringify(valor)
  }
  return String(valor)
}

// Lo contrario de `filaDelLote`: el texto del archivo normalizado. Es de máquina (no se abre en una planilla): sin el apóstrofo
// ante `= + - @` de la exportación.
export function escribirArchivo(
  entidad: EntidadImportable,
  filas: readonly FilaNormalizada[],
): string {
  const columnas = PLANTILLAS[entidad]
  const lineas = [encabezadosDe(entidad).join(',')]
  for (const fila of filas) {
    const celdas =
      'rechazo' in fila
        ? [fila.rechazo.motivo, fila.rechazo.campo ?? '', ...columnas.map(() => '')]
        : ['', '', ...columnas.map((c) => textoDeValor(fila.datos[c.clave]))]
    lineas.push(celdas.map(celdaCsv).join(','))
  }
  return `${lineas.join('\r\n')}\r\n`
}
