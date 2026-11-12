// La puerta contra CSRF de los POST del portal (8.07-3): el `Origin` del pedido vale sólo si es exactamente el origen (esquema, host y
// puerto) de la dirección dada, el CRM mismo o la dirección pública del sitio. Un `Origin` opaco (`'null'`) o ausente no vale. Pura.
export function mismoOrigenDelPortal(origen: string | null, direccion: string | null): boolean {
  if (!origen || origen === 'null' || !direccion) return false
  try {
    return new URL(direccion).origin === origen
  } catch {
    return false
  }
}
