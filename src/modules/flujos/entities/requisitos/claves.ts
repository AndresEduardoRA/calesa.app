// Las claves de dato que un requisito de fase puede pedir, por ámbito del flujo, con su nombre para la persona. La base manda: la lista es la de
// `claves_dato_requisito(p_ambito)` y `claves.test.ts` la compara con el SQL vigente, así una clave nueva en la base sin
// etiqueta rompe la prueba y no sale en pantalla como un texto técnico.
import type { AmbitoDeFlujo } from '../flujo'

export const CLAVES_POR_AMBITO: Record<AmbitoDeFlujo, readonly string[]> = {
  vehiculos: [
    'vehiculo.vin',
    'vehiculo.lead',
    'vehiculo.cotizacion_final',
    'transporte.naviera',
    'transporte.contenedor',
    'transporte.booking',
    'transporte.zarpe',
    'transporte.eta',
    'transporte.arribo',
    'aduana.declaracion',
    'aduana.canal',
    'aduana.tributos_pagados',
    'pagos.umbral_pct',
    'pagos.confirmado',
  ],
  repuestos: [
    'repuesto.tracking',
    'repuesto.precio',
    'proyecto.pago_cliente',
    'transporte.contenedor',
    'transporte.arribo',
  ],
}

export const ETIQUETAS_DE_CLAVE: Record<string, string> = {
  'vehiculo.vin': 'VIN del vehículo',
  'vehiculo.lead': 'Cliente del vehículo',
  'vehiculo.cotizacion_final': 'Cotización final',
  'transporte.naviera': 'Naviera',
  'transporte.contenedor': 'Contenedor',
  'transporte.booking': 'Booking',
  'transporte.zarpe': 'Fecha de zarpe',
  'transporte.eta': 'Fecha estimada de llegada (ETA)',
  'transporte.arribo': 'Fecha de arribo',
  'aduana.declaracion': 'Declaración de aduana',
  'aduana.canal': 'Canal de aduana',
  'aduana.tributos_pagados': 'Tributos pagados',
  'pagos.umbral_pct': 'Pagos confirmados',
  'pagos.confirmado': 'Pago confirmado',
  'repuesto.tracking': 'Tracking del repuesto',
  'repuesto.precio': 'Precio del repuesto',
  'proyecto.pago_cliente': 'Pago del cliente del proyecto',
}

// La única clave que lleva configuración (`config.pct`, de 1 a 100).
export const CLAVE_CON_PORCENTAJE = 'pagos.umbral_pct'

// La regla del flujo que apaga una clave (`flujos_reglas.regla`): sin ella encendida nadie puede cumplir el requisito. Las claves del vehículo, del repuesto
// y del proyecto no dependen de ninguna.
const REGLA_POR_PREFIJO: Record<string, string> = {
  transporte: 'transporte',
  aduana: 'aduana',
  pagos: 'pagos',
}

export const ETIQUETA_DE_REGLA: Record<string, string> = {
  transporte: 'Transporte',
  aduana: 'Aduana',
  pagos: 'Pagos',
  esperas: 'Esperas',
}

export function reglaDeLaClave(clave: string): string | null {
  return REGLA_POR_PREFIJO[clave.split('.')[0] ?? ''] ?? null
}

// El nombre de una clave para la persona; la que la tabla no conoce se dice tal cual, nunca se oculta.
export function etiquetaDeClave(clave: string): string {
  return ETIQUETAS_DE_CLAVE[clave] ?? `Dato: ${clave}`
}
