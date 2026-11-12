import { leerComprasDelProyecto, leerMargenDelProyecto } from '@/modules/repuestos'
import { ComprasDelProyecto, MargenDelProyecto } from '@/modules/repuestos/pantallas/compras'
import { datosO } from '@/shared/lib/errores'

type Props = {
  proyectoId: string
  // Los ítems vivos de la hoja que ya leyó la página y las monedas activas: las opciones del formulario, sin otra lectura (D4 y D5 de 8.11-3).
  items: readonly { id: string; descripcion: string }[]
  monedas: readonly { codigo: string; nombre: string }[]
  puedeEditarCostos: boolean
  cerrado: boolean
}

// La pestaña «Compras» (8.11-2, C6): el margen y la lista, leídos recién al abrirla y sólo si quien mira tiene `repuestos.costos.ver` (lo decide la página con
// `pestanasLlenas`). Lo que falla sube al `error.tsx` de la ruta con «Reintentar», como el resto de la página. Registrar, editar y eliminar (8.11-3) revalidan la
// página: la lista y el margen se vuelven a leer acá.
export async function SeccionDeCompras({
  proyectoId,
  items,
  monedas,
  puedeEditarCostos,
  cerrado,
}: Props) {
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
        <ComprasDelProyecto
          filas={compras.filas}
          hayMas={compras.hayMas}
          proyectoId={proyectoId}
          items={items}
          monedas={monedas}
          puedeEditarCostos={puedeEditarCostos}
          cerrado={cerrado}
        />
      </section>
    </div>
  )
}
