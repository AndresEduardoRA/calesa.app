'use client'

import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import type { LeadDeFicha } from '../../../entities/ficha'
import { MAXIMO_DE_TELEFONOS_EXTRA } from '../../../entities/telefonos'
import { useTelefonosExtra } from '../hooks/use-telefonos-extra'
import { FilaDeExtra } from './fila-de-extra'
import { FormularioDeExtra } from './formulario-de-extra'

type Props = {
  ficha: LeadDeFicha
  // Cartera y `leads.editar`: agregar, rotular y quitar. Sin esto sólo se leen.
  puedeAdministrar: boolean
}

// Los teléfonos extra de la ficha (las filas de «Teléfonos» bajo el principal), con «Agregar
// teléfono» al final cuando se pueden administrar. Una petición por acción; la lista de la respuesta
// reemplaza a la de la pantalla.
export function TelefonosExtra({ ficha, puedeAdministrar }: Props) {
  const telefonos = useTelefonosExtra(ficha)
  const [agregando, setAgregando] = useState(false)
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
          {agregando ? (
            <FormularioDeExtra
              ficha={ficha}
              extras={telefonos.extras}
              guardar={telefonos.guardar}
              alCerrar={() => {
                setAgregando(false)
              }}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-x-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 md:min-h-8"
                disabled={telefonos.topeAlcanzado}
                aria-describedby={telefonos.topeAlcanzado ? 'agregar-telefono-motivo' : undefined}
                onClick={() => {
                  setAgregando(true)
                }}
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
          )}
        </li>
      ) : null}
    </>
  )
}
