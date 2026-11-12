import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_GUIAS, type GuiaDeLista } from '../../../../entities/contenido/guias'
import { BuscadorDeGuias } from './buscador-de-guias'
import { DrawerNuevaGuia } from './drawer-nueva-guia'
import { ListaDeGuias } from './lista-de-guias'

export type PropsDeLaPestanaDeGuias = {
  filas: readonly GuiaDeLista[]
  hayMas: boolean
  // El texto con que se filtró (`?q=`), o nulo.
  buscar: string | null
  // El instante de la lectura (ISO).
  ahora: string
}

// Configuración › Sitio web › Guías: la lista con su búsqueda por título y «Nueva guía». Escribir se hace en la página de cada guía.
export function PestanaDeGuias({ filas, hayMas, buscar, ahora }: PropsDeLaPestanaDeGuias) {
  return (
    <section aria-labelledby="titulo-de-guias" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="titulo-de-guias"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Guías
        </h2>
        <DrawerNuevaGuia />
      </div>
      <BuscadorDeGuias />
      {filas.length === 0 ? (
        buscar ? (
          <EstadoVacio compacto titulo={`Ninguna guía coincide con «${buscar}».`} />
        ) : (
          <EstadoVacio
            compacto
            titulo="Todavía no hay guías. Crea la primera."
            descripcion="Con «Nueva guía» armas un borrador; se ve en la web cuando lo publicas."
          />
        )
      ) : (
        <ListaDeGuias filas={filas} ahora={ahora} />
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_GUIAS, {
            sustantivo: 'guías',
            articulo: 'las',
            orden: 'más recientes',
          })}
          camino="Escribe más para afinar la búsqueda."
        />
      ) : null}
    </section>
  )
}
