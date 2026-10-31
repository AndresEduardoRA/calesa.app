import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { formatearNumero, formatearParaEditar } from '@/shared/lib/formato'

// La tabla de referencia que abre la ayuda de una celda (paso 4.13-4c2): `cotizacion_tabla()` con la hoja abierta, leída desde el navegador. Puro: este archivo viaja al
// navegador con el lector. El esquema no es estricto (lo que no nombra se cae) y una fila que no es un objeto cuenta como vacía.
export type PedidoDeTabla = {
  tabla: string
  origenId: string
  // La hoja abierta que firmó la base (la misma del recálculo y del guardado): con ella la tabla es la de la versión que se dibujó, no la publicada hoy.
  abierta: string
}

export type ColumnaDeTabla = { clave: string; etiqueta: string; tipo: string }
export type FilaDeTabla = Readonly<Record<string, unknown>>
export type TablaDeAyuda = {
  clave: string
  nombre: string
  columnas: ColumnaDeTabla[]
  filas: FilaDeTabla[]
  // Había más filas que el tope de la lectura (1.000).
  hayMas: boolean
}

// Nunca `p_cotizacion`: la ayuda de la hoja es de la versión abierta, no de una cotización guardada.
export const argumentosDeTabla = (p: PedidoDeTabla) => ({
  p_tabla: p.tabla,
  p_origen: p.origenId,
  p_abierta: p.abierta,
})

const esquemaDeTabla = z.object({
  clave: z.string(),
  nombre: z.string(),
  columnas: z.array(z.object({ clave: z.string(), etiqueta: z.string(), tipo: z.string() })),
  filas: z.array(z.unknown()),
  hay_mas: z.boolean(),
})

const esFila = (fila: unknown): fila is FilaDeTabla =>
  typeof fila === 'object' && fila !== null && !Array.isArray(fila)

export function tablaDesde(crudo: unknown): TablaDeAyuda | null {
  const leida = esquemaDeTabla.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const { clave, nombre, columnas, filas, hay_mas: hayMas } = leida.data
  return { clave, nombre, columnas, filas: filas.map((f) => (esFila(f) ? f : {})), hayMas }
}

// El mensaje de la base nunca se muestra (puede nombrar una tabla que quien mira no ve): la pantalla decide su texto con el código.
export function resultadoDeTabla(respuesta: {
  data: unknown
  error: { code?: string | null; message: string } | null
}): Resultado<TablaDeAyuda> {
  if (respuesta.error) {
    return { ok: false, error: errorDePostgrest(respuesta.error) }
  }
  const leida = tablaDesde(respuesta.data)
  return leida ? ok(leida) : fallo('inesperado', 'No pudimos leer la tabla.')
}

// Las columnas que se dibujan: sólo las declaradas (una clave de más en las filas de quien configura no se ve). Sin declaradas (una copia congelada que ya no tiene tabla
// viva), las claves de la primera fila, en su orden, con la clave de encabezado y como texto: sin tipo no se sabe si un número es dinero o un año, así que va con `formatearNumero` y a la vista (4-47).
export function columnasDeLaTabla(tabla: TablaDeAyuda): ColumnaDeTabla[] {
  if (tabla.columnas.length > 0) {
    return tabla.columnas
  }
  const primera = tabla.filas[0] ?? {}
  return Object.keys(primera).map((clave) => ({
    clave,
    etiqueta: clave,
    tipo: 'texto',
  }))
}

// Lo que una celda de la tabla dibuja: una cifra (la pantalla decide si es dinero) o un texto.
export type CeldaDeTabla =
  { tipo: 'cifra'; valor: number; texto: string } | { tipo: 'texto'; texto: string }

export const SIN_VALOR = '—'

// Un `numero`, con hasta 6 decimales (la precisión de la tabla) y sin ceros de relleno; un `anio`, sin separador de miles («2018», no «2.018»); cualquier otro tipo, el texto tal
// cual (un número ahí con `formatearNumero`, un booleano «Sí»/«No»). Nulo, ausente o vacío: «—».
export function celdaDeTabla(valor: unknown, tipo: string, locale: string): CeldaDeTabla {
  if (valor === null || valor === undefined || valor === '') {
    return { tipo: 'texto', texto: SIN_VALOR }
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    if (tipo === 'numero') {
      return { tipo: 'cifra', valor, texto: formatearNumero(valor, { locale, decimales: 6 }) }
    }
    return {
      tipo: 'texto',
      texto:
        tipo === 'anio'
          ? formatearParaEditar(valor, { locale })
          : formatearNumero(valor, { locale, decimales: 6 }),
    }
  }
  if (typeof valor === 'boolean') {
    return { tipo: 'texto', texto: valor ? 'Sí' : 'No' }
  }
  return { tipo: 'texto', texto: typeof valor === 'string' ? valor : SIN_VALOR }
}
