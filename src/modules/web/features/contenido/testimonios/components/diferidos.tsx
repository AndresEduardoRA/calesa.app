'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { PropsDeTestimonios } from './testimonios'

// La sección se pide al abrir la pestaña: el hueco (`pantallas/sitio-testimonios.ts`) lo importa `pestanas.ts`, y por él el hub de Configuración; con el
// componente directo, la lista, los paneles y sus actions viajarían en el hub.
export const Testimonios = diferido<PropsDeTestimonios>(
  () => import('./testimonios').then((modulo) => modulo.Testimonios),
  { esqueleto: <EsqueletoFormulario bloques={1} campos={4} />, aviso: 'aqui' },
)

// Los paneles y los diálogos se piden al abrirse (`useAbiertoAlgunaVez()`): la lista no carga el código del formulario para mostrarse.
export const PanelDeTestimonioDiferido = diferido(() =>
  import('./panel-de-testimonio').then((modulo) => modulo.PanelDeTestimonio),
)
export const PanelDeConsentimientoDiferido = diferido(() =>
  import('./panel-de-consentimiento').then((modulo) => modulo.PanelDeConsentimiento),
)
export const ConfirmarRetirarConsentimientoDiferido = diferido(() =>
  import('./confirmar-retirar-consentimiento').then(
    (modulo) => modulo.ConfirmarRetirarConsentimiento,
  ),
)
export const ConfirmarEliminarTestimonioDiferido = diferido(() =>
  import('./confirmar-eliminar-testimonio').then((modulo) => modulo.ConfirmarEliminarTestimonio),
)
