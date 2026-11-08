'use client'

import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { EstadoError } from '@/shared/ui/estados'
import { Monto } from '@/shared/ui/monto'
import { avisosDelTerreno } from '../../../../entities/formula/terreno-de-prueba'
import type { VistaPrevia } from '../../../../entities/formula/vista-previa'
import type { LecturaDelTerreno } from '../../hooks/use-terreno-de-prueba'
import type { RechazoEnElEditor } from '../../hooks/use-editor-de-la-formula'

type Props = {
  lectura: LecturaDelTerreno
  // Nula hasta que lo de prueba está leído.
  vista: VistaPrevia | null
  rechazo: RechazoEnElEditor | null
  nombreDelOrigen: string
  alReintentar: () => void
}

const SIN_CIFRA = 'Sin cifra: falta algo en las filas.'

function Total({
  titulo,
  valor,
  moneda,
}: {
  titulo: string
  valor: number | null
  moneda?: string
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(--color-ink-soft)">{titulo}</dt>
      <dd className="font-semibold text-(--color-ink)">
        {valor === null ? (
          SIN_CIFRA
        ) : moneda === undefined ? (
          <Monto valor={valor} />
        ) : (
          <Monto valor={valor} moneda={moneda} />
        )}
      </dd>
    </div>
  )
}

// Dónde dice el rechazo qué corregir: su fila, la tarjeta de su grupo (4.21-3c) o el aviso de arriba de la lista.
function textoDelRechazo(rechazo: RechazoEnElEditor | null): string {
  if (rechazo?.grupoId) return 'la tarjeta del grupo dice qué corregir.'
  return rechazo?.filaId === null
    ? 'el aviso de arriba de la lista dice qué corregir.'
    : 'la fila marcada dice qué corregir.'
}

function Cuerpo({ lectura, vista, rechazo, nombreDelOrigen, alReintentar }: Props) {
  if (lectura.tipo === 'leyendo' || vista === null) {
    return lectura.tipo === 'error' ? (
      <EstadoError
        titulo="No pudimos leer los tipos de cambio y las tablas."
        alReintentar={alReintentar}
      />
    ) : (
      <EsqueletoListado filas={2} columnas={2} />
    )
  }
  if (vista.tipo === 'no_valida') {
    return (
      <p className="text-(--color-ink-soft)">
        La vista previa espera una fórmula válida: {textoDelRechazo(rechazo)}
      </p>
    )
  }
  if (vista.tipo === 'no_calcula') {
    return (
      <p className="text-(--color-ink-soft)">
        No se pudo calcular con estas cifras: revisa la variante por defecto de la fórmula.
      </p>
    )
  }
  const avisos = lectura.tipo === 'lista' ? avisosDelTerreno(lectura.terreno, nombreDelOrigen) : []
  return (
    <>
      <dl role="status" className="grid gap-2 sm:grid-cols-2">
        <Total titulo="Total en dólares" valor={vista.totales.usd} moneda="USD" />
        <Total
          titulo="Total en Bs"
          valor={vista.totales.bs}
          moneda={vista.totales.monedaBs ?? undefined}
        />
      </dl>
      {avisos.length > 0 ? (
        <ul className="grid gap-1 text-(--color-aviso-ink)">
          {avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

// La vista previa del editor de la fórmula (4.21-3a-2, C3, P5): lo que da la fórmula con cifras de prueba, antes de guardar nada. Cada estado dice qué pasa; los
// avisos de lo que no se pudo leer van bajo el total (no son errores). El total se anuncia (`role="status"`) cuando un «Aplicar» lo cambia.
export function VistaPreviaDeLaFormula(props: Props) {
  return (
    <section
      aria-label="Vista previa"
      className="grid min-w-0 gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
    >
      <div className="grid gap-0.5">
        <h4 className="font-semibold text-(--color-ink)">Vista previa</h4>
        <p className="text-(--color-ink-soft)">
          <strong>Cifras de prueba.</strong> Los datos en 0, las opciones apagadas, la variante por
          defecto y los tipos de cambio y las tablas de hoy.
        </p>
      </div>
      <Cuerpo {...props} />
    </section>
  )
}
