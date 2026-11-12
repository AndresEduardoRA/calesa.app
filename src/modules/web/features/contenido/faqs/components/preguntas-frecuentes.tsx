'use client'

import { PlusIcon } from 'lucide-react'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { categoriasUsadas, TOPE_DE_FAQS, type Faq } from '../../../../entities/contenido/faqs'
import { useAperturaDeFaq } from '../hooks/use-apertura-de-faq'
import { useEliminarFaqPorUrl } from '../hooks/use-eliminar-faq-por-url'
import { useEscrituraDeFaqs } from '../hooks/use-escritura-de-faqs'
import { ConfirmarEliminarFaqDiferido, PanelDeFaqDiferido } from './diferidos'
import { filasDeFaqs } from './filas-de-faqs'

export type PropsDePreguntasFrecuentes = {
  faqs: readonly Faq[]
  // Había más de las que se muestran (`TOPE_DE_FAQS`).
  hayMas: boolean
}

const PREFIJO = 'faq'
const SIN_ORDEN_POR_EL_TOPE =
  'Hay más preguntas de las que se muestran; ordénalas desde las primeras.'

function EncabezadoDeFaqs({ alNueva }: { alNueva: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="grid gap-0.5">
        <h2
          id="titulo-de-faqs"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Preguntas frecuentes
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Lo que responde la web pública. Una pregunta nueva nace sin publicar.
        </p>
      </div>
      <Button className="h-11 md:h-8" onClick={alNueva}>
        <PlusIcon aria-hidden />
        Nueva pregunta
      </Button>
    </div>
  )
}

// Configuración › Sitio web › Preguntas frecuentes (8.02-1): lo que responde la web pública. La lee la página en el servidor y cada action renueva la ruta
// (`revalidatePath`). Escribir lo exige `web.contenido.gestionar` (la RLS de la tabla); la página ya lo pide.
export function PreguntasFrecuentes({ faqs, hayMas }: PropsDePreguntasFrecuentes) {
  const apertura = useAperturaDeFaq(faqs)
  const montarPanel = useAbiertoAlgunaVez(apertura.abierto)
  const eliminacion = useEliminarFaqPorUrl(faqs)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const escritura = useEscrituraDeFaqs()
  const aEliminar = eliminacion.faq

  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-faqs">
      <EncabezadoDeFaqs alNueva={apertura.abrirNueva} />
      {faqs.length === 0 ? (
        <EstadoVacio compacto titulo="Todavía no hay preguntas frecuentes." />
      ) : (
        <ListaDeCatalogo
          filas={filasDeFaqs(
            faqs,
            {
              alEditar: apertura.abrirEdicion,
              alPublicar: (faq, publicada) => void escritura.publicar(faq, publicada),
              alPedirEliminar: eliminacion.abrir,
            },
            hayMas ? SIN_ORDEN_POR_EL_TOPE : undefined,
          )}
          prefijo={PREFIJO}
          columnaDeUso="Categoría"
          alAbrir={apertura.abrirEdicion}
          alMover={(id, direccion) => void escritura.mover(id, direccion)}
        />
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_FAQS, {
            sustantivo: 'preguntas',
            articulo: 'las',
            orden: 'primeras por orden',
          })}
        />
      ) : null}
      {montarPanel ? (
        <PanelDeFaqDiferido
          key={apertura.apertura}
          abierto={apertura.abierto}
          original={apertura.original}
          categorias={categoriasUsadas(faqs)}
          noDisponible={apertura.noDisponible}
          alGuardar={apertura.alCerrar}
          alCerrar={apertura.alCerrar}
        />
      ) : null}
      {montarEliminar ? (
        <ConfirmarEliminarFaqDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          faq={aEliminar}
          alEliminar={escritura.eliminar}
          focoAlCerrar={() =>
            (aEliminar &&
              document.querySelector<HTMLElement>(
                `[data-mas-acciones="${PREFIJO}-${aEliminar.id}-mas"]`,
              )) ??
            true
          }
        />
      ) : null}
    </section>
  )
}
