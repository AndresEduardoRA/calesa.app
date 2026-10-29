import { type z } from 'zod'
import type { Tono } from '@/shared/ui/xcell'
import {
  type ANCHOS,
  type EFECTOS_DE_INTERRUPTOR,
  type PRESENTACIONES,
  type SECUNDARIOS,
} from './diseno'
import {
  type esquemaCelda,
  esquemaHoja,
  type esquemaItem,
  type esquemaLista,
  type MotivoDeCandado,
  type TipoDeNodoDeHoja,
} from './hoja-esquema'
import type { Formato } from './nodos'

// La hoja que la pantalla recibe de `cotizacion_hoja()` (paso 4.13): la respuesta leída con `hoja-esquema.ts` y en camelCase.
export type { MotivoDeCandado, TipoDeNodoDeHoja } from './hoja-esquema'

// ---------------------------------------------------------------------------------------------------------------------------------
// Lo que la pantalla recibe (camelCase)
// ---------------------------------------------------------------------------------------------------------------------------------
export type EdicionDeHoja = { editable: boolean; motivo: MotivoDeCandado | null }

export type SecundarioDeCelda = EdicionDeHoja & {
  nodo: string
  tipoDeNodo: TipoDeNodoDeHoja
  como: (typeof SECUNDARIOS)[number]
  formato: Formato
  ajustes: boolean
}

export type AyudaDeCelda = { tabla: string } | { texto: string }

export type CeldaDeHoja = EdicionDeHoja & {
  tipo: 'celda'
  nodo: string
  etiqueta: string
  tipoDeNodo: TipoDeNodoDeHoja
  formato: Formato
  ancho: (typeof ANCHOS)[number]
  tono: string | null
  // El ⚙: lo da el permiso del origen (constante) o el de los tipos de cambio; no depende de `editable`.
  ajustes: boolean
  ayuda: AyudaDeCelda | null
  soloEn: string[] | null
  condicion: string | null
  requeridoSi: string | null
  secundario: SecundarioDeCelda | null
}
export type ChipDeAtajos = { etiqueta: string; valor: number | null }
export type AtajosDeHoja = { tipo: 'atajos'; nodo: string; chips: ChipDeAtajos[] }
export type VarianteDeHoja = EdicionDeHoja & {
  tipo: 'variante'
  nodo: string
  etiqueta: string
  opciones: { clave: string; etiqueta: string; titulo: string }[]
  porDefecto: string | null
}
export type InterruptorDeHoja = EdicionDeHoja & {
  tipo: 'interruptor'
  nodo: string
  etiqueta: string
  efecto: (typeof EFECTOS_DE_INTERRUPTOR)[number]
  soloEn: string[] | null
}
export type SubtotalDeHoja = {
  tipo: 'subtotal'
  nodo: string
  etiqueta: string
  formato: Formato
  tono: string | null
}
export type ItemDeHoja =
  CeldaDeHoja | AtajosDeHoja | VarianteDeHoja | InterruptorDeHoja | SubtotalDeHoja

export type SeccionDeHoja = {
  id: string
  titulo: string | null
  presentacion: (typeof PRESENTACIONES)[number]
  items: ItemDeHoja[]
}
export type NodoDeTarjeta = { nodo: string; etiqueta: string; formato: Formato }

export type HojaLista = {
  estado: 'lista'
  origen: { id: string; nombre: string }
  // La versión de la fórmula y la hora de la base con que se abrió (la hora es un texto ISO), y la hoja abierta que firma la base con las dos: es lo que se manda como
  // `p_abierta` a `cotizacion_evaluar` (el recálculo calcula con esta versión y estas tarifas, 4-28) y a `cotizacion_crear` (D2, 4-27). Opaca: la pantalla no la lee.
  formula: { id: string; version: number }
  abiertaEn: string
  abierta: string
  vehiculoObligatorio: boolean
  // Los modos de tipo de cambio se identifican por su clave: sus buckets no viajan (nombran tipos de cambio que un nivel puede esconder).
  cabecera: {
    modos: { clave: string; nombre: string }[]
    verTotalBs: boolean
    monedaBs: string | null
  }
  secciones: SeccionDeHoja[]
  tarjetaTotal: NodoDeTarjeta & { secundarios: NodoDeTarjeta[] }
  tonos: Tono[]
}
export type HojaSinPublicar = {
  estado: 'sin_publicar'
  origen: { id: string; nombre: string }
  puedeConfigurar: boolean
}
export type HojaParaCotizar = HojaLista | HojaSinPublicar

type Crudo<T extends z.ZodType> = z.infer<T>

const edicionDe = (e: { editable: boolean; motivo?: MotivoDeCandado }): EdicionDeHoja => ({
  editable: e.editable,
  motivo: e.motivo ?? null,
})

function celdaDe(c: Crudo<typeof esquemaCelda>): CeldaDeHoja {
  return {
    ...edicionDe(c),
    tipo: 'celda',
    nodo: c.nodo,
    etiqueta: c.etiqueta,
    tipoDeNodo: c.tipo_nodo,
    formato: c.formato,
    ancho: c.ancho,
    tono: c.tono ?? null,
    ajustes: c.ajustes,
    ayuda: c.ayuda ?? null,
    soloEn: c.solo_en ?? null,
    condicion: c.condicion ?? null,
    requeridoSi: c.requerido_si ?? null,
    secundario: c.secundario
      ? {
          ...edicionDe(c.secundario),
          nodo: c.secundario.nodo,
          tipoDeNodo: c.secundario.tipo_nodo,
          como: c.secundario.como,
          formato: c.secundario.formato,
          ajustes: c.secundario.ajustes,
        }
      : null,
  }
}

function itemDe(i: Crudo<typeof esquemaItem>): ItemDeHoja {
  switch (i.tipo) {
    case 'celda':
      return celdaDe(i)
    case 'atajos':
      return { tipo: 'atajos', nodo: i.nodo, chips: i.chips }
    case 'variante':
      return {
        ...edicionDe(i),
        tipo: 'variante',
        nodo: i.nodo,
        etiqueta: i.etiqueta,
        opciones: i.opciones,
        porDefecto: i.por_defecto ?? null,
      }
    case 'interruptor':
      return {
        ...edicionDe(i),
        tipo: 'interruptor',
        nodo: i.nodo,
        etiqueta: i.etiqueta,
        efecto: i.efecto,
        soloEn: i.solo_en ?? null,
      }
    case 'subtotal':
      return {
        tipo: 'subtotal',
        nodo: i.nodo,
        etiqueta: i.etiqueta,
        formato: i.formato,
        tono: i.tono ?? null,
      }
    default: {
      const _: never = i
      return _
    }
  }
}

function listaDe(h: Crudo<typeof esquemaLista>): HojaLista {
  return {
    estado: 'lista',
    origen: h.origen,
    formula: h.formula,
    abiertaEn: h.abierta_en,
    abierta: h.abierta,
    vehiculoObligatorio: h.vehiculo_obligatorio,
    cabecera: {
      modos: h.cabecera.modos,
      verTotalBs: h.cabecera.ver_total_bs,
      monedaBs: h.cabecera.moneda_bs,
    },
    secciones: h.secciones.map((s) => ({
      id: s.id,
      titulo: s.titulo ?? null,
      presentacion: s.presentacion,
      items: s.items.map(itemDe),
    })),
    tarjetaTotal: h.tarjeta_total,
    tonos: h.tonos,
  }
}

// La respuesta de `cotizacion_hoja()` ya en la forma que usa la pantalla, o nulo si no es lo que la base promete.
export function hojaDesde(crudo: unknown): HojaParaCotizar | null {
  const leida = esquemaHoja.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const h = leida.data
  if (h.estado === 'sin_publicar') {
    return { estado: 'sin_publicar', origen: h.origen, puedeConfigurar: h.puede_configurar }
  }
  return listaDe(h)
}
