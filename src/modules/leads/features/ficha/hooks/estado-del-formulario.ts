import type { ErrorApp } from '@/shared/lib/errores'
import type { ValoresDeFormulario } from '@/shared/lib/campos'

// El estado de editar la ficha. Puro: los cambios se prueban sin React.
export type Estado = {
  valores: ValoresDeFormulario
  errores: Record<string, string>
  // «Rosa cambió este lead hace 3 min.»
  conflicto: string | null
  // Un rechazo que no es de ningún campo.
  aviso: string | null
  // Un guardado que no llegó al servidor y espera a que vuelva la conexión.
  pendiente: true | null
}

export const limpio = (valores: ValoresDeFormulario): Estado => ({
  valores,
  errores: {},
  conflicto: null,
  aviso: null,
  pendiente: null,
})

// Lo escrito en un campo: su motivo ya no vale y el aviso general tampoco.
export function conCambio(
  antes: Estado,
  clave: string,
  valor: ValoresDeFormulario[string],
): Estado {
  const { [clave]: _resuelto, ...errores } = antes.errores
  return { ...antes, valores: { ...antes.valores, [clave]: valor }, errores, aviso: null }
}

// Lo que no pasó la validación del formulario: los motivos van junto a sus campos.
export function conMotivos(antes: Estado, porCampo: Record<string, string>): Estado {
  return { ...antes, errores: porCampo, aviso: null, conflicto: null }
}

// El guardado no llegó al servidor: lo escrito queda y sale solo al volver la conexión.
export function enEspera(antes: Estado): Estado {
  return { ...antes, pendiente: true, aviso: null }
}

// Lo que queda en pantalla después de un guardado que el servidor rechazó. Lo que ya se dice junto
// a un campo o en el aviso de conflicto no se repite arriba.
export function trasRechazo(
  antes: Estado,
  error: ErrorApp,
  porCampo?: Record<string, string>,
): Estado {
  const esConflicto = error.codigo === 'conflicto'
  return {
    ...antes,
    pendiente: null,
    errores: porCampo ?? {},
    conflicto: esConflicto ? error.mensaje : null,
    aviso: esConflicto || porCampo ? null : error.mensaje,
  }
}
