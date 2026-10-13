type Props = { hechas: number; total: number }

// Cuántas fotos ya terminaron de subir. No hay avance por bytes: cada archivo pesa unos cientos
// de KB y el navegador no informa el progreso de una subida así.
export function ProgresoDeSubida({ hechas, total }: Props) {
  const porcentaje = total === 0 ? 0 : Math.round((hechas / total) * 100)
  return (
    <div className="grid gap-1">
      <div
        role="progressbar"
        aria-label="Subiendo fotos"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={hechas}
        aria-valuetext={`${hechas} de ${total}`}
        className="h-1.5 overflow-hidden rounded-(--radius-pill) bg-(--color-paper-dim)"
      >
        <div
          className="h-full rounded-(--radius-pill) bg-(--color-primario) transition-[width] motion-reduce:transition-none"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
        Subiendo {hechas} de {total}
      </p>
    </div>
  )
}
