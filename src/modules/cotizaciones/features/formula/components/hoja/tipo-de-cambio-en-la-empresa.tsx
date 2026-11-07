import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

const TEXTO_DE_MONEDAS =
  'Los tipos de cambio son de la empresa y valen para todos los orígenes: se cambian en Configuración › Empresa › Monedas.'

type Props = {
  // Otra frase en lugar de la de siempre (un tipo de cambio desactivado).
  texto?: string
  // Una línea más (en una guardada, que conserva el suyo: P1 del 4.20-3d).
  nota?: string
}

// Dónde se cambia un tipo de cambio, sin lectura ni formulario: el ⚙ de una celda de tipo de cambio en una guardada, y el de la hoja nueva sin fila o con la fila
// desactivada (4.20-3d).
export function TipoDeCambioEnLaEmpresa({ texto = TEXTO_DE_MONEDAS, nota }: Props) {
  return (
    <div className="grid gap-3">
      <p className="text-(length:--text-base) text-(--color-ink)">{texto}</p>
      {nota ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{nota}</p> : null}
      <Link
        href={`${RUTAS.empresa}?seccion=monedas` as Route}
        className={buttonVariants({
          variant: 'outline',
          className: 'min-h-11 justify-self-start md:min-h-8',
        })}
      >
        Ir a Monedas
      </Link>
    </div>
  )
}
