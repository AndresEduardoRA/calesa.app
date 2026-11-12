// Lo que el marco de toda pantalla pide por su cuenta: la campana lee sus avisos sin leer al montar, al unirse
// Realtime y al volver la pestaña (`notificaciones/CLAUDE.md`). No es de la pantalla que se prueba: una prueba que
// cuenta pedidos a la base lo deja fuera.
export function esDelMarco(url: string): boolean {
  return url.includes('/rest/v1/notificaciones')
}
