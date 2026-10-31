// Las claves de la URL del panel del cliente de la hoja de cotizar. Fuera de un archivo `'use client'`: las lee también el servidor.
// `?panel=cliente` lo abre; `?clase=prospecto|cliente` es su pestaña (sin ella, «Todos»), `?buscar=` lo que se busca y `?cursor=` su página.
export const PANEL_DEL_CLIENTE = 'cliente'
export const CLAVE_DE_CLASE = 'clase'
export const CLAVE_DE_BUSQUEDA = 'buscar'
// La pausa al tipear antes de escribir `?buscar=`: la de los listados (`DEMORA_AL_TIPEAR_MS` de `src/shared/ui/filtros/use-filtros.ts`, privada; un
// export ahí cambia `src/shared`) y como en el panel del vehículo, que también la escribe en su sitio.
export const PAUSA_AL_TIPEAR_MS = 300
