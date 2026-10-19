import { leerTiposDeLeadConUso } from '@/modules/leads'
import { TiposDeLead } from '@/modules/leads/pantallas/configuracion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Tipos de lead»: todos, también los desactivados, con su clase y si algún lead los usa. Son a lo sumo los que dice
// la base (100), así que no se pagina.
export async function SeccionTipos() {
  return <TiposDeLead lista={datosO(await leerTiposDeLeadConUso())} />
}
