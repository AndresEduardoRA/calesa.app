// Lo que el marco de toda pantalla pide por su cuenta: la campana lee sus avisos sin leer al montar, al unirse
// Realtime y al volver la pestaña (`notificaciones/CLAUDE.md`), y la burbuja del chat y la barra lateral leen los
// mensajes sin leer (`chat_no_leidos`, `chat/CLAUDE.md`). También las marcas de «visto» de una lista (`vistos_de`, una
// por página) y el registro al abrir un resumen (`visto_registrar`, `equipo/CLAUDE.md`). No es de la pantalla que se
// prueba: una prueba que cuenta pedidos a la base lo deja fuera.
export function esDelMarco(url: string): boolean {
  return (
    url.includes('/rest/v1/notificaciones') ||
    url.includes('/rest/v1/rpc/chat_no_leidos') ||
    url.includes('/rest/v1/rpc/vistos_de') ||
    url.includes('/rest/v1/rpc/visto_registrar')
  )
}
