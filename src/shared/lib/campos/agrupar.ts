// Los campos activos agrupados como los muestra un formulario o una ficha.
type Agrupable = { grupo: string | null; activo: boolean }

export type GrupoDeCampos<Campo extends Agrupable> = {
  // null = los que no tienen grupo.
  nombre: string | null
  campos: Campo[]
}

// Los grupos en el orden en que aparece su primer campo, y «sin grupo» al final. Los desactivados
// no se muestran.
export function agruparCampos<Campo extends Agrupable>(
  campos: readonly Campo[],
): GrupoDeCampos<Campo>[] {
  const grupos = new Map<string | null, Campo[]>()
  for (const campo of campos) {
    if (!campo.activo) {
      continue
    }
    grupos.set(campo.grupo, [...(grupos.get(campo.grupo) ?? []), campo])
  }
  const conNombre = [...grupos].filter(([nombre]) => nombre !== null)
  const sinGrupo = grupos.get(null)
  return [
    ...conNombre.map(([nombre, delGrupo]) => ({ nombre, campos: delGrupo })),
    ...(sinGrupo ? [{ nombre: null, campos: sinGrupo }] : []),
  ]
}

export function nombresDeGrupo<Campo extends Agrupable>(campos: readonly Campo[]): string[] {
  return agruparCampos(campos).flatMap((grupo) => (grupo.nombre === null ? [] : [grupo.nombre]))
}
