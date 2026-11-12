// El estado derivado de un proyecto de repuestos (8.09-1, C1). Puro: sale de las cuentas que `repuestos_proyectos_listar()` ya trae y no recuenta nada. Cerrar es
// una acción explícita (8.09-2): «Completo» (todo terminó o está en stock) **no** cierra el proyecto.
export type EstadoDelProyecto = 'cerrado' | 'sin_items' | 'en_curso' | 'completo'

export const ETIQUETA_DEL_ESTADO: Record<EstadoDelProyecto, string> = {
  cerrado: 'Cerrado',
  sin_items: 'Sin ítems',
  en_curso: 'En curso',
  completo: 'Completo',
}

type Cuentas = {
  cerradoEn: string | null
  // Las cuentas leen como mucho 201 ítems por proyecto: topadas, no cambian el estado (ningún conteo mostrado es un total exacto).
  items: number
  pendientes: number
}

/** Cerrado gana a todo; si no, sin ítems; si no, con algún pendiente está en curso; si no, completo. */
export function estadoDelProyecto({ cerradoEn, items, pendientes }: Cuentas): EstadoDelProyecto {
  if (cerradoEn !== null) {
    return 'cerrado'
  }
  if (items <= 0) {
    return 'sin_items'
  }
  return pendientes > 0 ? 'en_curso' : 'completo'
}
