import { z } from 'zod'
import type { EsquemaDeFiltros, ValoresDeFiltros } from '@/shared/lib/filtros'
import { cumpleElMinimo, type MinimoDeBusqueda } from '@/shared/lib/filtros'
import { estadoDelProyecto, type EstadoDelProyecto } from './estado'

// El listado de `/repuestos` (8.09-1, C2): los proyectos por cursor `numero` (descendente), con sus filtros en la URL. Puro: la página lee la URL y este archivo la
// vuelve el pedido que entiende `repuestos_proyectos_listar()`. Sin «Anterior»: el cursor es un número que la base no sabe recorrer hacia atrás (D36).

// Lo que la RPC acota con `_acotar_pagina(p_tamano, 50, 100)`; `scripts/guardas/paginas.test.ts` lo exige.
export const MAXIMO_DE_PAGINA_DE_REPUESTOS = 100
export const CLAVE_DE_BUSQUEDA_DE_PROYECTOS = 'q'
export const CLAVE_DE_ESTADO_DE_PROYECTOS = 'estado'

export const ESTADOS_DEL_LISTADO = ['abiertos', 'cerrados', 'todos'] as const
export type EstadoDelListado = (typeof ESTADOS_DEL_LISTADO)[number]
export const ESTADO_POR_DEFECTO_DEL_LISTADO: EstadoDelListado = 'abiertos'

// Espejo de la RPC: con menos de 3 caracteres (salvo un número) se ignora, así que la interfaz ni lo manda.
export const MINIMO_DE_BUSQUEDA_DE_PROYECTOS: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: true,
  aviso: 'Escribe al menos 3 letras o un número para buscar.',
}

export function esquemaDelListado(): EsquemaDeFiltros {
  return {
    busqueda: {
      clave: CLAVE_DE_BUSQUEDA_DE_PROYECTOS,
      etiqueta: 'Buscar por número, vehículo, VIN o cliente',
      marcador: 'Número, vehículo o cliente',
      minimo: MINIMO_DE_BUSQUEDA_DE_PROYECTOS,
    },
    filtros: [
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_ESTADO_DE_PROYECTOS,
        etiqueta: 'Estado',
        porDefecto: ESTADO_POR_DEFECTO_DEL_LISTADO,
        opciones: [
          { valor: 'abiertos', etiqueta: 'Abiertos' },
          { valor: 'cerrados', etiqueta: 'Cerrados' },
          { valor: 'todos', etiqueta: 'Todos' },
        ],
      },
    ],
  }
}

const CURSOR_NUMERICO = /^[1-9]\d{0,17}$/

/** `?cursor=`: de 1 a 18 dígitos (cabe en un `bigint` sin pasar de `Number.MAX_SAFE_INTEGER`); cualquier otra cosa es la primera página. */
export function leerCursorDeProyectos(texto: string | null | undefined): number | null {
  if (texto === null || texto === undefined || !CURSOR_NUMERICO.test(texto)) {
    return null
  }
  const numero = Number(texto)
  return Number.isSafeInteger(numero) ? numero : null
}

export function estadoDelListadoDe(valores: ValoresDeFiltros): EstadoDelListado {
  const valor = valores.porClave[CLAVE_DE_ESTADO_DE_PROYECTOS]
  const elegido = ESTADOS_DEL_LISTADO.find((e) => valor?.tipo === 'eleccion' && e === valor.valor)
  return elegido ?? ESTADO_POR_DEFECTO_DEL_LISTADO
}

// Los cuatro argumentos de `repuestos_proyectos_listar()`.
export type PedidoDelListado = {
  cursor: number | null
  tamano: number
  q: string | null
  estado: 'abiertos' | 'cerrados' | null
}

export function pedidoDelListado(
  valores: ValoresDeFiltros,
  { cursor, tamano }: { cursor: number | null; tamano: number },
): PedidoDelListado {
  const texto = valores.busqueda.trim()
  const estado = estadoDelListadoDe(valores)
  return {
    cursor,
    tamano,
    q: cumpleElMinimo(texto, MINIMO_DE_BUSQUEDA_DE_PROYECTOS) ? texto : null,
    estado: estado === 'todos' ? null : estado,
  }
}

// ——— Filas ———

export type FilaDeProyecto = {
  id: string
  numero: number
  vehiculoId: string | null
  vehiculoTitulo: string | null
  vehiculoEtiqueta: string | null
  vin: string | null
  clienteNombre: string | null
  cerradoEn: string | null
  items: number
  pendientes: number
  enStock: number
  terminados: number
  ultimaActividad: string
  actualizadoEn: string
}

const esquemaDeFila = z.object({
  id: z.guid(),
  numero: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  vehiculo_id: z.guid().nullable(),
  vehiculo_titulo: z.string().nullable(),
  vehiculo_etiqueta: z.string().nullable(),
  vin: z.string().nullable(),
  cliente_nombre: z.string().nullable(),
  cerrado_en: z.string().nullable(),
  items: z.number().int().nonnegative(),
  pendientes: z.number().int(),
  en_stock: z.number().int().nonnegative(),
  terminados: z.number().int().nonnegative(),
  ultima_actividad: z.string(),
  actualizado_en: z.string(),
})

/** Lo que devolvió `repuestos_proyectos_listar()` como filas; nulo si alguna no tiene la forma esperada (la infra lo vuelve un error: nunca se descarta en silencio). */
export function filasDeProyectoDesde(datos: unknown): FilaDeProyecto[] | null {
  const leido = z.array(esquemaDeFila).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((p) => ({
    id: p.id,
    numero: p.numero,
    vehiculoId: p.vehiculo_id,
    vehiculoTitulo: p.vehiculo_titulo,
    vehiculoEtiqueta: p.vehiculo_etiqueta,
    vin: p.vin,
    clienteNombre: p.cliente_nombre,
    cerradoEn: p.cerrado_en,
    items: p.items,
    pendientes: Math.max(p.pendientes, 0),
    enStock: p.en_stock,
    terminados: p.terminados,
    ultimaActividad: p.ultima_actividad,
    actualizadoEn: p.actualizado_en,
  }))
}

export type PaginaDeProyectos = {
  filas: FilaDeProyecto[]
  // El `numero` de la última fila de la página, sólo si la base trajo una de más; nulo = no hay más.
  siguiente: number | null
}

/** Corta lo leído (la base trae `tamano + 1`) a `tamano` y dice desde dónde sigue. */
export function armarPaginaDeProyectos(
  leidas: readonly FilaDeProyecto[],
  tamano: number,
): PaginaDeProyectos {
  const filas = leidas.slice(0, tamano)
  const ultima = filas[filas.length - 1]
  return { filas, siguiente: leidas.length > tamano && ultima ? ultima.numero : null }
}

/** El estado derivado de una fila. */
export function estadoDeLaFila(fila: FilaDeProyecto): EstadoDelProyecto {
  return estadoDelProyecto(fila)
}

/** Más de 200 ítems no se cuentan: la base lee como mucho 201 por proyecto (V3). */
export const TOPE_DE_ITEMS_CONTADOS = 200

/** «12» o «200+» (el conteo topado nunca es un total exacto). */
export function textoDeItems(items: number): string {
  return items > TOPE_DE_ITEMS_CONTADOS ? `${String(TOPE_DE_ITEMS_CONTADOS)}+` : String(items)
}
