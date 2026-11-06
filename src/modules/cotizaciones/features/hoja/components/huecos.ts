import type { ComponentType, ReactNode } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import type { CeldaDeHoja } from '../../../entities/hoja'
import type { DeDondeCalcula } from '../../../entities/pedido-de-recalculo'
import type { AccionesDeHoja } from '../hooks/use-hoja'

// Los huecos de la hoja (4.15-6): lo que un área llena sin que el núcleo la importe. Son tipos y nada más: el núcleo (`features/hoja`) no importa ningún área, y las páginas
// de `src/app` unen los dos (`pantallas/<área>-<pantalla>.ts`). Un hueco vacío es un objeto sin componentes: la página no dibuja nada para él.

// Lo que le llega al `Proveedor` de un área: envuelve a la pantalla de la hoja (`<PantallaDeCotizar>` o `<PantallaDeUnaGuardada>`) y le da el `Ajuste` a `ContextoDelAjuste`.
// `cotizacionId` es nulo en la hoja nueva.
export type PropsDelProveedor = {
  children: ReactNode
  origenId: string
  cotizacionId: string | null
  permisos: Permisos
}

// Lo que recibe el panel de ajuste de una celda (el ⚙): la celda, cómo cerrarlo y lo que la hoja le da para «Aplicar también a esta cotización».
export type PropsDelAjuste = {
  celda: CeldaDeHoja
  cerrar: () => void
  hoja: {
    // De dónde calcula la hoja y la versión de la fórmula que dibuja.
    de: DeDondeCalcula
    formula: { id: string; version: number }
    // Cambiar la celda como si se tipeara, y volver a leer la hoja.
    alConfirmar: AccionesDeHoja['alConfirmar']
    alRecargar: () => void
  }
}

// El ajuste que la hoja monta cuando la URL nombra una celda con ⚙ (`?ajuste=celda&nodo=<id>`); nulo sin proveedor.
export type AjusteEnLaHoja = {
  Ajuste: ComponentType<PropsDelAjuste>
  nodo: string | null
  cerrar: () => void
  hoja: PropsDelAjuste['hoja']
}

export type HuecosDeLaHoja = {
  // El proveedor que enciende el ⚙ (4.20): sin él, ninguna celda lo dibuja.
  Proveedor?: ComponentType<PropsDelProveedor>
  // El enlace de «Falta publicar la fórmula» (de quien puede configurar): el del área `formula`.
  EnlaceSinPublicar?: ComponentType<{ origenId: string }>
}
