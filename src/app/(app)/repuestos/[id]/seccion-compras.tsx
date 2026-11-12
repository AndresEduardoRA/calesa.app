import { leerComprasDelProyecto, leerMargenDelProyecto } from '@/modules/repuestos'
import { ListaDeCompras, MargenDelProyecto } from '@/modules/repuestos/pantallas/compras'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Compras» (8.11-2, C6): el margen y la lista, leídos recién al abrirla y sólo si quien mira tiene `repuestos.costos.ver` (lo decide la página con
// `pestanasLlenas`). Lo que falla sube al `error.tsx` de la ruta con «Reintentar», como el resto de la página. Registrar y editar llegan con 8.11-3.
export async function SeccionDeCompras({ proyectoId }: { proyectoId: string }) {
  const [compras, margen] = await Promise.all([
    leerComprasDelProyecto(proyectoId).then(datosO),
    leerMargenDelProyecto(proyectoId).then(datosO),
  ])
  return (
    <div className="grid gap-6">
      <MargenDelProyecto margen={margen} />
      <section aria-labelledby="compras-del-proyecto" className="grid gap-2">
        <h2 id="compras-del-proyecto" className="text-(length:--text-lg) font-semibold">
          Compras
        </h2>
        <ListaDeCompras filas={compras.filas} hayMas={compras.hayMas} />
      </section>
    </div>
  )
}
