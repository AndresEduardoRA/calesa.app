// Lo que un requisito de la fase de destino le dice a quien va a mover (6.04): una frase por requisito, su detalle («1 de 2 aprobados») y a qué hueco
// del panel ir a cumplirlo. La base manda las claves de dato (`claves_dato_requisito`): `requisitos.test.ts` las compara con el SQL vigente, así una clave
// nueva sin etiqueta rompe la prueba y no sale en pantalla como un texto técnico.
import type { RequisitoVista } from './vista-previa'

// Los mismos nombres que usa la configuración de la fase (`entities/requisitos/claves.ts`): un término, un nombre. Un área no importa otra, así que se repiten aquí.
export const ETIQUETAS_DE_DATO: Record<string, string> = {
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

// El hueco del panel donde se cumple cada clase de requisito (`clave` de `ORDEN_DE_HUECOS`). Los datos del vehículo y las esperas no tienen atajo.
const HUECO_POR_PREFIJO: Record<string, string> = {
  transporte: 'transporte',
  aduana: 'aduana',
  pagos: 'pagos',
}

const PREFIJO_DE_DOCUMENTO = 'Documento: '
const PREFIJO_DE_ESPERA = 'Espera: '
const PREFIJO_DE_DATO = 'Dato: '

function claveDeDato(r: RequisitoVista): string {
  const clave = r.detalle['clave_dato']
  return typeof clave === 'string' && clave !== ''
    ? clave
    : r.descripcion.startsWith(PREFIJO_DE_DATO)
      ? r.descripcion.slice(PREFIJO_DE_DATO.length)
      : r.descripcion
}

function sinPrefijo(texto: string, prefijo: string): string {
  return texto.startsWith(prefijo) ? texto.slice(prefijo.length) : texto
}

/** El nombre de lo que pide el requisito: «BL», «Esperar a «Embarcado»», «Contenedor». Nunca queda en blanco. */
export function etiquetaDeRequisito(r: RequisitoVista): string {
  if (r.tipo === 'documento') return sinPrefijo(r.descripcion, PREFIJO_DE_DOCUMENTO)
  if (r.tipo === 'espera') return `Esperar a «${sinPrefijo(r.descripcion, PREFIJO_DE_ESPERA)}»`
  const clave = claveDeDato(r)
  return ETIQUETAS_DE_DATO[clave] ?? `${PREFIJO_DE_DATO}${clave}`
}

/** Lo que falta, dicho para la lista «Falta: …»: un documento «BL aprobado»; lo demás, su nombre. */
export function faltaDeRequisito(r: RequisitoVista): string {
  return r.tipo === 'documento' ? `${etiquetaDeRequisito(r)} aprobado` : etiquetaDeRequisito(r)
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

/** La cuenta del requisito: «1 de 2 aprobados», «2 de 3 llegaron, 1 sin llegar», «al menos 50 %». Nula si no hay nada que contar. */
export function detalleDeRequisito(r: RequisitoVista): string | null {
  if (r.tipo === 'documento') {
    const aprobados = numero(r.detalle['aprobados'])
    const min = numero(r.detalle['min'])
    return aprobados === null || min === null ? null : `${aprobados} de ${min} aprobados`
  }
  if (r.tipo === 'espera') {
    const hijos = numero(r.detalle['hijos'])
    const llegaron = numero(r.detalle['llegaron'])
    if (hijos === null || hijos === 0 || llegaron === null) return null
    const sinLlegar = numero(r.detalle['sin_llegar'])
    return `${llegaron} de ${hijos} llegaron${sinLlegar ? `, ${sinLlegar} sin llegar` : ''}`
  }
  const pct = numero(r.detalle['pct'])
  return pct === null ? null : `al menos ${pct} %`
}

/** El hueco del panel donde se cumple el requisito, o `null` si no tiene atajo (datos del vehículo y esperas). */
export function anclaDeRequisito(r: RequisitoVista): string | null {
  if (r.tipo === 'documento') return 'documentos'
  if (r.tipo === 'espera') return null
  return HUECO_POR_PREFIJO[claveDeDato(r).split('.')[0] ?? ''] ?? null
}
