import { leerAjustesDeLeads } from '@/modules/leads'
import { PlantillaDelEmbudo } from '@/modules/leads/pantallas/configuracion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Plantilla del embudo». Si no se puede leer, el `error.tsx` con «Reintentar» (nunca las de fábrica en su lugar, que se
// guardarían encima). La `key` es la versión: lo guardado, acá o por otra persona, vuelve a montar el editor desde la base.
export async function SeccionEmbudo() {
  const { embudo } = datosO(await leerAjustesDeLeads())
  return <PlantillaDelEmbudo key={embudo.actualizadoEn} embudo={embudo} />
}
