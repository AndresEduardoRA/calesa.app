import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import type { Faq } from '../../../../entities/contenido/faqs'

type Quehaceres = {
  alEditar: (id: string) => void
  alPublicar: (faq: Faq, publicada: boolean) => void
  alPedirEliminar: (id: string) => void
}

// El «⋯» de una pregunta: Editar · Publicar o Despublicar · ─ · Eliminar.
function accionesDeFaq(
  faq: Faq,
  { alEditar, alPublicar, alPedirEliminar }: Quehaceres,
): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      alElegir: () => {
        alEditar(faq.id)
      },
    },
    {
      tipo: 'accion',
      clave: faq.publicada ? 'despublicar' : 'publicar',
      etiqueta: faq.publicada ? 'Despublicar' : 'Publicar',
      alElegir: () => {
        alPublicar(faq, !faq.publicada)
      },
    },
    { tipo: 'separador', clave: 'antes-de-eliminar' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: () => {
        alPedirEliminar(faq.id)
      },
    },
  ]
}

// Las preguntas como filas de la lista de catálogo, ya en su orden. `activo` es siempre verdadero: la lista compartida sólo sabe «Activo» y «Desactivado»
// y una pregunta sin publicar no es una pregunta apagada; el estado se dice con la insignia «Publicada» o «Sin publicar» (D4).
export function filasDeFaqs(
  faqs: readonly Faq[],
  quehaceres: Quehaceres,
  motivoSinOrden: string | undefined,
): FilaDeCatalogo[] {
  return faqs.map((faq, posicion) => ({
    id: faq.id,
    nombre: faq.pregunta,
    icono: null,
    activo: true,
    insignias: [faq.publicada ? 'Publicada' : 'Sin publicar'],
    uso: faq.categoria ?? 'Sin categoría',
    acciones: accionesDeFaq(faq, quehaceres),
    puedeSubir: motivoSinOrden === undefined && posicion > 0,
    puedeBajar: motivoSinOrden === undefined && posicion < faqs.length - 1,
    ...(motivoSinOrden === undefined ? {} : { motivoSinOrden }),
  }))
}
