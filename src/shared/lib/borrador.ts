// Borrador de un formulario largo (.claude/rules/ui.md: más de 6 campos). Vive en la pestaña
// (`sessionStorage`), por clave de formulario: sobrevive a recargar y a cambiar de pantalla, no a
// cerrar la pestaña. Se borra al guardar.

export type Borrador = Record<string, string>

type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const PREFIJO = 'borrador:'

export function leerBorrador(almacen: Almacen, clave: string): Borrador | null {
  try {
    const crudo = almacen.getItem(PREFIJO + clave)
    const leido: unknown = crudo ? JSON.parse(crudo) : null
    if (typeof leido !== 'object' || leido === null || Array.isArray(leido)) {
      return null
    }
    const campos = Object.entries(leido).filter(
      (entrada): entrada is [string, string] => typeof entrada[1] === 'string',
    )
    return campos.length > 0 ? Object.fromEntries(campos) : null
  } catch {
    // Un borrador ilegible (o el almacenamiento bloqueado) es lo mismo que no tener borrador.
    return null
  }
}

export function guardarBorrador(almacen: Almacen, clave: string, valores: Borrador): void {
  try {
    almacen.setItem(PREFIJO + clave, JSON.stringify(valores))
  } catch {
    // Sin lugar o en modo privado: el formulario sigue funcionando, sólo que sin red de seguridad.
  }
}

export function borrarBorrador(almacen: Almacen, clave: string): void {
  try {
    almacen.removeItem(PREFIJO + clave)
  } catch {
    // Nada que hacer.
  }
}

// Lo que del borrador difiere de lo guardado: si no difiere nada, no hay borrador que ofrecer.
// Los espacios de los bordes no cuentan: al guardar se recortan.
export function cambiosDelBorrador(borrador: Borrador, guardado: Borrador): Borrador {
  return Object.fromEntries(
    Object.entries(borrador).filter(
      ([campo, valor]) => (guardado[campo] ?? '').trim() !== valor.trim(),
    ),
  )
}
