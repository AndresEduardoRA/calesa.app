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

// --- Borrador de un formulario controlado -------------------------------------------------------
// Un formulario cuyo estado vive en React (interruptores, listas, números) no se puede leer por
// `FormData`: su borrador es lo que cambió de ese estado, como JSON.

export type BorradorDeEstado = Record<string, unknown>

const PREFIJO_DE_ESTADO = 'borrador-estado:'

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Las claves de `valores` que difieren de lo guardado. Un texto que sólo difiere en los espacios
// de los bordes no cuenta: al guardar se recortan.
export function cambiosDeEstado(
  valores: Readonly<Record<string, unknown>>,
  guardado: Readonly<Record<string, unknown>>,
): BorradorDeEstado {
  const recortar = (valor: unknown) => (typeof valor === 'string' ? valor.trim() : valor)
  return Object.fromEntries(
    Object.entries(valores).filter(
      ([clave, valor]) => !igual(recortar(valor), recortar(guardado[clave])),
    ),
  )
}

export function leerBorradorDeEstado(almacen: Almacen, clave: string): BorradorDeEstado | null {
  try {
    const crudo = almacen.getItem(PREFIJO_DE_ESTADO + clave)
    const leido: unknown = crudo ? JSON.parse(crudo) : null
    if (typeof leido !== 'object' || leido === null || Array.isArray(leido)) {
      return null
    }
    return Object.keys(leido).length > 0 ? (leido as BorradorDeEstado) : null
  } catch {
    return null
  }
}

// Sin cambios no queda borrador.
export function guardarBorradorDeEstado(
  almacen: Almacen,
  clave: string,
  cambios: BorradorDeEstado,
): void {
  try {
    if (Object.keys(cambios).length === 0) {
      almacen.removeItem(PREFIJO_DE_ESTADO + clave)
    } else {
      almacen.setItem(PREFIJO_DE_ESTADO + clave, JSON.stringify(cambios))
    }
  } catch {
    // Sin lugar o en modo privado: el formulario sigue funcionando, sin red de seguridad.
  }
}
