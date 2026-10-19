import { leerAjustes } from '@/modules/empresa'
import { leerLayoutDeLeads } from '@/modules/leads'
import { EditorDeCamposDeLead } from '@/modules/leads/pantallas/configuracion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Campos»: el layout de los leads, con sus campos desactivados al final. La ciudad y el
// país de la empresa se leen acá para que el editor ofrezca «la de la empresa» diciendo cuál es.
export async function SeccionCampos() {
  const [layout, ajustes] = await Promise.all([leerLayoutDeLeads(), leerAjustes()])
  const empresa = ajustes.ok
    ? { ciudad: ajustes.data.ajustes.ciudad, pais: ajustes.data.ajustes.pais }
    : { ciudad: null, pais: null }
  return <EditorDeCamposDeLead campos={datosO(layout)} puedeGestionar empresa={empresa} />
}
