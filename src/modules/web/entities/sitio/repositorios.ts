// Las interfaces del módulo `web`: lo que la composición le da a quien lee.
import type { ConteoAcotado } from '@/shared/lib/conteo'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import type { AjustesDelSitio, CambiosDeAjustes } from './ajustes'

// La dirección pública de la web (`ajustes_web.direccion_publica`), o nula si nadie la configuró.
export type LectorDeDireccionPublica = () => Promise<Resultado<string | null>>

// Los ajustes del sitio con la versión de la fila, para la pestaña «Ajustes» de Configuración › Sitio web.
export type LectorDeAjustesDelSitio = () => Promise<Resultado<AjustesDelSitio>>

// Por `web_ajustes_guardar`: devuelve la versión nueva; un error de validación trae su campo en `porCampo`.
export type EscritorDeAjustesDelSitio = (pedido: {
  cambios: CambiosDeAjustes
  actualizadoEnEsperado: string
}) => Promise<ResultadoDeAccion<{ actualizadoEn: string }>>

// Por origen (id → conteo acotado), cuántos vehículos publicados dejarían de verse en la web si se apagara; `null` si no se pudo leer.
export type LectorDeVehiculosQueDejanDeVerse = (
  origenes: readonly { id: string; nombre: string }[],
) => Promise<Record<string, ConteoAcotado | null>>
