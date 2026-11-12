// Las interfaces del módulo `web`: lo que la composición le da a quien lee.
import type { Resultado } from '@/shared/lib/errores'

// La dirección pública de la web (`ajustes_web.direccion_publica`), o nula si nadie la configuró.
export type LectorDeDireccionPublica = () => Promise<Resultado<string | null>>
