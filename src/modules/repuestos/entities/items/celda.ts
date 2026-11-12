// Lo que se guarda al editar una celda de la hoja (8.09-2, C9). Puro: convierte `{columna, valor}` en la fila de `update` de UNA columna (más la moneda cuando hace falta) y valida con
// las reglas de la base. No mira la fase ni el stock: esas columnas no se editan acá.
export const COLUMNAS_EDITABLES = [
  'descripcion',
  'tipo_pieza_id',
  'condicion_id',
  'pais_origen_id',
  'modo_transporte_id',
  'cantidad',
  'precio_cliente',
  'moneda',
  'tracking',
  'notas',
] as const
export type ColumnaEditable = (typeof COLUMNAS_EDITABLES)[number]

export type ValorDeCelda = string | number | null

// Lo que `update` recibe: sólo columnas editables.
export type FilaDeUpdate = {
  descripcion?: string
  tipo_pieza_id?: string | null
  condicion_id?: string | null
  pais_origen_id?: string | null
  modo_transporte_id?: string | null
  cantidad?: number
  precio_cliente?: number | null
  moneda?: string | null
  tracking?: string | null
  notas?: string | null
}

export const LARGO_MAXIMO_DE_DESCRIPCION = 500
export const LARGO_MAXIMO_DE_TRACKING = 200
export const LARGO_MAXIMO_DE_NOTAS_DEL_ITEM = 2000
// `numeric(18,2)`: 16 enteros. Se pide menos para que un `number` no pierda centavos.
export const PRECIO_MAXIMO = 9_999_999_999_999
export const CANTIDAD_MAXIMA = 2_147_483_647

export const MENSAJE_DE_DESCRIPCION = `Escribe qué repuesto es (hasta ${String(LARGO_MAXIMO_DE_DESCRIPCION)} caracteres).`
export const MENSAJE_DE_CANTIDAD = 'La cantidad es un número entero desde 1.'
export const MENSAJE_DE_PRECIO = 'El precio es un monto desde 0, con hasta 2 decimales.'
export const MENSAJE_DE_MONEDA = 'Elige la moneda del precio.'
export const MENSAJE_DE_CATALOGO = 'Elige una opción de la lista.'

export type CambioDeCelda = { ok: true; fila: FilaDeUpdate } | { ok: false; error: string }

const rechazo = (error: string): CambioDeCelda => ({ ok: false, error })
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MONEDA = /^[A-Z]{3}$/

function textoOpcional(valor: ValorDeCelda, maximo: number): string | null | undefined {
  if (valor === null) return null
  if (typeof valor !== 'string') return undefined
  const texto = valor.trim()
  if (texto === '') return null
  return texto.length > maximo ? undefined : texto
}

function aCentavos(precio: number): boolean {
  return Math.abs(precio * 100 - Math.round(precio * 100)) < 1e-6
}

type Regla = (valor: ValorDeCelda, monedaSiFalta: string | null | undefined) => CambioDeCelda

const ok = (fila: FilaDeUpdate): CambioDeCelda => ({ ok: true, fila })

const descripcion: Regla = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim() : ''
  return texto === '' || texto.length > LARGO_MAXIMO_DE_DESCRIPCION
    ? rechazo(MENSAJE_DE_DESCRIPCION)
    : ok({ descripcion: texto })
}

const catalogo =
  (columna: 'tipo_pieza_id' | 'condicion_id' | 'pais_origen_id' | 'modo_transporte_id'): Regla =>
  (valor) =>
    valor === null || (typeof valor === 'string' && GUID.test(valor))
      ? ok({ [columna]: valor })
      : rechazo(MENSAJE_DE_CATALOGO)

const cantidad: Regla = (valor) =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= CANTIDAD_MAXIMA
    ? ok({ cantidad: valor })
    : rechazo(MENSAJE_DE_CANTIDAD)

const precio: Regla = (valor, monedaSiFalta) => {
  if (valor === null) {
    return ok({ precio_cliente: null })
  }
  const valido =
    typeof valor === 'number' &&
    Number.isFinite(valor) &&
    valor >= 0 &&
    valor <= PRECIO_MAXIMO &&
    aCentavos(valor)
  if (!valido) {
    return rechazo(MENSAJE_DE_PRECIO)
  }
  const fila: FilaDeUpdate = { precio_cliente: Math.round(valor * 100) / 100 }
  if (monedaSiFalta !== undefined && monedaSiFalta !== null) {
    if (!MONEDA.test(monedaSiFalta)) return rechazo(MENSAJE_DE_MONEDA)
    fila.moneda = monedaSiFalta
  }
  return ok(fila)
}

const moneda: Regla = (valor) => {
  if (valor === null) return ok({ moneda: null })
  return typeof valor === 'string' && MONEDA.test(valor)
    ? ok({ moneda: valor })
    : rechazo(MENSAJE_DE_MONEDA)
}

const textoLibre =
  (columna: 'tracking' | 'notas', maximo: number): Regla =>
  (valor) => {
    const texto = textoOpcional(valor, maximo)
    return texto === undefined
      ? rechazo(`Admite hasta ${String(maximo)} caracteres.`)
      : ok({ [columna]: texto })
  }

const REGLAS: Record<ColumnaEditable, Regla> = {
  descripcion,
  tipo_pieza_id: catalogo('tipo_pieza_id'),
  condicion_id: catalogo('condicion_id'),
  pais_origen_id: catalogo('pais_origen_id'),
  modo_transporte_id: catalogo('modo_transporte_id'),
  cantidad,
  precio_cliente: precio,
  moneda,
  tracking: textoLibre('tracking', LARGO_MAXIMO_DE_TRACKING),
  notas: textoLibre('notas', LARGO_MAXIMO_DE_NOTAS_DEL_ITEM),
}

function esColumnaEditable(columna: string): columna is ColumnaEditable {
  return (COLUMNAS_EDITABLES as readonly string[]).includes(columna)
}

/**
 * La fila de `update` de una celda. `monedaSiFalta` es la moneda con que el ítem seguiría sin tener una: si se le pone precio y no la tenía, va en el mismo `update` (D52). Vaciar el
 * precio no toca la moneda. Una columna que no es editable no llega acá (el esquema de la action la rechaza), pero se rechaza igual.
 */
export function cambioDeCelda(
  columna: string,
  valor: ValorDeCelda,
  monedaSiFalta?: string | null,
): CambioDeCelda {
  return esColumnaEditable(columna)
    ? REGLAS[columna](valor, monedaSiFalta)
    : rechazo('Esta columna no se edita.')
}
