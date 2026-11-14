// Las acciones de un aviso viajan como datos, no como funciones: el servidor dice qué pasó (`ErrorApp.causa`), `entities/` de cada módulo
// traduce esa causa a ofertas y la interfaz las dibuja (`<AccionesDelAviso>`, `avisarError(error, { acciones })`, las líneas del «⋯»).
// Sin React: lo usan `entities/` (cero I/O) y los componentes.
import { CLAVE_DE_PANEL } from './filtros/url'

// Lo que se puede hacer desde un aviso. `ir` y `panel` navegan; `reintentar`, `deshacer` y `recargar` las ejecuta quien dibuja el aviso
// (`alReintentar`, `alDeshacer`, `alRecargar`); `recargar` sin manejador recarga la página.
export type AccionDelAviso =
  | { tipo: 'ir'; etiqueta: string; ruta: string }
  // Abre un panel de la pantalla en la que se está: `?panel=<panel>` más lo que se pase en `valores`, sobre los parámetros de hoy.
  | { tipo: 'panel'; etiqueta: string; panel: string; valores?: Readonly<Record<string, string>> }
  | { tipo: 'reintentar'; etiqueta: string }
  | { tipo: 'deshacer'; etiqueta: string }
  | { tipo: 'recargar'; etiqueta: string }

// Una acción posible y si quien mira puede ejecutarla. `puede` llega resuelto (`puede(permisos, clave, origen)` o lo que decide la base por
// fila): el filtro, el tope y el orden viven en `resolverAcciones()` y nada más. `pedido` va sólo en la acción que *resuelve* el bloqueo:
// sin permiso, en vez del botón se dice a quién pedírselo. Una acción que sólo informa («Ver el lead») sin permiso no se muestra.
export type OfertaDeAccion = {
  accion: AccionDelAviso
  puede: boolean
  pedido?: string
}

export type AccionesDeUnAviso = {
  acciones: AccionDelAviso[]
  pedido: string | null
}

export const MAXIMO_DE_ACCIONES = 3

export const SIN_ACCIONES: AccionesDeUnAviso = { acciones: [], pedido: null }

// «Para quitar el vínculo, pídeselo a quien administra los roles.»
export function pedidoDe(verbo: string): string {
  return `Para ${verbo}, pídeselo a quien administra los roles.`
}

// Las ofertas, en el orden en que el módulo las declaró (la principal primero), sin las que no se pueden, hasta 3. El pedido es el de la
// primera oferta sin permiso que lo trae: uno solo, por mucho que haya.
export function resolverAcciones(ofertas: readonly OfertaDeAccion[]): AccionesDeUnAviso {
  const acciones = ofertas
    .filter((oferta) => oferta.puede)
    .map((oferta) => oferta.accion)
    .slice(0, MAXIMO_DE_ACCIONES)
  const pedido = ofertas.find((oferta) => !oferta.puede && oferta.pedido !== undefined)?.pedido
  return { acciones, pedido: pedido ?? null }
}

export const hayAcciones = (resueltas: AccionesDeUnAviso): boolean =>
  resueltas.acciones.length > 0 || resueltas.pedido !== null

// El destino de una acción `panel`: la misma ruta con los parámetros de hoy, `?panel=<panel>` y sus `valores`. Un valor de hoy con la
// misma clave se reemplaza.
export function hrefDePanel(
  accion: Extract<AccionDelAviso, { tipo: 'panel' }>,
  ruta: string,
  busqueda: string,
): string {
  const parametros = new URLSearchParams(busqueda)
  parametros.set(CLAVE_DE_PANEL, accion.panel)
  for (const [clave, valor] of Object.entries(accion.valores ?? {})) {
    parametros.set(clave, valor)
  }
  return `${ruta}?${parametros.toString()}`
}
