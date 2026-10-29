// El modo de tipo de cambio con que se calculó el total que se ve, dicho en el resumen (con un solo modo no se elige, pero se nombra). Sin modos, no se dibuja.
export function ModoDelResumen({ nombre }: { nombre: string | null }) {
  if (nombre === null) {
    return null
  }
  return (
    <p data-modo="" className="text-(length:--text-sm) text-(--color-ink-soft)">
      Modo de tipo de cambio: <span className="font-medium text-(--color-ink)">{nombre}</span>
    </p>
  )
}
