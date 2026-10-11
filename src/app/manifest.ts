import type { MetadataRoute } from 'next'
import {
  COLOR_FONDO_CLARO,
  COLOR_TEMA,
  DESCRIPCION_APP,
  NOMBRE_POR_DEFECTO,
} from '@/shared/config/app'

// Manifest de la PWA. Íconos neutros de public/iconos (design/ICONOS.md) hasta que la empresa
// cargue su logo y los regenere.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOMBRE_POR_DEFECTO,
    short_name: NOMBRE_POR_DEFECTO,
    description: DESCRIPCION_APP,
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: COLOR_FONDO_CLARO,
    theme_color: COLOR_TEMA,
    icons: [
      { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/iconos/icono-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
