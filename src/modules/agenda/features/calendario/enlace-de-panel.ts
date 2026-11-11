// El enlace a `/agenda` con el panel de un evento, una tarea o un recordatorio abierto, conservando la vista, la fecha y lo que ya eligió
// la persona (`extra`: `ver=tarea&de=todos` o vacío; llega de la página ya armado, igual que en `enlaceDeDia`). Abre por el servidor: la página lee el detalle por id.
export type BaseDeEnlace = { vista: string; fecha: string; extra: string }

function baseDe({ vista, fecha, extra }: BaseDeEnlace): string {
  return `/agenda?${extra ? `${extra}&` : ''}vista=${vista}&fecha=${fecha}`
}

export function enlaceDePanel(
  base: BaseDeEnlace,
  clave: 'evento' | 'tarea' | 'recordatorio',
  id: string,
): string {
  return `${baseDe(base)}&${clave}=${id}`
}
