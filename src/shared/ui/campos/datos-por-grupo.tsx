'use client'

import type { ReactNode } from 'react'
import { agruparCampos, valorMostrado, type CampoMostrable } from '@/shared/lib/campos'
import { Bloque } from '../bloque'
import { useRegional } from '../regional'
import { ValorMostrado } from './valor-mostrado'

const REJILLA = 'grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3'

type Props = {
  etiqueta: string
  children: ReactNode
}

// Un dato de una ficha: su etiqueta y, debajo, su valor.
export function Dato({ etiqueta, children }: Props) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink)">{children}</dd>
    </div>
  )
}

// La rejilla de datos de un bloque de una ficha.
export function RejillaDeDatos({ children }: { children: ReactNode }) {
  return <dl className={REJILLA}>{children}</dl>
}

type Campo = CampoMostrable & {
  clave: string
  etiqueta: string
  grupo: string | null
  activo: boolean
}

type PropsDeGrupos<C extends Campo> = {
  campos: readonly C[]
  // Lo que tiene guardado quien se muestra, por clave de campo.
  atributos: Readonly<Record<string, unknown>>
  // Qué mostrar cuando quien llama sabe algo que el valor no dice (un dato que quien mira no
  // recibe). Nulo = el valor de `atributos`.
  valorDe?: (campo: C) => ReactNode | null
}

// Un bloque por cada grupo del layout, en su orden, con los campos activos y su valor. Los nombres
// salen del layout; lo que no tiene grupo va en «Otros datos». Los desactivados no se muestran.
export function DatosPorGrupo<C extends Campo>({ campos, atributos, valorDe }: PropsDeGrupos<C>) {
  const { locale, zonaHoraria } = useRegional()
  return (
    <>
      {agruparCampos(campos).map((grupo) => (
        <Bloque key={grupo.nombre ?? ''} titulo={grupo.nombre ?? 'Otros datos'}>
          <RejillaDeDatos>
            {grupo.campos.map((campo) => (
              <Dato key={campo.clave} etiqueta={campo.etiqueta}>
                {valorDe?.(campo) ?? (
                  <ValorMostrado
                    valor={valorMostrado(campo, atributos[campo.clave], {
                      locale,
                      zona: zonaHoraria,
                    })}
                  />
                )}
              </Dato>
            ))}
          </RejillaDeDatos>
        </Bloque>
      ))}
    </>
  )
}
