import { connection } from 'next/server'
import { leerLegales } from '@/modules/web'
import { FormularioDeLegales } from '@/modules/web/pantallas/sitio-legales'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Legales» (8.03-2). Se lee la fila de ajustes con su versión; si no se puede, el `error.tsx` con «Reintentar» (nunca un formulario vacío
// que se guardaría encima). La `key` es la versión: lo guardado, aquí o en «Ajustes», vuelve a montar el formulario desde la base.
export async function SeccionLegales() {
  await connection()
  const legales = datosO(await leerLegales())
  return <FormularioDeLegales key={legales.actualizadoEn} legales={legales} />
}
