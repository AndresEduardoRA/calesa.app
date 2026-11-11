// El enlace a un día del calendario, conservando lo que la persona ya eligió (`?ver=`, `?de=`). `extra` llega de la página ya armado
// (`ver=tarea&de=todos` o vacío): así un enlace del servidor no depende de la URL del navegador.
export function enlaceDeDia(extra: string, dia: string): string {
  const base = extra ? `${extra}&` : ''
  return `/agenda?${base}vista=dia&fecha=${dia}`
}
