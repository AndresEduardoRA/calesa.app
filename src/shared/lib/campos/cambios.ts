// Lo que cambia una edición de un campo: sólo viaja lo que la persona tocó, y algunos cambios
// pueden tocar datos ya cargados. Cada módulo suma a esto sus propias banderas.
import type { CampoBase, OpcionDeCampo, TipoDeCampo, ValorDefecto } from './tipos'

export type CambiosComunes = Partial<{
  etiqueta: string
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  requerido: boolean
  grupo: string | null
  activo: boolean
  valorDefecto: ValorDefecto | null
}>

export function mismasOpciones(a: readonly OpcionDeCampo[], b: readonly OpcionDeCampo[]): boolean {
  return (
    a.length === b.length &&
    a.every((opcion, i) => {
      const otra = b[i]
      return otra !== undefined && opcion.clave === otra.clave && opcion.etiqueta === otra.etiqueta
    })
  )
}

export function mismoValorDefecto(a: ValorDefecto | null, b: ValorDefecto | null): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((clave, i) => clave === b[i])
  }
  return a === b
}

// Las claves de las opciones que el cambio saca.
export function opcionesQuitadas(
  campo: { opciones: readonly OpcionDeCampo[] },
  cambios: Pick<CambiosComunes, 'opciones'>,
): OpcionDeCampo[] {
  if (!cambios.opciones) {
    return []
  }
  const quedan = new Set(cambios.opciones.map((opcion) => opcion.clave))
  return campo.opciones.filter((opcion) => !quedan.has(opcion.clave))
}

// ¿Hace falta contar lo ya cargado antes de guardar? Cambiar el tipo, volver requerido o sacar una
// opción pueden tocar datos que ya existen. Desactivar no: el dato se conserva y se deshace.
export function necesitaVistaPrevia(
  campo: Pick<CampoBase, 'tipo' | 'requerido'> & { opciones: readonly OpcionDeCampo[] },
  cambios: CambiosComunes,
): boolean {
  if (cambios.tipo !== undefined && cambios.tipo !== campo.tipo) {
    return true
  }
  if (cambios.requerido === true && !campo.requerido) {
    return true
  }
  return opcionesQuitadas(campo, cambios).length > 0
}
