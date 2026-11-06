import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// El enlace de «Falta publicar la fórmula de <origen>» a Configuración › Cotización: el núcleo (`<FormulaSinPublicar>`) lo recibe como `accion` y la página lo une
// (`pantallas/formula-hoja.ts`). Hoy no usa el origen; lo recibe para que el 4.20 pueda llevar a la fórmula de ese origen.
export function EnlaceDeLaFormulaSinPublicar(_props: { origenId: string }) {
  return (
    <Link
      href={RUTAS.configuracionDeCotizacion as Route}
      className={buttonVariants({ className: 'min-h-11 md:min-h-8' })}
    >
      Ir a la configuración de cotización
    </Link>
  )
}
