// Subir el archivo normalizado de la importación total desde el navegador (9.06-4) al bucket privado `importaciones`, en la carpeta de quien
// importa (la policy «importaciones: propio» deja subir, leer y borrar sólo ahí). Sube el archivo ya convertido, nunca el de la persona (D22).
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'

const BUCKET = 'importaciones'

export const MENSAJE_SIN_CONEXION_AL_SUBIR = 'Sin conexión: el archivo no se subió.'
export const MENSAJE_DE_SUBIDA_FALLIDA = 'No se pudo subir el archivo. Prueba de nuevo.'

// Subir dos veces la misma ruta no es un error: el objeto ya está (D36: el id nace con cada archivo armado, así que es el mismo texto).
export async function subirArchivoDeImportacion(
  ruta: string,
  texto: string,
): Promise<Resultado<null>> {
  const { error } = await createClient()
    .storage.from(BUCKET)
    .upload(ruta, new Blob([texto], { type: 'text/csv' }), {
      contentType: 'text/csv',
      upsert: false,
    })
  if (error && !/exists|duplicate/i.test(error.message)) {
    // Sin el error crudo: trae la ruta y, en ella, el id de la persona.
    console.error('datos: no se pudo subir el archivo')
    const sinRed = !window.navigator.onLine
    return fallo('inesperado', sinRed ? MENSAJE_SIN_CONEXION_AL_SUBIR : MENSAJE_DE_SUBIDA_FALLIDA)
  }
  return ok(null)
}

// Deshace la subida propia de hace un instante, cuando la base rechazó crear la importación (D37). De intento único: si falla, el objeto queda
// (el mismo hueco de D26, para 9.13).
export async function quitarArchivoDeImportacion(ruta: string): Promise<void> {
  try {
    await createClient().storage.from(BUCKET).remove([ruta])
  } catch {
    // Nada que decirle a la persona: la importación no existe.
  }
}
