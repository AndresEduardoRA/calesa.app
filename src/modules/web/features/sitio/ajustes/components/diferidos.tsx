'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { PropsDeAjustesDelSitio } from './formulario-de-ajustes-del-sitio'

// El formulario de «Ajustes» se pide al abrir la pestaña: el hueco (`pantallas/sitio-ajustes.ts`) lo importa `pestanas.ts`, y por él
// el hub de Configuración; con el componente directo, el formulario y su action viajarían en el hub.
export const FormularioDeAjustesDelSitio = diferido<PropsDeAjustesDelSitio>(
  () =>
    import('./formulario-de-ajustes-del-sitio').then(
      (modulo) => modulo.FormularioDeAjustesDelSitio,
    ),
  { esqueleto: <EsqueletoFormulario bloques={3} campos={4} />, aviso: 'aqui' },
)
