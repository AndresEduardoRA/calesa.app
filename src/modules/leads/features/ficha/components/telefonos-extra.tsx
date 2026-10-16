'use client'

import { PlusIcon } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import type { LeadDeFicha } from '../../../entities/ficha'
import { MAXIMO_DE_TELEFONOS_EXTRA } from '../../../entities/telefonos'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { useTelefonosExtra } from '../hooks/use-telefonos-extra'
import { ModalDeExtraDiferido } from './diferidos'
import { FilaDeExtra } from './fila-de-extra'

type Props = {
  ficha: LeadDeFicha
  // Cartera y `leads.editar`: agregar, rotular y quitar. Sin esto sólo se leen.
  puedeAdministrar: boolean
}

// Los teléfonos extra de la ficha (las filas de «Teléfonos» bajo el principal), con «Agregar
// teléfono» al final cuando se pueden administrar: abre un modal con su URL
// (`?panel=agregar-telefono`), que sin permiso o con el tope no se abre ni escribiéndola a mano. Una
// petición por acción; la lista de la respuesta reemplaza a la de la pantalla.
export function TelefonosExtra({ ficha, puedeAdministrar }: Props) {
  const telefonos = useTelefonosExtra(ficha)
  const panel = usePanelDeLead().extra
  const boton = useRef<HTMLButtonElement>(null)
  const abierto = puedeAdministrar && !telefonos.topeAlcanzado && panel.abierto
  const montar = useAbiertoAlgunaVez(abierto)
  const apertura = useApertura(abierto)
  const acciones = puedeAdministrar
    ? { guardar: telefonos.guardar, quitar: telefonos.quitar, enCurso: telefonos.enCurso }
    : null
  return (
    <>
      {telefonos.extras.map((extra) => (
        <FilaDeExtra
          key={extra.id}
          extra={extra}
          codigoDePais={ficha.telefonoCc}
          llamable={ficha.enCartera}
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
              onClick={panel.abrir}
            >
              <PlusIcon aria-hidden />
              Agregar teléfono
            </Button>
            {telefonos.topeAlcanzado ? (
              <span
                id="agregar-telefono-motivo"
                className="text-(length:--text-xs) text-(--color-ink-soft)"
              >
                Un lead admite hasta {MAXIMO_DE_TELEFONOS_EXTRA} teléfonos extra: quita uno para
                agregar otro.
              </span>
            ) : null}
          </div>
          {montar ? (
            <ModalDeExtraDiferido
              key={apertura}
              abierto={abierto}
              alCerrar={panel.cerrar}
              ficha={ficha}
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
