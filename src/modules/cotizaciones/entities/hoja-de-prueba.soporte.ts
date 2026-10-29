// Una hoja de cotizar de prueba para el binding, las entradas y la pantalla (4.13-2): un ítem de cada tipo, un par con el monto calculado, una celda con su interruptor
// y otra cuya bandera no llegó, y las respuestas del recálculo a mano. Sólo para las pruebas (el sufijo `.soporte.` lo deja fuera del mapa).
import { hojaDesde, type HojaLista } from './hoja'
import type { RespuestaDeRecalculo } from './recalculo'

const ID = '00000000-0000-0000-0000-000000000001'
const COLORES = { fondo: '#fff7d6', borde: '#e9d27a', tinta: '#1b2130' }

const base = { ajustes: false, ancho: 'completo', formato: 'usd', editable: true }
const celda = (nodo: string, tipo_nodo: string, mas: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  etiqueta: nodo.toUpperCase(),
  tipo_nodo,
  ...base,
  ...mas,
})

const itemsDeLaHoja = () => [...itemsDeControles(), ...itemsDeCeldas()]

const itemsDeControles = () => [
  {
    tipo: 'variante',
    nodo: 'variante',
    etiqueta: 'Variante',
    opciones: [
      { clave: 'moto', etiqueta: 'Moto', titulo: 'MOTO' },
      { clave: 'gasolina', etiqueta: 'Auto gasolina', titulo: 'AUTO' },
    ],
    por_defecto: 'gasolina',
    editable: true,
  },
  {
    tipo: 'interruptor',
    nodo: 'cuenta',
    etiqueta: 'Cuenta especial',
    efecto: 'habilita',
    editable: true,
  },
  {
    tipo: 'interruptor',
    nodo: 'mostrar_garantia',
    etiqueta: 'Mostrar garantía',
    efecto: 'muestra',
    editable: true,
  },
]

const itemsDeCeldas = () => [
  celda('remate', 'input'),
  celda('fees', 'calculo', {
    ancho: 'mitad',
    tono: 'verde',
    secundario: {
      nodo: 'fees_pct',
      tipo_nodo: 'constante',
      como: 'porcentaje',
      formato: 'pct',
      ajustes: false,
      editable: true,
    },
  }),
  celda('transferencia', 'calculo', {
    editable: false,
    motivo: { codigo: 'se_calcula' },
    secundario: {
      nodo: 'transf_pct',
      tipo_nodo: 'constante',
      como: 'porcentaje',
      formato: 'pct',
      ajustes: false,
      editable: true,
    },
  }),
  celda('seguro', 'calculo', {
    secundario: {
      nodo: 'seguro_pct',
      tipo_nodo: 'input',
      como: 'porcentaje',
      formato: 'pct',
      ajustes: false,
      editable: false,
      motivo: { codigo: 'nivel', nivel: 'Gerencia' },
    },
  }),
  celda('cuenta_esp', 'input', { condicion: 'cuenta' }),
  celda('garantia', 'calculo', { condicion: 'mostrar_garantia' }),
  celda('sin_bandera', 'input'),
  celda('solo_moto', 'constante', { solo_en: ['moto'] }),
  celda('iva_c', 'constante', { formato: 'pct' }),
  celda('tc', 'tipo_cambio', { formato: 'raw' }),
  {
    tipo: 'atajos',
    nodo: 'factor',
    chips: [
      { etiqueta: '2018', valor: 0.328 },
      { etiqueta: '2019', valor: 0.328 },
      { etiqueta: '2020', valor: null },
    ],
  },
  celda('factor', 'tabla', { formato: 'raw' }),
  // Atajos sobre los dos lados de un par cuyo monto se calcula: los del porcentaje se pulsan, los del monto no (4.13-3c).
  { tipo: 'atajos', nodo: 'transf_pct', chips: [{ etiqueta: '3 %', valor: 0.03 }] },
  { tipo: 'atajos', nodo: 'transferencia', chips: [{ etiqueta: 'Cero', valor: 0 }] },
  celda('del_vehiculo', 'campo_vehiculo', {
    editable: false,
    motivo: { codigo: 'del_vehiculo' },
  }),
  celda('de_nivel', 'input', {
    editable: false,
    motivo: { codigo: 'nivel', nivel: 'Costos' },
  }),
  { tipo: 'subtotal', nodo: 'cif', etiqueta: 'CIF', formato: 'usd', tono: 'verde' },
]

export const crudaDeLaHoja = () => ({
  estado: 'lista',
  origen: { id: ID, nombre: 'Subasta' },
  formula: { id: ID, version: 3 },
  abierta_en: '2026-10-26T14:00:00+00:00',
  abierta: `${ID}.1792850400000000.${'a'.repeat(64)}`,
  vehiculo_obligatorio: false,
  cabecera: { modos: [], ver_total_bs: false, moneda_bs: 'BOB' },
  secciones: [
    {
      id: 'hoja',
      titulo: 'Hoja',
      presentacion: 'principal',
      items: itemsDeLaHoja(),
    },
  ],
  tarjeta_total: {
    nodo: 'total',
    etiqueta: 'TOTAL',
    formato: 'usd',
    secundarios: [{ nodo: 'garantia', etiqueta: 'Garantía', formato: 'usd' }],
  },
  tonos: [{ clave: 'verde', claro: COLORES, oscuro: COLORES }],
})

export const hojaDePrueba = (): HojaLista => {
  const hoja = hojaDesde(crudaDeLaHoja())
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}

type Mapas = {
  valores?: Record<string, number | string | null>
  estados?: Record<string, 'activo' | 'fuera_de_variante' | 'condicion_apagada'>
  fuentes?: Record<string, 'default' | 'sugerido' | 'override' | 'input'>
  usd?: number | null
  faltantes?: RespuestaDeRecalculo['faltantes']
  hayFaltantesOcultos?: boolean
}

export const respuestaDePrueba = (m: Mapas = {}): RespuestaDeRecalculo => ({
  valores: new Map(Object.entries(m.valores ?? {})),
  estados: new Map(Object.entries(m.estados ?? {})),
  fuentes: new Map(Object.entries(m.fuentes ?? {})),
  totales: { usd: m.usd === undefined ? 100 : m.usd, bs: null, sumaUsd: null },
  faltantes: m.faltantes ?? [],
  descartados: [],
  hayFaltantesOcultos: m.hayFaltantesOcultos ?? false,
})
