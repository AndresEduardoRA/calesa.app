// Una tarjeta de prueba para las pruebas de los componentes (4.18-2): la lectura cruda de `cotizacion_tarjeta()` con tres grupos y un cálculo que la llena. Sólo para las
// pruebas (el sufijo `.soporte.` lo deja fuera del mapa).

const tono = (clave: string, fondo: string) => ({
  clave,
  claro: { fondo, borde: '#999999', tinta: '#111111' },
  oscuro: { fondo: '#222222', borde: '#666666', tinta: '#eeeeee' },
})

export const crudaDeLaTarjeta = (mas: Record<string, unknown> = {}) => ({
  estado: 'lista',
  plantilla: { version: 1 },
  logo: true,
  nota: 'Precios sujetos a cambio.',
  columnas: { leyenda: true, tipo_cambio: true, plazo: true },
  total: { nodo: 'total', etiqueta: 'TOTAL DÓLARES', leyenda: null },
  secundarios: [{ nodo: 'garantia', etiqueta: 'GARANTÍA PARA LA PARTICIPACIÓN' }],
  grupos: [
    {
      id: 'compra',
      etiqueta: 'Compra',
      plazo: '48 horas',
      tono: 'verde',
      bucket: 'compra',
      filas: [{ nodo: 'remate', etiqueta: 'Remate', leyenda: 'Precio de subasta' }],
    },
    {
      id: 'logistica',
      etiqueta: 'Logística',
      plazo: '15 días',
      tono: 'amarillo',
      bucket: 'logistica',
      filas: [{ nodo: 'flete', etiqueta: 'Flete', leyenda: null }],
    },
    {
      id: 'aduana',
      etiqueta: 'Aduana',
      plazo: null,
      tono: 'naranja',
      bucket: 'compra',
      filas: [{ nodo: 'ga', etiqueta: 'GA', leyenda: null }],
    },
  ],
  tipos_de_cambio: {
    buckets: { compra: 'Dólar oficial', logistica: 'Dólar paralelo' },
    modos: { bcb: { compra: 'Dólar BCB', logistica: 'Dólar BCB' } },
  },
  variante: { nodo: 'variante', opciones: [{ clave: 'gasolina', titulo: 'Gasolina' }] },
  tonos: [tono('verde', '#e8f5e9'), tono('amarillo', '#fff7d6'), tono('naranja', '#ffe8d6')],
  moneda_bs: 'BOB',
  ...mas,
})

export { calculoDePrueba } from '../calculo-de-la-tarjeta.soporte'
