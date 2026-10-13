// Lo que `vehiculos` necesita saber de un campo del layout de su origen. `entities/` no importa
// otros módulos: declara la forma, y `features/` le pasa el `CampoDeLayout` de `origenes`, que la
// cumple. El enum de tipos sale de la base, que es la misma fuente para los dos.
import type { Enums } from '@/shared/types/database.types'

export type TipoDeCampo = Enums<'tipo_campo'>

export type OpcionDeCampo = { clave: string; etiqueta: string }

export type CampoDeVehiculo = {
  clave: string
  // Sale de la fila: ningún texto fijo nombra un campo del layout.
  etiqueta: string
  tipo: TipoDeCampo
  opciones: readonly OpcionDeCampo[]
  requerido: boolean
  grupo: string | null
  enTarjeta: boolean
  filtrable: boolean
  // Un campo desactivado no se muestra, no se filtra y no se escribe; su dato se conserva.
  activo: boolean
  valorDefecto: string | number | boolean | string[] | null
}

export type FaseDeVehiculo = { id: string; nombre: string; color: string; activa: boolean }

export type CategoriaDeVehiculo = { id: string; nombre: string; activa: boolean }

// Los campos que hoy forman parte de la ficha, en el orden del layout.
export function camposActivos<Campo extends CampoDeVehiculo>(campos: readonly Campo[]): Campo[] {
  return campos.filter((campo) => campo.activo)
}

// Las columnas del listado: los campos marcados «en tarjeta».
export function camposDeTarjeta<Campo extends CampoDeVehiculo>(campos: readonly Campo[]): Campo[] {
  return camposActivos(campos).filter((campo) => campo.enTarjeta)
}
