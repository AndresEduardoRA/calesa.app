'use client'

import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { tipoDelCatalogo } from '../../../entities/catalogos'
import { camposDeLaTarjeta, type FilaDeLead } from '../../../entities/listado'
import { MenuDeLead } from '../../marcas/components/menu-de-lead'
import { BadgeDeTipo } from './badge-de-tipo'
import { CeldaDeCampo } from './celda-de-campo'
import { NombreDeFila } from './nombre-de-fila'
import { telefonoDeLista } from './telefono-de-lista'
import { OrigenDeLaTarjeta } from './origen-del-lead'
import { accionesDelMenu, type DatosDeLaLista, origenDelCatalogo, type ParaMarcar } from './tipos'

type Props = DatosDeLaLista & {
  leads: readonly FilaDeLead[]
  alAbrir: (id: string) => void
  // El lead abierto en el drawer, para marcarlo.
  abierto: string | null
  marcar: ParaMarcar
}

// Los leads en el celular, con el patrón de lista (`@/shared/ui/lista`): una tarjeta por lead con lo mismo que la fila de la tabla y
// hasta dos datos «en la tabla» que ese lead tenga. Un clic en cualquier parte de la tarjeta abre el drawer, salvo el del «⋯» y el
// de un enlace; el nombre es el botón que alcanza el teclado. La columna de la lista y cada tarjeta miden lo que la pantalla
// (`minmax(0, 1fr)` y `min-w-0`): sin eso la columna `auto` toma el ancho mínimo de la tarjeta y, con el texto al 200 %, un nombre que
// no se parte ensancha la página y deja el «⋯» fuera de la vista; el «⋯» no se achica (`shrink-0`).
export function TarjetasDeLeads(props: Props) {
  const {
    leads,
    campos,
    origenes,
    tipos,
    codigoDePais,
    etiquetas,
    alAbrir,
    abierto,
    marcar,
    numeroBuscado,
  } = props
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {leads.map((lead) => {
        const origen = origenDelCatalogo(origenes, lead.origenId)
        const datos = camposDeLaTarjeta(campos, lead)
        return (
          <TarjetaDeLista
            key={lead.id}
            abierta={abierto === lead.id}
            alAbrir={() => {
              alAbrir(lead.id)
            }}
            acciones={
              <MenuDeLead
                leadId={lead.id}
                nombre={lead.nombre}
                marcas={lead.marcas}
                etiquetas={marcar.etiquetas}
                alGestionar={marcar.alGestionar}
                puedeEnviar={marcar.eliminables.includes(lead.id)}
                acciones={accionesDelMenu(marcar, lead)}
              />
            }
          >
            {/* Con el texto al 200 % la tarjeta mide menos de 16 rem: el tipo pasa debajo y el nombre se parte en líneas, no se corta. */}
            <div className="flex items-start justify-between gap-2 @max-[16rem]:flex-col">
              <NombreDeFila
                lead={lead}
                etiquetas={etiquetas}
                numeroBuscado={numeroBuscado}
                nombre={(clases) => (
                  <AbrirResumen
                    nombre={lead.nombre}
                    className={`text-(length:--text-base) ${clases} @max-[16rem]:[overflow-wrap:anywhere] @max-[16rem]:whitespace-normal`}
                  >
                    {lead.nombre}
                  </AbrirResumen>
                )}
              />
              <BadgeDeTipo tipo={tipoDelCatalogo(tipos, lead.tipoLeadId)} enLista />
            </div>
            <span className="text-(length:--text-sm) text-(--color-ink) tabular-nums">
              {telefonoDeLista(lead.telefono, codigoDePais)}
            </span>
            <OrigenDeLaTarjeta origen={origen} />
            {datos.length > 0 ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-(--color-line) pt-2">
                {datos.map((campo) => (
                  <div key={campo.clave} className="grid min-w-0">
                    <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
                      {campo.etiqueta}
                    </dt>
                    <dd className="truncate text-(length:--text-sm) text-(--color-ink)">
                      <CeldaDeCampo campo={campo} fila={lead} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </TarjetaDeLista>
        )
      })}
    </ul>
  )
}
