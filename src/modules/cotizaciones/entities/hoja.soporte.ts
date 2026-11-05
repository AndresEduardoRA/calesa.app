// Lo que entrega `cotizacion_hoja()`, para las pruebas de `hoja.ts`: un ítem de cada tipo, el par porcentaje-monto, un candado por nivel y otro porque se calcula.
export const ID = '00000000-0000-0000-0000-000000000001'
// La hoja abierta que firma la base: para la pantalla es un texto opaco.
export const ABIERTA = `${ID}.1792850400123456.${'a'.repeat(64)}`
export const COLORES = { fondo: '#fff7d6', borde: '#e9d27a', tinta: '#1b2130' }

export const itemsDeLista = () => [
  {
    tipo: 'variante',
    nodo: 'variante',
    etiqueta: 'Variante',
    opciones: [{ clave: 'moto', etiqueta: 'Moto', titulo: 'COTIZACIÓN MOTO' }],
    por_defecto: 'moto',
    editable: true,
  },
  {
    tipo: 'interruptor',
    nodo: 'garantia',
    etiqueta: 'Mostrar garantía',
    efecto: 'muestra',
    editable: false,
    motivo: { codigo: 'nivel', nivel: 'Gerencia' },
  },
  {
    tipo: 'celda',
    nodo: 'fees',
    etiqueta: 'Fees',
    tipo_nodo: 'calculo',
    formato: 'usd',
    ancho: 'mitad',
    tono: 'verde',
    ajustes: false,
    editable: true,
    ayuda: { tabla: 'fees' },
    solo_en: ['moto'],
    condicion: 'cuenta',
    requerido_si: 'cuenta',
    secundario: {
      nodo: 'fees_pct',
      tipo_nodo: 'constante',
      como: 'porcentaje',
      formato: 'pct',
      ajustes: true,
      editable: true,
    },
  },
  {
    tipo: 'celda',
    nodo: 'transferencia',
    etiqueta: 'Transferencia',
    tipo_nodo: 'calculo',
    formato: 'usd',
    ancho: 'completo',
    ajustes: false,
    editable: false,
    motivo: { codigo: 'se_calcula' },
  },
  {
    tipo: 'atajos',
    nodo: 'factor',
    chips: [
      { etiqueta: '2018', valor: 0.328 },
      { etiqueta: '2019', valor: null },
    ],
  },
  { tipo: 'subtotal', nodo: 'cif', etiqueta: 'CIF', formato: 'usd', tono: 'naranja' },
]

export const lista = () => ({
  estado: 'lista',
  origen: { id: ID, nombre: 'Subasta' },
  formula: { id: ID, version: 3 },
  abierta_en: '2026-10-26T14:00:00.123456+00:00',
  abierta: ABIERTA,
  vehiculo_obligatorio: true,
  cabecera: {
    modos: [{ clave: 'unificado', nombre: 'Unificado' }],
    ver_total_bs: true,
    moneda_bs: 'BOB',
  },
  secciones: [
    {
      id: 'hoja',
      titulo: 'Hoja',
      presentacion: 'principal',
      items: itemsDeLista(),
    },
  ],
  tarjeta_total: {
    nodo: 'total',
    etiqueta: 'TOTAL',
    formato: 'usd',
    secundarios: [{ nodo: 'garantia_monto', etiqueta: 'Garantía', formato: 'usd' }],
  },
  tonos: [{ clave: 'verde', claro: COLORES, oscuro: COLORES }],
})
