import type { ComponentType } from 'react'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'

type DelFlujo = { flujo: FlujoParaConfigurar }
type DeUnaFase = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// Los huecos de la pantalla de flujos (5.02): cada área de `flujos` llena el suyo en su paso, sin editar la pantalla. Son componentes **de cliente**
// opcionales (D14): lo que cruza de `src/app` a la pantalla sólo es serializable si lo es; vacío = nada dibujado. Los junta `src/app/(app)/configuracion/flujos/huecos.ts`.
export type HuecosDelFlujo = {
  // Sobre el selector, la franja de avisos de «Revisar» (5.12).
  franjaDeRevisar?: ComponentType<DelFlujo>
  // A la derecha del título de la lista («Nueva fase», 5.04).
  accionesDeLaLista?: ComponentType<DelFlujo>
  // El «⋯» de cada fila (5.04).
  accionesDeFila?: ComponentType<DeUnaFase>
  // Bajo el nombre de cada fila: las salidas como chips (5.06).
  salidasDeFila?: ComponentType<DeUnaFase>
  // Dentro del inspector, bajo lo leído de cada bloque.
  bloques?: {
    datos?: ComponentType<DeUnaFase>
    salidas?: ComponentType<DeUnaFase>
    requisitos?: ComponentType<DeUnaFase>
  }
}
