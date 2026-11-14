'use client'

import { PlusIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRef } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import type { LeadDeTelefonos } from '../../../entities/telefonos'
import { useTelefonosExtra } from '../hooks/use-telefonos-extra'
import { ModalDeExtraDiferido } from './diferidos'
import { FilaDeExtra } from './fila-de-extra'

type Props = {
  lead: LeadDeTelefonos
  // Cartera y `leads.telefonos_extra.editar`: agregar, rotular y quitar. Sin esto sólo se leen.
  puedeAdministrar: boolean
  // El modal «Agregar teléfono» y su URL: `usePanelDeLead().extra` en la ficha, `useAgregarExtraEnPanel()` en el panel y el resumen.
  apertura: { abierto: boolean; abrir: () => void; cerrar: () => void }
  // `leads.configurar`: con el máximo pasado o alcanzado, el enlace a donde se cambia.
  puedeConfigurar: boolean
  // Algo cambió en la lista: quien muestra el lead de afuera lo vuelve a leer.
  alCambiar?: () => void
}

// Los teléfonos extra de un lead (las filas bajo el principal), con «Agregar teléfono» al final cuando se pueden administrar: abre un
// modal con su URL, que sin permiso o con el máximo de la empresa no se abre ni escribiéndola a mano. Una petición por acción; la lista
// de la respuesta reemplaza a la de la pantalla. Con el máximo alcanzado dice por qué no se agrega; si el máximo se bajó después y el
// lead tiene de más, dice cuántos quitar (los suyos quedan).
export function TelefonosExtra({
  lead,
  puedeAdministrar,
  apertura,
  puedeConfigurar,
  alCambiar,
}: Props) {
  const telefonos = useTelefonosExtra(lead, alCambiar)
  const boton = useRef<HTMLButtonElement>(null)
  const abierto = puedeAdministrar && !telefonos.topeAlcanzado && apertura.abierto
  const montar = useAbiertoAlgunaVez(abierto)
  const aperturaDelModal = useApertura(abierto)
  const acciones = puedeAdministrar
    ? { guardar: telefonos.guardar, quitar: telefonos.quitar, enCurso: telefonos.enCurso }
    : null
  return (
    <>
      {telefonos.extras.map((extra) => (
        <FilaDeExtra
          key={extra.id}
          extra={extra}
          codigoDePais={lead.telefonoCc}
          llamable={lead.enCartera}
          acciones={acciones}
        />
      ))}
      {puedeAdministrar ? (
        <li>
          <div className="flex flex-wrap items-center gap-x-2">
            <Button
              ref={boton}
              variant="outline"
              size="sm"
              className="min-h-11 md:min-h-8"
              disabled={telefonos.topeAlcanzado}
              aria-describedby={telefonos.topeAlcanzado ? 'agregar-telefono-motivo' : undefined}
              onClick={apertura.abrir}
            >
              <PlusIcon aria-hidden />
              Agregar teléfono
            </Button>
            {telefonos.topeAlcanzado ? (
              <span
                id="agregar-telefono-motivo"
                className="text-(length:--text-xs) text-(--color-ink-soft)"
              >
                {telefonos.motivoDelTope}
                {puedeConfigurar ? (
                  <>
                    {' '}
                    <Link
                      href={`${RUTAS.configuracionDeLeads}?seccion=telefonos` as Route}
                      className="font-medium underline underline-offset-2"
                    >
                      Cambiar el máximo
                    </Link>
                  </>
                ) : null}
              </span>
            ) : null}
          </div>
          {montar ? (
            <ModalDeExtraDiferido
              key={aperturaDelModal}
              abierto={abierto}
              alCerrar={apertura.cerrar}
              lead={lead}
              extras={telefonos.extras}
              guardar={telefonos.guardar}
              boton={boton}
            />
          ) : null}
        </li>
      ) : null}
    </>
  )
}
