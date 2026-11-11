// El enlace a `/agenda` con un panel de evento o de tarea abierto, o sin panel (para cerrarlo después de crear), conservando la vista, la fecha y lo que ya eligió
// la persona (`extra`: `ver=tarea&de=todos` o vacío; llega de la página ya armado, igual que en `enlaceDeDia`). Abre por el servidor: la página lee el detalle por id.
export type BaseDeEnlace = { vista: string; fecha: string; extra: string }

function baseDe({ vista, fecha, extra }: BaseDeEnlace): string {
  return `/agenda?${extra ? `${extra}&` : ''}vista=${vista}&fecha=${fecha}`
}

export function enlaceDePanel(base: BaseDeEnlace, clave: 'evento' | 'tarea', id: string): string {
  return `${baseDe(base)}&${clave}=${id}`
}

export function enlaceSinPanel(base: BaseDeEnlace): string {
  return baseDe(base)
}
