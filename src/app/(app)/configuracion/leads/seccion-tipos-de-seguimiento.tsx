import { leerTiposDeSeguimientoConUso } from '@/modules/leads'
import { TiposDeSeguimiento } from '@/modules/leads/pantallas/configuracion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Tipos de seguimiento»: todos, también los desactivados, con su icono y si algún seguimiento los usa. Son a lo sumo los que dice
// la base (100), así que no se pagina.
export async function SeccionTiposDeSeguimiento() {
  return <TiposDeSeguimiento lista={datosO(await leerTiposDeSeguimientoConUso())} />
}
