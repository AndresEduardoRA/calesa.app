'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { PropsDePreguntasFrecuentes } from './preguntas-frecuentes'

// La sección se pide al abrir la pestaña: el hueco (`pantallas/sitio-faqs.ts`) lo importa `pestanas.ts`, y por él el hub de Configuración; con el
// componente directo, la lista, el panel y sus actions viajarían en el hub.
export const PreguntasFrecuentes = diferido<PropsDePreguntasFrecuentes>(
  () => import('./preguntas-frecuentes').then((modulo) => modulo.PreguntasFrecuentes),
  { esqueleto: <EsqueletoFormulario bloques={1} campos={4} />, aviso: 'aqui' },
)

// El panel de alta y edición y la confirmación de eliminar se piden al abrirse (`useAbiertoAlgunaVez()`): la lista no carga el código del formulario
// para mostrarse.
export const PanelDeFaqDiferido = diferido(() =>
  import('./panel-de-faq').then((modulo) => modulo.PanelDeFaq),
)
export const ConfirmarEliminarFaqDiferido = diferido(() =>
  import('./confirmar-eliminar-faq').then((modulo) => modulo.ConfirmarEliminarFaq),
)
