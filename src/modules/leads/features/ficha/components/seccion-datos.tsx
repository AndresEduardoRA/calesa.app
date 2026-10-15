'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Dato, DatosPorGrupo, RejillaDeDatos } from '@/shared/ui/campos'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import type { CampoDeLead } from '../../../entities/campo'
import type { LeadDeFicha } from '../../../entities/ficha'
import { BadgeDeTipo } from '../../listado/components/badge-de-tipo'
import { BloqueDeTelefonos } from './bloque-de-telefonos'

type Props = {
  ficha: LeadDeFicha
  // Todo el layout: los desactivados no se muestran.
  campos: readonly CampoDeLead[]
  origen: { nombre: string; activo: boolean } | null
  // Quien mira puede cambiar los teléfonos de este lead (cartera y `leads.editar`).
  puedeCambiarTelefono: boolean
}

// La sección «Datos»: los cuatro fijos y los campos del layout agrupados como los definió la
// empresa. Un «solo la cartera» de un lead que no es de la cartera de quien mira nunca llega: se
// dice, en vez de un guion que haría creer que no hay dato (igual que en el listado).
export function SeccionDatos({ ficha, campos, origen, puedeCambiarTelefono }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <div className="grid gap-4">
      <Bloque titulo="Datos principales">
        <RejillaDeDatos>
          <Dato etiqueta="Nombre">{ficha.nombre}</Dato>
          <Dato etiqueta="Tipo">
            <BadgeDeTipo tipo={ficha.tipo} />
          </Dato>
          <Dato etiqueta="Origen del lead">
            {origen ? (
              <>
                {origen.nombre}
                {origen.activo ? null : (
                  <span className="ml-1.5 text-(length:--text-xs) text-(--color-ink-soft)">
                    (inactivo)
                  </span>
                )}
              </>
            ) : (
              '—'
            )}
          </Dato>
          <Dato etiqueta="Creado">{formatearFechaHora(ficha.creadoEn, { zona: zonaHoraria })}</Dato>
        </RejillaDeDatos>
      </Bloque>
      <BloqueDeTelefonos ficha={ficha} puedeCambiar={puedeCambiarTelefono} />
      <DatosPorGrupo
        campos={campos}
        atributos={ficha.atributos}
        valorDe={(campo) =>
          ficha.atributos[campo.clave] === undefined && campo.soloCartera && !ficha.enCartera ? (
            <span className="text-(length:--text-xs) text-(--color-ink-faint)">
              Solo la cartera
            </span>
          ) : null
        }
      />
    </div>
  )
}
