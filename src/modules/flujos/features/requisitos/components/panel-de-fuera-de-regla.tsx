'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Drawer } from '@/shared/ui/drawer'
import {
  TOPE_DE_FUERA_DE_REGLA,
  textoDeFaltan,
  type GrupoDelPanel,
} from '../../../entities/requisitos/fuera-de-regla'

type Props = {
  abierto: boolean
  alCerrar: () => void
  hayMas: boolean
  grupos: GrupoDelPanel[]
  titulosFallaron: boolean
}

// Las unidades que ya están en una fase y no cumplen lo que ésta pide ahora, por fase. Sólo las nombra: arreglarlas (subir el documento, completar el dato)
// es de la unidad, y «Verlas en el inventario» es la única salida. Los títulos son los que quien mira puede ver.
export function PanelDeFueraDeRegla({ abierto, alCerrar, hayMas, grupos, titulosFallaron }: Props) {
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Unidades fuera de regla"
      descripcion="No se mueven: quedan marcadas hasta que cumplan lo que falta."
    >
      <div className="grid gap-4 px-4 pb-4">
        {titulosFallaron ? (
          <Aviso tono="aviso">No pudimos leer los títulos de los vehículos.</Aviso>
        ) : null}
        {grupos.map((grupo) => (
          <section key={grupo.faseId} aria-label={grupo.faseNombre} className="grid gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="text-(length:--text-sm) font-medium text-(--color-ink)">
                {grupo.faseNombre}
              </h3>
              {grupo.href ? (
                <Link
                  href={grupo.href as Route}
                  className="text-(length:--text-sm) text-(--color-ink) underline"
                >
                  Verlas en el inventario
                </Link>
              ) : null}
            </div>
            <ul className="grid gap-1">
              {grupo.unidades.map((unidad) => (
                <li
                  key={unidad.clave}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-(--radius-md) border border-(--color-line) px-3 py-2"
                >
                  <span className="text-(length:--text-sm) break-words text-(--color-ink)">
                    {unidad.titulo}
                  </span>
                  <span className="text-(length:--text-xs) text-(--color-ink-soft)">
                    {textoDeFaltan(unidad.faltan)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {hayMas ? (
          <AvisoDeTope
            texto={`Mostrando las primeras ${String(TOPE_DE_FUERA_DE_REGLA)} unidades.`}
            camino={
              grupos.some((g) => g.href !== null)
                ? 'Las demás están en esa fase y en las siguientes: ábrelas por fase con «Verlas en el inventario».'
                : undefined
            }
          />
        ) : null}
      </div>
    </Drawer>
  )
}
