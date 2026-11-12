import { leerFaqs } from '@/modules/web'
import { PreguntasFrecuentes } from '@/modules/web/pantallas/sitio-faqs'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Preguntas frecuentes» (8.02-1). Si no se pueden leer, el `error.tsx` con «Reintentar» (nunca una lista vacía que se confunda con «no hay»). La
// lista se renueva con el `revalidatePath` de cada action.
export async function SeccionFaqs() {
  const { faqs, hayMas } = datosO(await leerFaqs())
  return <PreguntasFrecuentes faqs={faqs} hayMas={hayMas} />
}
