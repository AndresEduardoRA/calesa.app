import type { MetadataRoute } from 'next'
import { getAjustes, iconosDelManifest } from '@/modules/empresa'
import { COLOR_FONDO_CLARO, COLOR_TEMA, DESCRIPCION_APP } from '@/shared/config/app'
import { urlPublica } from '@/shared/lib/almacen'

// Manifest de la PWA, con la identidad de la empresa: su nombre, su color y los íconos generados
// desde su logo. Sin íconos propios, los neutros de public/iconos (design/ICONOS.md). Se pide sin
// sesión: `getAjustes()` lee lo que `anon` puede ver.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const ajustes = await getAjustes()
  return {
    name: ajustes.nombre,
    short_name: ajustes.nombre,
    description: DESCRIPCION_APP,
    lang: 'es',
    // Identifica la app instalada: igual al `start_url`, para que cambiarlo no la reinstale.
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: COLOR_FONDO_CLARO,
    theme_color: ajustes.colorAcento ?? COLOR_TEMA,
    // Rutas que la app ya protege por permiso: el manifest se pide sin sesión y no las filtra.
    shortcuts: [
      { name: 'Nuevo lead', url: '/leads?panel=nuevo-lead' },
      { name: 'Cotizar', url: '/cotizaciones/nuevo' },
    ],
    // La dirección de un ícono propio cambia cada vez que se regenera (su nombre es el hash de
    // su contenido): así el navegador se entera de que hay uno nuevo.
    icons: iconosDelManifest(ajustes.iconos, (ruta) => urlPublica('marca', ruta)),
  }
}
