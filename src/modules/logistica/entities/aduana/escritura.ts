import type { DeclaracionLeida } from './declaracion'

// Lo que se tipea al crear o editar una declaración (6.09-2) y la diferencia que viaja a la base. Puro: la base vuelve a revisarlo todo (`_declaracion_datos`); acá se corta antes lo que
// no tiene la forma y se escribe el motivo junto al campo, con las mismas palabras.

export const MAXIMO_DE_NUMERO = 60
export const MAXIMO_DE_NOMBRE = 200
export const MAXIMO_DE_NOTAS = 2000
// `declaracion_vehiculos_poner` admite hasta 200 entre los que se agregan y los que se quitan (D5).
export const MAXIMO_DE_VEHICULOS_POR_VEZ = 200

export type BorradorDeDeclaracion = {
  numero: string
  aceptadaEl: string
  venceTributosEl: string
  despachante: string
  deposito: string
  notas: string
}

// Las claves son las de `p_datos`: una clave ausente no cambia; `null` vacía el dato.
export type CambiosDeDeclaracion = {
  numero?: string
  aceptada_el?: string | null
  vence_tributos_el?: string | null
  despachante?: string | null
  deposito?: string | null
  notas?: string | null
}

export type DeclaracionGuardada = {
  id: string
  actualizadoEn: string
  sinCambios: boolean
}

export function borradorNuevoDeDeclaracion(): BorradorDeDeclaracion {
  return {
    numero: '',
    aceptadaEl: '',
    venceTributosEl: '',
    despachante: '',
    deposito: '',
    notas: '',
  }
}

export function borradorDeDeclaracion(original: DeclaracionLeida): BorradorDeDeclaracion {
  return {
    numero: original.numero,
    aceptadaEl: original.aceptadaEl ?? '',
    venceTributosEl: original.venceTributosEl ?? '',
    despachante: original.despachante ?? '',
    deposito: original.deposito ?? '',
    notas: original.notas ?? '',
  }
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

function fechaValida(valor: string): boolean {
  if (!FECHA.test(valor)) {
    return false
  }
  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio ?? 0, (mes ?? 0) - 1, dia ?? 0))
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === (mes ?? 0) - 1 &&
    fecha.getUTCDate() === dia
  )
}

export type DatosDeDeclaracion = {
  numero: string
  aceptadaEl: string | null
  venceTributosEl: string | null
  despachante: string | null
  deposito: string | null
  notas: string | null
}

const vacioANulo = (valor: string): string | null => {
  const recortado = valor.trim()
  return recortado === '' ? null : recortado
}

function errorDeFecha(valor: string | null): string | null {
  return valor !== null && !fechaValida(valor) ? 'Escribe una fecha válida.' : null
}

function errorDeLargo(valor: string | null, maximo: number, mensaje: string): string | null {
  return valor !== null && valor.length > maximo ? mensaje : null
}

function errorDeNumero(numero: string): string | null {
  if (numero === '') {
    return 'El número es obligatorio.'
  }
  return errorDeLargo(
    numero,
    MAXIMO_DE_NUMERO,
    `El número lleva hasta ${String(MAXIMO_DE_NUMERO)} caracteres.`,
  )
}

/** Valida lo tipeado: el número es obligatorio y de hasta 60; las fechas, `AAAA-MM-DD` reales; el resto, con su tope. Vacío = `null` (vaciar). */
export function validarDeclaracion(
  borrador: BorradorDeDeclaracion,
): { ok: true; datos: DatosDeDeclaracion } | { ok: false; errores: Record<string, string> } {
  const datos: DatosDeDeclaracion = {
    numero: borrador.numero.trim(),
    aceptadaEl: vacioANulo(borrador.aceptadaEl),
    venceTributosEl: vacioANulo(borrador.venceTributosEl),
    despachante: vacioANulo(borrador.despachante),
    deposito: vacioANulo(borrador.deposito),
    notas: vacioANulo(borrador.notas),
  }
  const motivos: [string, string | null][] = [
    ['numero', errorDeNumero(datos.numero)],
    ['aceptadaEl', errorDeFecha(datos.aceptadaEl)],
    ['venceTributosEl', errorDeFecha(datos.venceTributosEl)],
    [
      'despachante',
      errorDeLargo(
        datos.despachante,
        MAXIMO_DE_NOMBRE,
        `El despachante lleva hasta ${String(MAXIMO_DE_NOMBRE)} caracteres.`,
      ),
    ],
    [
      'deposito',
      errorDeLargo(
        datos.deposito,
        MAXIMO_DE_NOMBRE,
        `El depósito lleva hasta ${String(MAXIMO_DE_NOMBRE)} caracteres.`,
      ),
    ],
    [
      'notas',
      errorDeLargo(datos.notas, MAXIMO_DE_NOTAS, 'Las notas llevan hasta 2.000 caracteres.'),
    ],
  ]
  const errores: Record<string, string> = {}
  for (const [campo, motivo] of motivos) {
    if (motivo !== null) {
      errores[campo] = motivo
    }
  }
  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true, datos }
}

const SIN_DECLARACION: DatosDeDeclaracion = {
  numero: '',
  aceptadaEl: null,
  venceTributosEl: null,
  despachante: null,
  deposito: null,
  notas: null,
}

/**
 * Lo que cambió respecto de lo guardado, con las claves de `p_datos`; nulo si no cambió nada. Sin original (alta) se compara contra «nada»: va todo lo que tiene valor.
 */
export function cambiosDeDeclaracion(
  original: DeclaracionLeida | null,
  datos: DatosDeDeclaracion,
): CambiosDeDeclaracion | null {
  const antes: DatosDeDeclaracion = original
    ? {
        numero: original.numero,
        aceptadaEl: original.aceptadaEl,
        venceTributosEl: original.venceTributosEl,
        despachante: original.despachante,
        deposito: original.deposito,
        notas: original.notas,
      }
    : SIN_DECLARACION
  const cambios: CambiosDeDeclaracion = {}
  if (antes.numero !== datos.numero) {
    cambios.numero = datos.numero
  }
  if (antes.aceptadaEl !== datos.aceptadaEl) {
    cambios.aceptada_el = datos.aceptadaEl
  }
  if (antes.venceTributosEl !== datos.venceTributosEl) {
    cambios.vence_tributos_el = datos.venceTributosEl
  }
  if (antes.despachante !== datos.despachante) {
    cambios.despachante = datos.despachante
  }
  if (antes.deposito !== datos.deposito) {
    cambios.deposito = datos.deposito
  }
  if (antes.notas !== datos.notas) {
    cambios.notas = datos.notas
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

// La composición (D5): lo que se agrega y lo que se quita se acumulan en pantalla y salen en un solo envío.
export type CambiosDeVehiculos = { agregar: string[]; quitar: string[] }

/** Por qué no se puede guardar la composición (nada que guardar, o más de 200 entre las dos listas); nulo si se puede. */
export function motivoParaNoGuardarVehiculos(cambios: CambiosDeVehiculos): string | null {
  if (cambios.agregar.length === 0 && cambios.quitar.length === 0) {
    return 'No hay cambios en los vehículos.'
  }
  if (cambios.agregar.length + cambios.quitar.length > MAXIMO_DE_VEHICULOS_POR_VEZ) {
    return `Hasta ${String(MAXIMO_DE_VEHICULOS_POR_VEZ)} vehículos por vez.`
  }
  return null
}
