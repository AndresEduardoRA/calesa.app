// Las claves de la URL del panel del vehículo de la hoja de cotizar. Fuera de un archivo `'use client'`: las lee también el servidor.
// `?panel=vehiculo` lo abre; `?lista=ultima|cierre` es su pestaña, `?buscar=` lo que se busca o se trae y `?cursor=` su página.
export const PANEL_DEL_VEHICULO = 'vehiculo'
export const CLAVE_DE_LISTA = 'lista'
export const CLAVE_DE_BUSQUEDA = 'buscar'
// La pausa al tipear antes de escribir `?buscar=`: la de los listados (`DEMORA_AL_TIPEAR_MS` de `src/shared/ui/filtros/use-filtros.ts`, privada; un
// export ahí cambia `src/shared`) y como en `lista-equipo.tsx`, que también la escribe en su sitio.
export const PAUSA_AL_TIPEAR_MS = 300
