import type { ComponentProps, ReactNode } from 'react'
import { HUECOS_DE_COMENTARIOS_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/comentarios-cotizacion'
import { HUECOS_DE_COMPROBANTES_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/comprobantes-cotizacion'
import { HUECOS_DE_FINAL_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/final-cotizacion'
import { HUECOS_DE_PAPELERA_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/papelera-cotizacion'

// Lo que las áreas `final`, `comprobantes`, `comentarios` y `papelera` llenan en `/cotizaciones/[id]` (4.15-6b). Los tipos salen de las constantes: `src/app` no importa `features/`.
type Hueco = typeof HUECOS_DE_FINAL_EN_LA_GUARDADA
type Lugar = 'Acciones' | 'Debajo'
type Props = ComponentProps<NonNullable<Hueco[Lugar]>>

// El orden de las acciones de la cabecera: la destructiva, «Enviar a la papelera» (con «Deshacer», 4.24), va al final.
export const HUECOS_DE_LA_GUARDADA: readonly Hueco[] = [
  HUECOS_DE_FINAL_EN_LA_GUARDADA,
  HUECOS_DE_COMPROBANTES_EN_LA_GUARDADA,
  HUECOS_DE_COMENTARIOS_EN_LA_GUARDADA,
  HUECOS_DE_PAPELERA_EN_LA_GUARDADA,
]

// Lo que cada hueco trae para ese lugar, en el orden de la lista; `undefined` si ninguno trae nada, para que la página no gane ni un nodo.
export function dibujarHuecos(
  lista: readonly Hueco[],
  lugar: Lugar,
  props: Props,
): ReactNode | undefined {
  const dibujados = lista.flatMap((hueco, i) => {
    const Componente = hueco[lugar]
    return Componente === undefined ? [] : [<Componente key={i} {...props} />]
  })
  return dibujados.length === 0 ? undefined : dibujados
}
