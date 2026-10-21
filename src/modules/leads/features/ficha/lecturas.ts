import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import {
  leerCartera,
  leerEtiquetas,
  leerCatalogosDeLead,
  leerFicha,
  leerLayoutDeLeads,
} from '../../composicion'
import type { PersonaDeCartera } from '../../entities/cartera'
import { tipoDelCatalogo, type TipoDeLeadEnCatalogo } from '../../entities/catalogos'
import type { CampoDeLead } from '../../entities/campo'
import type { Etiqueta } from '../../entities/etiqueta'
import { origenDeLaFicha, type LeadDeFicha } from '../../entities/ficha'

export type DatosDeLaFicha = {
  ficha: LeadDeFicha
  // Los campos activos: «Datos» no dibuja los desactivados. El layout completo y los catálogos de lead los lee el panel de edición al
  // abrirse (`leerCatalogosDeEdicion()`): con hasta 100 orígenes y 100 tipos viajaban con el documento de cada visita.
  campos: CampoDeLead[]
  // El origen y el tipo de ESTE lead, también apagados: el lead que conserva uno se sigue nombrando.
  origen: { nombre: string; activo: boolean; icono: string | null } | null
  tipo: TipoDeLeadEnCatalogo | null
  // Las de quien mira: nombran las del lead y se ofrecen en el selector (hasta 50).
  etiquetas: Etiqueta[]
  // Quién lo tiene: nombres y tipo de acceso (sin correo ni teléfono).
  cartera: PersonaDeCartera[]
}

// Todo lo que la ficha necesita, en cinco lecturas paralelas: el lead con sus teléfonos, quién es
// el dueño y las marcas de quien mira (`lead_ficha()`), el layout, los orígenes y los tipos (un solo pedido: `leads_catalogos()`),
// las etiquetas propias y quién lo tiene (`lead_cartera()`). `null` = no existe o no lo ve, sea por inexistente,
// papelera, limbo o sin acceso: la pantalla no distingue.
export async function leerFichaDeLead(id: string): Promise<Resultado<DatosDeLaFicha | null>> {
  const [ficha, layout, catalogos, etiquetas, cartera] = await Promise.all([
    leerFicha(id),
    leerLayoutDeLeads(),
    leerCatalogosDeLead(),
    leerEtiquetas(),
    leerCartera(id),
  ])
  if (!ficha.ok) {
    return ficha
  }
  if (!layout.ok) {
    return layout
  }
  if (!catalogos.ok) {
    return catalogos
  }
  if (!etiquetas.ok) {
    return etiquetas
  }
  if (!cartera.ok) {
    return cartera
  }
  if (ficha.data === null) {
    return ok(null)
  }
  return ok({
    ficha: ficha.data,
    campos: layout.data.filter((campo) => campo.activo),
    origen: origenDeLaFicha(catalogos.data.origenes, ficha.data.origenId),
    tipo: tipoDelCatalogo(catalogos.data.tipos, ficha.data.tipoLeadId),
    etiquetas: etiquetas.data,
    cartera: cartera.data,
  })
}
