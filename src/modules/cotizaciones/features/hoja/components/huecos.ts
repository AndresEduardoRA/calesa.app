import type { ComponentType } from 'react'

// Los huecos de la hoja (4.15-6): lo que un área llena sin que el núcleo la importe. Son tipos y nada más: el núcleo (`features/hoja`) no importa ningún área, y las páginas
// de `src/app` unen los dos (`pantallas/<área>-<pantalla>.ts`). Un hueco vacío es un objeto sin componentes: la página no dibuja nada para él.
export type HuecosDeLaHoja = {
  // El enlace de «Falta publicar la fórmula» (de quien puede configurar): el del área `formula`.
  EnlaceSinPublicar?: ComponentType<{ origenId: string }>
}
