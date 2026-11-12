'use client'

import { PlusIcon } from 'lucide-react'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { TOPE_DE_TESTIMONIOS, type Testimonio } from '../../../../entities/contenido/testimonios'
import { useAperturaDeTestimonio } from '../hooks/use-apertura-de-testimonio'
import { useConsentimientoPorUrl } from '../hooks/use-consentimiento-por-url'
import { useEliminarTestimonioPorUrl } from '../hooks/use-eliminar-testimonio-por-url'
import { useEscrituraDeTestimonios } from '../hooks/use-escritura-de-testimonios'
import { useRetirarConsentimientoPorUrl } from '../hooks/use-retirar-consentimiento-por-url'
import {
  ConfirmarEliminarTestimonioDiferido,
  ConfirmarRetirarConsentimientoDiferido,
  PanelDeConsentimientoDiferido,
  PanelDeTestimonioDiferido,
} from './diferidos'
import { filasDeTestimonios } from './filas-de-testimonios'

export type PropsDeTestimonios = {
  testimonios: readonly Testimonio[]
  // Había más de los que se muestran (`TOPE_DE_TESTIMONIOS`).
  hayMas: boolean
}

const PREFIJO = 'testimonio'

function EncabezadoDeTestimonios({ alNuevo }: { alNuevo: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="grid gap-0.5">
        <h2
          id="titulo-de-testimonios"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Testimonios
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Lo que dicen tus clientes en la web pública. Un testimonio nuevo nace sin publicar y sin
          consentimiento.
        </p>
      </div>
      <Button className="h-11 md:h-8" onClick={alNuevo}>
        <PlusIcon aria-hidden />
        Nuevo testimonio
      </Button>
    </div>
  )
}

// El «⋯» de la fila devuelve el foco ahí al cerrar un diálogo.
const focoEnElMas = (testimonio: Testimonio | null) => () =>
  (testimonio &&
    document.querySelector<HTMLElement>(`[data-mas-acciones="${PREFIJO}-${testimonio.id}-mas"]`)) ??
  true

// Configuración › Sitio web › Testimonios (8.02-2): lo que dicen los clientes, con su consentimiento. La lee la página en el servidor y cada action renueva
// la ruta (`revalidatePath`). Escribir lo exige `web.contenido.gestionar` (la RLS y las RPC); la página ya lo pide.
export function Testimonios({ testimonios, hayMas }: PropsDeTestimonios) {
  const apertura = useAperturaDeTestimonio(testimonios)
  const consentimiento = useConsentimientoPorUrl(testimonios)
  const retiro = useRetirarConsentimientoPorUrl(testimonios)
  const eliminacion = useEliminarTestimonioPorUrl(testimonios)
  const montarPanel = useAbiertoAlgunaVez(apertura.abierto)
  const montarConsentimiento = useAbiertoAlgunaVez(consentimiento.abierto)
  const montarRetiro = useAbiertoAlgunaVez(retiro.abierto)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const escritura = useEscrituraDeTestimonios()

  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-testimonios">
      <EncabezadoDeTestimonios alNuevo={apertura.abrirNueva} />
      {testimonios.length === 0 ? (
        <EstadoVacio compacto titulo="Todavía no hay testimonios." />
      ) : (
        <ListaDeCatalogo
          filas={filasDeTestimonios(testimonios, {
            alEditar: apertura.abrirEdicion,
            alPublicar: (testimonio, publicado) => void escritura.publicar(testimonio, publicado),
            alRegistrarConsentimiento: consentimiento.abrir,
            alPedirRetirar: retiro.abrir,
            alPedirEliminar: eliminacion.abrir,
          })}
          prefijo={PREFIJO}
          columnaDeUso="Consentimiento"
          alAbrir={apertura.abrirEdicion}
          alMover={() => undefined}
        />
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_TESTIMONIOS, {
            sustantivo: 'testimonios',
            articulo: 'los',
            orden: 'primeros por orden',
          })}
        />
      ) : null}
      {montarPanel ? (
        <PanelDeTestimonioDiferido
          key={apertura.apertura}
          abierto={apertura.abierto}
          original={apertura.original}
          noDisponible={apertura.noDisponible}
          alGuardar={apertura.alCerrar}
          alCerrar={apertura.alCerrar}
        />
      ) : null}
      {montarConsentimiento && consentimiento.testimonio ? (
        <PanelDeConsentimientoDiferido
          key={consentimiento.apertura}
          abierto={consentimiento.abierto}
          testimonio={consentimiento.testimonio}
          alGuardar={consentimiento.cerrar}
          alCerrar={consentimiento.cerrar}
        />
      ) : null}
      {montarRetiro ? (
        <ConfirmarRetirarConsentimientoDiferido
          abierto={retiro.abierto}
          alCerrar={retiro.cerrar}
          testimonio={retiro.testimonio}
          alRetirar={escritura.retirar}
          focoAlCerrar={focoEnElMas(retiro.testimonio)}
        />
      ) : null}
      {montarEliminar ? (
        <ConfirmarEliminarTestimonioDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          testimonio={eliminacion.testimonio}
          alEliminar={escritura.eliminar}
          focoAlCerrar={focoEnElMas(eliminacion.testimonio)}
        />
      ) : null}
    </section>
  )
}
