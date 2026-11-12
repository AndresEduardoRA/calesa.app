import type { ReactNode } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import type { VentanaDelPeriodo } from '../../../entities/periodo'
import type { WidgetDelCatalogo } from '../../../entities/widgets'

// Lo que recibe el cuerpo de cada widget: el widget, el período y los permisos de quien mira.
// El título y la `<section>` los dibuja el marco: un archivo de widget sólo dibuja su cuerpo.
export type ContextoDeWidget = {
  widget: WidgetDelCatalogo
  ventana: VentanaDelPeriodo
  permisos: Permisos
}

// Un Server Component (async) que lee con `lectura.ts` y dibuja el cuerpo del widget.
export type CuerpoDeWidget = (contexto: ContextoDeWidget) => ReactNode | Promise<ReactNode>
