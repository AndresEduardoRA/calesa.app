// Guardar los íconos regenerados, paso a paso (commit diferido, .claude/rules/datos.md). Es sólo
// el orden de las cosas: lo que sube, guarda y borra llega por puertos, así se prueba con dobles.
import type { Resultado } from '@/shared/lib/errores'
import type { Iconos } from '../../entities/iconos'

type Puertos<Dibujados> = {
  subir: (dibujados: Dibujados) => Promise<Resultado<Iconos>>
  guardar: (iconos: Iconos | null) => Promise<Resultado<{ actualizadoEn: string }>>
  descartar: (rutas: string[]) => Promise<void>
}

function rutasDe(iconos: Iconos | null): string[] {
  return iconos ? [...new Set(Object.values(iconos))] : []
}

// 1. Los íconos se suben recién acá, al confirmar. Si no suben, no se guarda nada.
// 2. Se guardan sus rutas en los ajustes. Si eso falla, lo recién subido se descarta.
// 3. Si guardó, se descartan los anteriores. `dibujados` nulo es volver a los neutros.
export async function guardarIconosRegenerados<Dibujados>(
  puertos: Puertos<Dibujados>,
  pedido: { dibujados: Dibujados | null; anteriores: Iconos | null },
): Promise<Resultado<{ actualizadoEn: string }>> {
  const { dibujados, anteriores } = pedido
  let nuevos: Iconos | null = null
  if (dibujados !== null) {
    const subida = await puertos.subir(dibujados)
    if (!subida.ok) {
      return subida
    }
    nuevos = subida.data
  }
  const deAntes = rutasDe(anteriores)
  const deAhora = rutasDe(nuevos)

  const guardado = await puertos.guardar(nuevos)
  if (!guardado.ok) {
    // Lo que ya estaba guardado no se toca: sigue referenciado.
    await puertos.descartar(deAhora.filter((ruta) => !deAntes.includes(ruta)))
    return guardado
  }
  await puertos.descartar(deAntes.filter((ruta) => !deAhora.includes(ruta)))
  return guardado
}
