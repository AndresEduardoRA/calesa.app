import type { ComponentType, ReactNode } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'
import type { CeldaDeHoja } from '../../../entities/hoja'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'
import type { DeDondeCalcula } from '../../../entities/pedido-de-recalculo'
import type { EstadoDeRecalculo } from '../../../entities/recalculo'
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

// Lo que recibe el modal «Vista previa» de la tarjeta (4.18-2): si está abierto, cómo cerrarlo, la versión de la fórmula que dibuja la hoja (la tarjeta se lee por ella), los
// números que dibuja (los de la hoja nueva o, en una guardada, los guardados: P5), la moneda del total en Bs y, fuera de la tarjeta, lo que el modal dice: si lo de hoy no es lo
// guardado o hay cambios sin guardar. `estado` es el del recálculo de la hoja nueva: «Total desactualizado.» sólo se dice con él.
export type PropsDeLaVistaPrevia = {
  abierta: boolean
  cerrar: () => void
  formulaId: string
  calculo: CalculoDeLaTarjeta
  // Nulo en una guardada: lo guardado no se desactualiza.
  estado: EstadoDeRecalculo | null
  monedaBs: string | null
  avisos: { difiere: boolean; cambiosSinGuardar: boolean }
}

export type HuecosDeLaHoja = {
  // El proveedor que enciende el ⚙ (4.20): sin él, ninguna celda lo dibuja.
  Proveedor?: ComponentType<PropsDelProveedor>
  // El enlace de «Falta publicar la fórmula» (de quien puede configurar): el del área `formula`.
  EnlaceSinPublicar?: ComponentType<{ origenId: string }>
}

// Lo que recibe un componente que un área llena en la guardada (`/cotizaciones/[id]`): la cotización, si quien mira la puede guardar (lo dice la base) y sus permisos, para
// que el área decida qué dibuja. Cruza al navegador como props: sólo datos planos.
export type PropsDeUnHuecoDeLaGuardada = {
  cotizacion: CotizacionDeLaHoja
  puedeGuardar: boolean
  permisos: Permisos
}

// Los huecos de una cotización guardada (4.15-6b): `Acciones` va en la cabecera, después de «Revisiones»; `Debajo`, bajo la hoja; `Insignias` (4.27-4), en la cabecera
// después de la clase y de la vigencia. Los llenan `final`, `comprobantes`, `comentarios` y `papelera`; la página de `src/app` los ordena (`[id]/huecos-de-la-guardada.tsx`).
export type HuecosDeLaGuardada = {
  Acciones?: ComponentType<PropsDeUnHuecoDeLaGuardada>
  Insignias?: ComponentType<PropsDeUnHuecoDeLaGuardada>
  Debajo?: ComponentType<PropsDeUnHuecoDeLaGuardada>
}

// El hueco del listado `/cotizaciones` (4.15-6b): `Junto` va antes de «Nueva cotización» en la barra de acciones (el enlace a la papelera, 4.24). Lo llena `papelera`.
export type HuecosDelListado = {
  Junto?: ComponentType<{ permisos: Permisos }>
}
