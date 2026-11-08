type Props = {
  // Lo que `validarDiseno()` rechaza tras el último cambio; el cambio queda aplicado y se dice, sin apagar «Guardar».
  rechazo: { mensaje: string; donde: string | null } | null
  // Las frases de «se deduce restando».
  avisos: readonly string[]
}

const AVISO =
  'rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(length:--text-sm) text-(--color-aviso-ink)'

// Sobre las secciones: lo que la base no aceptaría al publicar y lo que se deduce restando. Ninguno bloquea nada (un borrador puede quedar sin publicar).
export function AvisosDelDiseno({ rechazo, avisos }: Props) {
  return (
    <div role="status" data-avisos-del-diseno className="grid min-w-0 gap-2 empty:hidden">
      {rechazo !== null ? (
        <p className={AVISO}>
          Revisa el diseño: {rechazo.mensaje}
          {rechazo.donde !== null ? ` (en «${rechazo.donde}»)` : ''}
        </p>
      ) : null}
      {avisos.map((aviso) => (
        <p key={aviso} className={AVISO}>
          {aviso}
        </p>
      ))}
    </div>
  )
}
