import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'

// El enlace de «Falta publicar la fórmula de <origen>» a Configuración › Cotización: el núcleo (`<FormulaSinPublicar>`) lo recibe como `accion` y la página lo une
// (`pantallas/formula-hoja.ts`). Lleva a la pestaña «Fórmula» de ese origen (4.20-2a), que dice que todavía no tiene una versión publicada.
export function EnlaceDeLaFormulaSinPublicar({ origenId }: { origenId: string }) {
  const consulta = new URLSearchParams({ seccion: 'formula', origen: origenId })
  return (
    <Link
      href={`${RUTAS.configuracionDeCotizacion}?${consulta.toString()}` as Route}
      className={buttonVariants({ className: 'min-h-11 md:min-h-8' })}
    >
      Ir a la configuración de cotización
    </Link>
  )
}
