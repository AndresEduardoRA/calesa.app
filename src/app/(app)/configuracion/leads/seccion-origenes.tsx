import { OrigenesDeLead, leerOrigenesDeLeadConUso } from '@/modules/leads'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Orígenes del lead»: todos, también los desactivados, con si algún lead los usa. Son a lo
// sumo 100 filas, así que no se pagina.
export async function SeccionOrigenes() {
  return <OrigenesDeLead origenes={datosO(await leerOrigenesDeLeadConUso())} />
}
