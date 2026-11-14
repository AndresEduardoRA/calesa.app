'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { leerChoques } from '../../../composicion.client'
import type {
  ChoqueDeTelefonos,
  LeadDeChoque,
  PaginaDeChoques,
} from '../../../entities/ajustes-de-leads'
import { avisarError } from '@/shared/ui/toasts'

type Props = { primera: PaginaDeChoques }

// Un lead del choque: con enlace si quien configura lo ve; si no, sin nombre ni enlace (la base no los manda).
function Lead({ lead }: { lead: LeadDeChoque }) {
  if (lead.id === null) {
    return <span className="text-(--color-ink-soft)">Un lead que no ves</span>
  }
  return (
    <Link
      href={`${RUTAS.leads}/${lead.id}` as Route}
      className="font-medium underline underline-offset-2"
    >
      {lead.nombre ?? 'Lead'}
    </Link>
  )
}

function Fila({ choque }: { choque: ChoqueDeTelefonos }) {
  return (
    <li className="min-w-0 text-(length:--text-sm) text-(--color-ink)">
      <span className="tabular-nums">{choque.telefono}</span> · <Lead lead={choque.lead} /> y{' '}
      <Lead lead={choque.otro} /> ({choque.otro.como === 'principal' ? 'principal' : 'extra'})
    </li>
  )
}

// Los números que hoy se repiten entre leads vivos: un extra que es el principal (o un extra anterior) de otro lead. Sólo con la regla
// guardada encendida. Sin total exacto: de a una página, «Ver más» sigue por el cursor, «Seguir buscando» si el recorrido de la base se
// cortó, y al llegar al tope de lo cargado se avisa. El número va enmascarado.
export function ChoquesDeTelefonos({ primera }: Props) {
  const [filas, setFilas] = useState(primera.filas)
  const [siguiente, setSiguiente] = useState(primera.siguiente)
  const [hayMas, setHayMas] = useState(primera.hayMas)
  const [cortado, setCortado] = useState(primera.recorridoCortado)
  const [pidiendo, setPidiendo] = useState(false)
  const alTope = filas.length >= TOPE_DE_LO_CARGADO
  const puedeSeguir = (hayMas || cortado) && siguiente !== null && !alTope

  async function seguir() {
    setPidiendo(true)
    const lectura = await leerChoques(siguiente)
    setPidiendo(false)
    if (!lectura.ok) {
      avisarError(lectura.error)
      return
    }
    setFilas((actuales) => [...actuales, ...lectura.data.filas])
    setSiguiente(lectura.data.siguiente)
    setHayMas(lectura.data.hayMas)
    setCortado(lectura.data.recorridoCortado)
  }

  return (
    <Bloque titulo="Números repetidos">
      {filas.length === 0 && !hayMas && !cortado ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No hay números repetidos entre leads.
        </p>
      ) : (
        <div className="grid gap-3">
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Estos números ya se repetían antes de encender la regla: quedan como están y rige para
            altas y ediciones desde ahora.
          </p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {filas.map((choque) => (
              <Fila key={choque.id} choque={choque} />
            ))}
          </ul>
          {alTope ? (
            <AvisoDeTope
              texto={textoDelTope(TOPE_DE_LO_CARGADO, {
                sustantivo: 'números repetidos',
                orden: 'primeros',
              })}
            />
          ) : null}
          {puedeSeguir ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-fit md:min-h-9"
              disabled={pidiendo}
              onClick={() => {
                void seguir()
              }}
            >
              {hayMas ? 'Ver más' : 'Seguir buscando'}
            </Button>
          ) : null}
        </div>
      )}
    </Bloque>
  )
}
