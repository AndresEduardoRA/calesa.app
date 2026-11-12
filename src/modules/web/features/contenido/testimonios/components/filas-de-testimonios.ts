import type { AccionDeMenu } from '@/shared/ui/lista'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import {
  estadoDeConsentimiento,
  motivoSinPublicar,
  puedePublicar,
  resumenDeConsentimiento,
  type Testimonio,
} from '../../../../entities/contenido/testimonios'

type Quehaceres = {
  alEditar: (id: string) => void
  alPublicar: (testimonio: Testimonio, publicado: boolean) => void
  alRegistrarConsentimiento: (id: string) => void
  alPedirRetirar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

const SIN_ORDEN = 'Los testimonios se muestran en el orden en que se crearon.'

// El «⋯» de un testimonio: Editar · Publicar o Despublicar (apagada con su motivo mientras falte el consentimiento) · Registrar (o Cambiar) consentimiento ·
// Retirar consentimiento (sólo con uno vigente) · ─ · Eliminar.
function accionesDeTestimonio(testimonio: Testimonio, q: Quehaceres): AccionDeMenu[] {
  const estado = estadoDeConsentimiento(testimonio)
  const bloqueada = !testimonio.publicado && !puedePublicar(testimonio)
  const motivo = motivoSinPublicar(testimonio)
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      despuesDeCerrar: true,
      alElegir: () => {
        q.alEditar(testimonio.id)
      },
    },
    {
      tipo: 'accion',
      clave: testimonio.publicado ? 'despublicar' : 'publicar',
      etiqueta: testimonio.publicado ? 'Despublicar' : 'Publicar',
      deshabilitada: bloqueada,
      alElegir: () => {
        q.alPublicar(testimonio, !testimonio.publicado)
      },
    },
    ...(bloqueada && motivo !== null
      ? [{ tipo: 'nota', clave: 'motivo-sin-publicar', texto: motivo } as const]
      : []),
    {
      tipo: 'accion',
      clave: 'consentimiento',
      etiqueta: estado === 'vigente' ? 'Cambiar consentimiento' : 'Registrar consentimiento',
      despuesDeCerrar: true,
      alElegir: () => {
        q.alRegistrarConsentimiento(testimonio.id)
      },
    },
    ...(estado === 'vigente'
      ? [
          {
            tipo: 'accion',
            clave: 'retirar',
            etiqueta: 'Retirar consentimiento',
            despuesDeCerrar: true,
            alElegir: () => {
              q.alPedirRetirar(testimonio.id)
            },
          } as const,
        ]
      : []),
    { tipo: 'separador', clave: 'antes-de-eliminar' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar',
      destructiva: true,
      despuesDeCerrar: true,
      alElegir: () => {
        q.alPedirEliminar(testimonio.id)
      },
    },
  ]
}

// Los testimonios como filas de la lista de catálogo. `activo` es siempre verdadero (D4 del 8.02-1: la lista compartida sólo sabe «Activo» y «Desactivado»);
// el estado se dice con la insignia «Publicado» o «Sin publicar» y el consentimiento, en la columna de uso. Sin orden manual (D3): los botones salen apagados
// con su motivo.
export function filasDeTestimonios(
  testimonios: readonly Testimonio[],
  quehaceres: Quehaceres,
): FilaDeCatalogo[] {
  return testimonios.map((testimonio) => ({
    id: testimonio.id,
    nombre: testimonio.cliente,
    icono: null,
    activo: true,
    insignias: [testimonio.publicado ? 'Publicado' : 'Sin publicar'],
    uso: resumenDeConsentimiento(testimonio),
    acciones: accionesDeTestimonio(testimonio, quehaceres),
    puedeSubir: false,
    puedeBajar: false,
    motivoSinOrden: SIN_ORDEN,
  }))
}
