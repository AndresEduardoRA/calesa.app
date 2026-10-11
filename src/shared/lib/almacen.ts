// Direcciones de los objetos de Storage. En la base se guarda la ruta dentro del bucket, nunca la
// URL: así cambiar de proyecto de Supabase no deja filas apuntando al anterior.
import { entornoPublico } from '@/shared/config/entorno'

// Buckets de lectura pública (supabase/migrations/…_storage_notificaciones_cron.sql). Los
// privados (`documentos`, `cotizaciones`, `comprobantes`) se sirven con URL firmada desde infra.
export type BucketPublico = 'marca' | 'avatares' | 'vehiculos' | 'web' | 'repuestos'

export function urlPublica(bucket: BucketPublico, ruta: string): string {
  const base = entornoPublico().NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
  const camino = ruta.split('/').map(encodeURIComponent).join('/')
  return `${base}/storage/v1/object/public/${bucket}/${camino}`
}

export function urlPublicaONull(
  bucket: BucketPublico,
  ruta: string | null | undefined,
): string | null {
  return ruta ? urlPublica(bucket, ruta) : null
}
