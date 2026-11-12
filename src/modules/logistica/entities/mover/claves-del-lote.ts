// Las claves de la URL del lote (6.04-3): `?panel=lote` abre el drawer; `destino` (la fase a la que se mueve), `contenedor` y `booking` (el lote de un grupo) lo nombran. Se escriben juntas al
// abrir y se borran juntas al cerrar, así abrir desde la barra no deja un `contenedor` viejo.
export const PANEL_DEL_LOTE = 'lote'
export const CLAVE_DE_DESTINO_DEL_LOTE = 'destino'
export const CLAVES_DEL_LOTE = [CLAVE_DE_DESTINO_DEL_LOTE, 'contenedor', 'booking'] as const
