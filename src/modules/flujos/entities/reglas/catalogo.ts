// El catálogo de reglas de un flujo: las 10 claves del check de `flujos_reglas.regla` (`base.sql`) con su nombre, qué permiten y qué enciende cada una.
// Los nombres de pantalla salen de acá; la lista de qué claves existen la repite la base y `catalogo.test.ts` los compara.
import type { AmbitoDeFlujo } from '../flujo'

export const CLAVES_DE_REGLAS = [
  'logistica',
  'alerta_demora',
  'vitrina_web',
  'portal_cliente',
  'transporte',
  'contenedor',
  'aduana',
  'gastos',
  'pagos',
  'esperas',
] as const

export type ClaveDeRegla = (typeof CLAVES_DE_REGLAS)[number]

export type ReglaDelCatalogo = {
  clave: ClaveDeRegla
  nombre: string
  // Qué permite, en una frase.
  explicacion: string
  // Qué aparece al encenderla. No promete lo que se hace en Logística (Fase 6): sólo lo que cambia en la configuración.
  enciende: string
  ambitos: readonly AmbitoDeFlujo[]
}

const AMBOS: readonly AmbitoDeFlujo[] = ['vehiculos', 'repuestos']
const SOLO_VEHICULOS: readonly AmbitoDeFlujo[] = ['vehiculos']

export const REGLAS_DEL_CATALOGO: readonly ReglaDelCatalogo[] = [
  {
    clave: 'logistica',
    nombre: 'Logística',
    explicacion: 'El flujo lleva la logística: sus fases cuentan como etapas del traslado.',
    enciende: 'Las fases pueden marcarse como parte de la logística.',
    ambitos: AMBOS,
  },
  {
    clave: 'alerta_demora',
    nombre: 'Alerta de demora',
    explicacion: 'Avisa cuando una unidad lleva demasiado tiempo en una fase.',
    enciende: 'Las fases pueden fijar cuántos días de demora se toleran.',
    ambitos: AMBOS,
  },
  {
    clave: 'vitrina_web',
    nombre: 'Vitrina web',
    explicacion: 'Los vehículos del flujo pueden mostrarse en la vitrina de la web pública.',
    enciende: 'Las fases pueden marcarse como visibles en la vitrina.',
    ambitos: SOLO_VEHICULOS,
  },
  {
    clave: 'portal_cliente',
    nombre: 'Portal del cliente',
    explicacion: 'El cliente puede seguir su vehículo en el portal.',
    enciende: 'Las fases pueden marcarse como visibles para el cliente.',
    ambitos: SOLO_VEHICULOS,
  },
  {
    clave: 'transporte',
    nombre: 'Transporte',
    explicacion: 'Se carga el transporte de cada unidad: puerto de origen, de destino y naviera.',
    enciende: 'Aparece la oferta de transporte, para elegir qué puertos y navieras se ofrecen.',
    ambitos: AMBOS,
  },
  {
    clave: 'contenedor',
    nombre: 'Contenedor',
    explicacion: 'Se agrupan unidades en un mismo contenedor.',
    enciende: 'Las unidades pueden asignarse a un contenedor.',
    ambitos: AMBOS,
  },
  {
    clave: 'aduana',
    nombre: 'Aduana',
    explicacion: 'Se lleva el trámite de aduana de cada unidad.',
    enciende: 'Las fases pueden marcarse como de aduana.',
    ambitos: SOLO_VEHICULOS,
  },
  {
    clave: 'gastos',
    nombre: 'Gastos',
    explicacion: 'Se registran los gastos de cada unidad.',
    enciende: 'Las unidades pueden registrar gastos.',
    ambitos: AMBOS,
  },
  {
    clave: 'pagos',
    nombre: 'Pagos',
    explicacion: 'Se registran los pagos de cada unidad.',
    enciende: 'Las unidades pueden registrar pagos.',
    ambitos: AMBOS,
  },
  {
    clave: 'esperas',
    nombre: 'Esperas',
    explicacion: 'Una fase puede esperar a que otra unidad llegue a cierta fase.',
    enciende: 'Las fases pueden pedir requisitos de espera.',
    ambitos: AMBOS,
  },
]

export function reglaDelCatalogo(clave: string): ReglaDelCatalogo | undefined {
  return REGLAS_DEL_CATALOGO.find((r) => r.clave === clave)
}

// Las reglas que admite un ámbito, en el orden del catálogo.
export function reglasDelAmbito(ambito: AmbitoDeFlujo): ReglaDelCatalogo[] {
  return REGLAS_DEL_CATALOGO.filter((r) => r.ambitos.includes(ambito))
}

// Lo que el flujo guarda de sus reglas: sin fila, apagada.
export function reglaEncendida(
  reglas: readonly { regla: string; activa: boolean }[],
  clave: string,
): boolean {
  return reglas.some((r) => r.regla === clave && r.activa)
}

// Lo que la pantalla dibuja: las del ámbito y, si el flujo trae encendida una que su ámbito no admite (un dato heredado), también esa: nunca se esconde
// un estado real en silencio. Encenderla otra vez no se ofrece: la base la rechaza.
export function reglasParaMostrar(
  ambito: AmbitoDeFlujo,
  reglas: readonly { regla: string; activa: boolean }[],
): ReglaDelCatalogo[] {
  return REGLAS_DEL_CATALOGO.filter(
    (r) => r.ambitos.includes(ambito) || reglaEncendida(reglas, r.clave),
  )
}
