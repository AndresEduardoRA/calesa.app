// La bandeja de subida: lo que la persona eligió y todavía no es una foto del vehículo. Estado y
// reglas puras; preparar, subir y registrar son de los hooks.
import type { FotoPreparada } from '../../composicion.client'
import type { FotoSubida } from '../../entities/foto'
import { mensajeDeRechazo, repartirLugar } from '../../entities/seleccion-de-fotos'

export type EstadoDeItem =
  // Se está leyendo y achicando.
  | 'preparando'
  // Lista para subir: todavía no tocó Storage.
  | 'lista'
  // No se va a subir (no es una foto, pesa demasiado, no se pudo leer).
  | 'rechazada'
  | 'subiendo'
  // No subió o no se pudo guardar: se reintenta sin volver a elegirla.
  | 'fallida'

export type ItemDeBandeja = {
  clave: string
  nombre: string
  estado: EstadoDeItem
  // Por qué se rechazó o por qué falló.
  motivo: string | null
  preparada: FotoPreparada | null
  // La miniatura como dirección local, para verla antes de subir.
  vista: string | null
  // Sus dos objetos ya están en Storage y falta la fila: un reintento no los vuelve a subir.
  subida: FotoSubida | null
}

export type AccionDeBandeja =
  | { tipo: 'elegidas'; items: { clave: string; nombre: string; motivo: string | null }[] }
  | { tipo: 'preparada'; clave: string; preparada: FotoPreparada; vista: string }
  | { tipo: 'rechazada'; clave: string; motivo: string }
  | { tipo: 'subiendo'; claves: readonly string[] }
  | { tipo: 'subida'; clave: string; subida: FotoSubida }
  | { tipo: 'fallida'; claves: readonly string[]; motivo: string }
  // Ya son fotos del vehículo: salen de la bandeja.
  | { tipo: 'guardadas'; hashes: readonly string[] }
  | { tipo: 'quitada'; clave: string }
  | { tipo: 'vaciada' }

type Bandeja = readonly ItemDeBandeja[]

function cambiar(
  bandeja: Bandeja,
  claves: readonly string[],
  cambio: (item: ItemDeBandeja) => ItemDeBandeja,
): ItemDeBandeja[] {
  return bandeja.map((item) => (claves.includes(item.clave) ? cambio(item) : item))
}

export function reducirBandeja(bandeja: Bandeja, accion: AccionDeBandeja): ItemDeBandeja[] {
  switch (accion.tipo) {
    case 'elegidas':
      return [
        ...bandeja,
        ...accion.items.map((item) => ({
          ...item,
          estado: item.motivo ? ('rechazada' as const) : ('preparando' as const),
          preparada: null,
          vista: null,
          subida: null,
        })),
      ]
    case 'preparada':
      return cambiar(bandeja, [accion.clave], (item) => ({
        ...item,
        estado: 'lista',
        preparada: accion.preparada,
        vista: accion.vista,
      }))
    case 'rechazada':
      return cambiar(bandeja, [accion.clave], (item) => ({
        ...item,
        estado: 'rechazada',
        motivo: accion.motivo,
      }))
    case 'subiendo':
      return cambiar(bandeja, accion.claves, (item) => ({
        ...item,
        estado: 'subiendo',
        motivo: null,
      }))
    case 'subida':
      return cambiar(bandeja, [accion.clave], (item) => ({ ...item, subida: accion.subida }))
    case 'fallida':
      return cambiar(bandeja, accion.claves, (item) => ({
        ...item,
        estado: 'fallida',
        motivo: accion.motivo,
      }))
    case 'guardadas':
      return bandeja.filter((item) => !accion.hashes.includes(item.preparada?.hash ?? ''))
    case 'quitada':
      return bandeja.filter((item) => item.clave !== accion.clave)
    case 'vaciada':
      return []
  }
}

// Qué va a pasar con un ítem cuando se confirme.
export type Disposicion = 'pendiente' | 'entra' | 'no_entra'

export type ItemVisto = ItemDeBandeja & {
  disposicion: Disposicion
  // Lo que se le dice a la persona de este ítem, si hay algo que decir.
  aviso: string | null
}

// La bandeja como se muestra: de las que se pudieron leer, entran en orden las que caben y no
// están ya en el vehículo. Se calcula cada vez (las fotos del vehículo cambian mientras tanto).
export function verBandeja(
  bandeja: Bandeja,
  existentes: ReadonlySet<string>,
  lugar: number,
): ItemVisto[] {
  const leidas = bandeja.filter((item) => item.preparada !== null && item.estado !== 'rechazada')
  const reparto = repartirLugar(
    leidas.map((item) => item.preparada?.hash ?? ''),
    existentes,
    lugar,
  )
  const porClave = new Map(leidas.map((item, indice) => [item.clave, reparto[indice]]))
  return bandeja.map((item) => {
    const suerte = porClave.get(item.clave)
    if (item.estado === 'rechazada') {
      return { ...item, disposicion: 'no_entra', aviso: item.motivo }
    }
    if (suerte === undefined) {
      return { ...item, disposicion: 'pendiente', aviso: null }
    }
    if (suerte !== 'aceptada') {
      return { ...item, disposicion: 'no_entra', aviso: mensajeDeRechazo(suerte) }
    }
    return { ...item, disposicion: 'entra', aviso: item.motivo }
  })
}

// Las que se suben al confirmar (o al reintentar): las que entran y no están ya subiendo.
export function paraSubir(vistos: readonly ItemVisto[]): ItemVisto[] {
  return vistos.filter(
    (item) =>
      item.disposicion === 'entra' && (item.estado === 'lista' || item.estado === 'fallida'),
  )
}

export type ConteoDeBandeja = {
  // Se están leyendo: todavía no se sabe si entran.
  preparando: number
  // Listas para el primer intento.
  listas: number
  // Fallaron: se pueden reintentar.
  fallidas: number
  subiendo: number
  // Leídas que no entran por repetidas o por el tope, más las rechazadas.
  noEntran: number
  // Las que se pudieron leer y no están ya en el vehículo: sobre éstas se reparte el lugar.
  candidatas: number
}

export function contarBandeja(vistos: readonly ItemVisto[]): ConteoDeBandeja {
  const cuantos = (condicion: (item: ItemVisto) => boolean) => vistos.filter(condicion).length
  const entran = (estado: EstadoDeItem) =>
    cuantos((item) => item.disposicion === 'entra' && item.estado === estado)
  const sinLugar = cuantos(
    (item) => item.disposicion === 'no_entra' && item.aviso === mensajeDeRechazo('sin_lugar'),
  )
  return {
    preparando: cuantos((item) => item.estado === 'preparando'),
    listas: entran('lista'),
    fallidas: entran('fallida'),
    subiendo: entran('subiendo'),
    noEntran: cuantos((item) => item.disposicion === 'no_entra'),
    candidatas: cuantos((item) => item.disposicion === 'entra') + sinLugar,
  }
}

const cuantas = (cantidad: number) => (cantidad === 1 ? '1 foto' : `${cantidad} fotos`)

// El botón que confirma. Con algo que ya falló es un reintento, y lo dice: sólo salen las que
// faltan. null = no hay nada que subir.
export function etiquetaDeSubir(conteo: ConteoDeBandeja): string | null {
  const pendientes = conteo.listas + conteo.fallidas
  if (pendientes === 0) {
    return null
  }
  if (conteo.fallidas === 0) {
    return `Subir ${cuantas(pendientes)}`
  }
  return pendientes === 1 ? 'Reintentar la que falta' : `Reintentar las ${pendientes} que faltan`
}
