'use client'

import Link from 'next/link'
import { fechaRelativa } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { useRegional } from '@/shared/ui/regional'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'
import { rutaDeLasTablas } from '../../../entities/tablas/rutas'

type Props = {
  tabla: TablaDeReferencia
  origen: { id: string; nombre: string }
}

// El encabezado del editor de una tabla (4.23-3, C10): su nombre, la versión que se edita y, en una compartida, a quién le cambia publicarla. «Volver a las tablas» no
// pregunta: el borrador conserva lo hecho.
export function EncabezadoDelEditor({ tabla, origen }: Props) {
  const { zonaHoraria, locale } = useRegional()
  const publicada = [
    `Versión ${formatearNumero(tabla.version, { locale, decimales: 0 })}`,
    tabla.publicadoPor,
    tabla.publicadoEn ? fechaRelativa(tabla.publicadoEn, { zona: zonaHoraria }) : null,
  ].filter((parte): parte is string => parte !== null)
  return (
    <div className="grid min-w-0 gap-1 text-(length:--text-sm)">
      <Link
        href={rutaDeLasTablas(origen.id)}
        className="w-fit text-(--color-ink-soft) underline-offset-4 hover:underline"
      >
        Volver a las tablas
      </Link>
      <h3 className="text-(length:--text-base) font-semibold break-words text-(--color-ink)">
        Editar {tabla.nombre}
      </h3>
      <p className="text-(--color-ink-soft)">{publicada.join(' · ')}</p>
      {tabla.compartida ? (
        <p className="text-(--color-ink)">
          Compartida: la usan los orígenes que no tienen una propia con la clave {tabla.clave}.
          Publicarla publica la versión siguiente de la fórmula de cada uno y pide que configures
          todos esos orígenes.
        </p>
      ) : null}
      {tabla.tapada ? (
        <p className="text-(--color-ink)">
          {origen.nombre} usa su propia «{tabla.nombre}»: publicar esta no le cambia nada; sí a los
          demás orígenes que la usan.
        </p>
      ) : null}
    </div>
  )
}
