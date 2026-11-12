import { leerTestimonios } from '@/modules/web'
import { Testimonios } from '@/modules/web/pantallas/sitio-testimonios'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Testimonios» (8.02-2). Si no se pueden leer, el `error.tsx` con «Reintentar» (nunca una lista vacía que se confunda con «no hay»). La lista se
// renueva con el `revalidatePath` de cada action.
export async function SeccionTestimonios() {
  const { testimonios, hayMas } = datosO(await leerTestimonios())
  return <Testimonios testimonios={testimonios} hayMas={hayMas} />
}
