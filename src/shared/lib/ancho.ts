// El ancho de la pantalla de quien pide, para que el servidor dibuje una sola de las dos vistas de una lista (la tabla o
// las tarjetas, las columnas del kanban o sus pestañas) y la hidratación no cambie nada (cierre 1 de la Fase 3). El
// navegador lo deja en una cookie al entrar y cada vez que cruza un corte; sin cookie (la primera visita), lo adivina el
// `user-agent`: un celular es angosto, lo demás es escritorio. Si adivina mal (una ventana de escritorio angosta), la vista
// cambia una vez al hidratar y desde ahí manda la cookie.

export const COOKIE_DE_ANCHO = 'ancho'

// Lo que se supone sin cookie.
export const ANCHO_DEL_CELULAR = 400
export const ANCHO_DE_ESCRITORIO = 1280

// Los cortes que deciden una vista, los mismos de Tailwind: `sm` (el kanban: columnas o pestañas), `md` (la tabla o las
// tarjetas, y dónde va «Ítems por página») y `lg` (el panel de filtros al costado o en una hoja).
export const CORTE_DEL_TABLERO = 640
export const CORTE_DE_LA_TABLA = 768
export const CORTE_DEL_PANEL = 1024
export const CORTES_DE_ANCHO = [CORTE_DEL_TABLERO, CORTE_DE_LA_TABLA, CORTE_DEL_PANEL] as const

// Un teléfono: «Mobi» (Android, Firefox y Chrome en iOS lo dicen) o el iPhone. Una tableta Android no lo dice, y un iPad
// se presenta como escritorio: los dos tienen ancho de escritorio o casi.
const DE_CELULAR = /Mobi|iPhone|iPod/i

// Los px que vale la pena creer: un número entero entre 200 y 10.000, sin signos ni decimales.
function anchoValido(texto: string | undefined): number | null {
  if (texto === undefined || !/^\d{3,5}$/.test(texto)) {
    return null
  }
  const ancho = Number(texto)
  return ancho >= 200 && ancho <= 10000 ? ancho : null
}

export function anchoDeLaPeticion(pedido: {
  cookie: string | undefined
  agente: string | null
}): number {
  return (
    anchoValido(pedido.cookie) ??
    (pedido.agente !== null && DE_CELULAR.test(pedido.agente)
      ? ANCHO_DEL_CELULAR
      : ANCHO_DE_ESCRITORIO)
  )
}

// La cookie tal como la escribe el navegador: un año, para todo el sitio. No es de sesión ni lleva nada de la persona.
export function cookieDeAncho(ancho: number): string {
  return `${COOKIE_DE_ANCHO}=${String(Math.round(ancho))}; Path=/; Max-Age=31536000; SameSite=Lax`
}
