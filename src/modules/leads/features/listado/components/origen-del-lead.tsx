import { cn } from 'cn'
import type { OrigenConEstado } from '../../../entities/ficha'
import { IconoDelCatalogo } from '@/shared/ui/icono-del-catalogo/icono-del-catalogo'

// El origen de un lead con su nombre (el que configuró la empresa) y, si lo tiene, su icono: nunca sólo el icono. Un nombre largo se corta con «…»
// dentro de su ancho (`title` lo trae completo). Sin icono es el nombre solo. Un origen apagado lleva «(inactivo)» al lado: lo que cede es el
// nombre, la marca no (5a-22: con las dos cediendo, la línea ensanchaba la página al 200 %); el espacio es texto, no sólo el hueco entre cajas, para
// que el lector y la búsqueda lean «Facebook (inactivo)» de corrido.
export function OrigenDelLead({
  nombre,
  icono,
  activo = true,
  className,
  enLista = false,
}: {
  nombre: string
  icono: string | null
  // Falso cuando la empresa apagó el origen pero el lead lo conserva.
  activo?: boolean
  className?: string
  // Una fila de la lista: el icono sale del símbolo compartido (`<SimbolosDeIconos>`), no en línea.
  enLista?: boolean
}) {
  return (
    <span
      title={nombre}
      className={cn('inline-flex max-w-full min-w-0 items-center gap-1.5', className)}
    >
      <IconoDelCatalogo
        clave={icono}
        className="size-3.5 text-(--color-ink-soft)"
        deLista={enLista}
      />
      <span className="min-w-0 truncate">{nombre}</span>
      {activo ? null : (
        <>
          {' '}
          <span className="shrink-0">(inactivo)</span>
        </>
      )}
    </span>
  )
}

// La línea del origen en la tarjeta del celular: nada si el lead no tiene.
export function OrigenDeLaTarjeta({ origen }: { origen: OrigenConEstado | null }) {
  return origen ? (
    <OrigenDelLead
      nombre={origen.nombre}
      icono={origen.icono ?? null}
      enLista
      className="text-(length:--text-xs) text-(--color-ink-soft)"
    />
  ) : null
}
