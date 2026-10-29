// El inventario y las cotizaciones de ejemplo que siembra `sembrar.mjs`: diez vehículos inventados (siete de subasta, tres de
// venta en plaza) y cinco parejas lead-vehículo para cotizar. Los totales no están acá: los calcula la fórmula publicada de cada
// origen con lo que una persona tipearía en la hoja (`cotizar`). Puro, sin I/O: lo prueba `sembrar.test.ts`.
import { CANTIDAD_DE_COTIZACIONES, idDeDemo } from './datos-de-demo.mjs'

// Un VIN de ficción: 17 caracteres válidos (sin I, O ni Q) con un prefijo que no es de ningún fabricante.
export const vinDeDemo = (n) => `DEMXV${String(n).padStart(12, '0')}`

// `tipo_vehiculo` es el dato con el que la fórmula de subasta busca el transporte en su tabla; `anio` cae dentro de la tabla de
// depreciación. `cotizar` es lo que se tipea en la hoja: el remate esperado, la grúa y el valor tabla (subasta); el precio
// acordado y el descuento (plaza). Los campos que el layout del origen no tiene se omiten (`atributosQueCaben`).
const SUBASTA = [
  [
    'Toyota',
    'RAV4 XLE',
    2021,
    48200,
    'vagonetas_medianas',
    'Blanco',
    'SUV',
    'Frontal',
    24500,
    'Houston, TX',
    { remate: 9800, grua: 350, valor_tabla: 27500 },
  ],
  [
    'Toyota',
    'Tacoma SR5',
    2022,
    30500,
    'camionetas_medianas',
    'Gris',
    'Pickup',
    'Trasero',
    31000,
    'Dallas, TX',
    { remate: 14500, grua: 400, valor_tabla: 33000 },
  ],
  [
    'Honda',
    'Civic EX',
    2019,
    61000,
    'autos',
    'Azul',
    'Sedán',
    'Lateral',
    17800,
    'Miami, FL',
    { remate: 6200, grua: 300, valor_tabla: 22000 },
  ],
  [
    'Hyundai',
    'Tucson SEL',
    2023,
    18900,
    'vagonetas_medianas',
    'Rojo',
    'SUV',
    'Granizo',
    26000,
    'Atlanta, GA',
    { remate: 11800, grua: 350, valor_tabla: 28500 },
  ],
  [
    'Ford',
    'F-150 XLT',
    2021,
    52700,
    'camionetas_grandes',
    'Negro',
    'Pickup',
    'Frontal',
    36500,
    'Houston, TX',
    { remate: 17500, grua: 450, valor_tabla: 42000 },
  ],
  [
    'Kia',
    'Sportage LX',
    2020,
    57300,
    'vagonetas_medianas',
    'Plata',
    'SUV',
    'Inundación',
    18200,
    'Orlando, FL',
    { remate: 7300, grua: 320, valor_tabla: 24000 },
  ],
  [
    'Chevrolet',
    'Tahoe LT',
    2020,
    64100,
    'vagonetas_grandes',
    'Blanco',
    'SUV',
    'Lateral',
    43000,
    'Los Ángeles, CA',
    { remate: 21000, grua: 500, valor_tabla: 52000 },
  ],
]
const PLAZA = [
  [
    'Toyota',
    'Corolla XEI',
    2018,
    68000,
    16500,
    'Blanco',
    '1.8 L',
    'Único dueño en Bolivia, mantenimiento al día en concesionario.',
    500,
  ],
  [
    'Suzuki',
    'Vitara GLX',
    2020,
    41000,
    19800,
    'Gris',
    '1.6 L',
    'Placas de Santa Cruz, llantas nuevas y revisión técnica vigente.',
    300,
  ],
  [
    'Toyota',
    'Land Cruiser Prado TX',
    2017,
    98000,
    42000,
    'Negro',
    '2.8 L diésel',
    'Siete asientos, full equipo, recién servido.',
    1000,
  ],
]

/**
 * @typedef {{ titulo: string, marca: string, modelo: string, anio: number, kilometraje: number, vin?: string, precio?: number,
 *   precio_negociable?: boolean, acepta_permuta?: boolean, placado?: boolean }} DatosDeVehiculo
 * @typedef {{ n: number, id: string, tipoDeOrigen: 'subasta' | 'manual', datos: DatosDeVehiculo,
 *   atributos: Record<string, string | number | boolean>, cotizar: Record<string, number> }} VehiculoDeDemo
 * @returns {VehiculoDeDemo[]}
 */
export function vehiculosDeDemo() {
  const subasta = SUBASTA.map(
    ([marca, modelo, anio, km, tipo, color, carroceria, dano, valor, ubicacion, cotizar], i) => ({
      tipoDeOrigen: 'subasta',
      datos: {
        titulo: `${marca} ${modelo} ${String(anio)}`,
        marca,
        modelo,
        anio,
        kilometraje: km,
        vin: vinDeDemo(i + 1),
      },
      atributos: {
        color,
        carroceria,
        tipo_vehiculo: tipo,
        dano_principal: dano,
        valor_mercado: valor,
        ubicacion,
        transmision: 'Automática',
        combustible: 'Gasolina',
        enciende_y_anda: i % 3 !== 2,
        tiene_llave: i % 4 !== 3,
      },
      cotizar,
    }),
  )
  const plaza = PLAZA.map(
    ([marca, modelo, anio, km, precio, color, motor, descripcion, descuento], i) => ({
      tipoDeOrigen: 'manual',
      datos: {
        titulo: `${marca} ${modelo} ${String(anio)}`,
        marca,
        modelo,
        anio,
        kilometraje: km,
        precio,
        precio_negociable: i !== 2,
        acepta_permuta: i === 1,
        placado: true,
      },
      atributos: { color, motor, descripcion },
      cotizar: { precio, descuento },
    }),
  )
  return [...subasta, ...plaza].map((v, i) => ({ ...v, n: i + 1, id: idDeDemo('vehiculo', i + 1) }))
}

// A qué origen va cada vehículo: en ronda entre los orígenes activos de su tipo, en el orden de la base. Un vehículo sin origen
// de su tipo no se siembra (se dice).
export function ubicarVehiculos(vehiculos, origenes) {
  const vistos = new Map()
  const ubicados = []
  const sinOrigen = []
  for (const v of vehiculos) {
    const candidatos = origenes.filter((o) => o.activo && o.tipo === v.tipoDeOrigen)
    if (!candidatos.length) {
      sinOrigen.push(v)
      continue
    }
    const k = vistos.get(v.tipoDeOrigen) ?? 0
    vistos.set(v.tipoDeOrigen, k + 1)
    ubicados.push({ ...v, origen: candidatos[k % candidatos.length] })
  }
  return { ubicados, sinOrigen }
}

// Las parejas a cotizar: los primeros leads con vehículos de orígenes alternados (uno de cada origen, después el segundo de
// cada uno…), para que cada fórmula sembrada tenga su cotización.
export function parejasDeCotizacion(leads, ubicados, cantidad = CANTIDAD_DE_COTIZACIONES) {
  const porOrigen = new Map()
  for (const v of ubicados) porOrigen.set(v.origen.id, [...(porOrigen.get(v.origen.id) ?? []), v])
  const grupos = [...porOrigen.values()]
  const alternados = []
  for (let fila = 0; alternados.length < ubicados.length; fila++) {
    for (const g of grupos) if (g[fila]) alternados.push(g[fila])
  }
  const total = Math.min(cantidad, leads.length, alternados.length)
  return Array.from({ length: total }, (_, i) => ({
    id: idDeDemo('cotizacion', i + 1),
    lead: leads[i],
    vehiculo: alternados[i],
  }))
}

// Lo que se tipea en la hoja: sólo los inputs que quien cotiza puede editar en esa hoja (los demás, la base los rechaza con
// `nodo_no_editable`); los que no puede quedan en `omitidos`.
export function entradasDeCotizacion(vehiculo, editables) {
  const inputs = {}
  const omitidos = []
  for (const [nodo, valor] of Object.entries(vehiculo.cotizar)) {
    if (editables.has(nodo)) inputs[nodo] = valor
    else omitidos.push(nodo)
  }
  return { entradas: { inputs, banderas: {}, overrides: {} }, omitidos }
}
