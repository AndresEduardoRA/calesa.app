// Server Component a propósito: un <script> renderizado desde un Client Component no se ejecuta
// al navegar y React avisa. Este se emite una sola vez, en el HTML del layout raíz.

export const CLASE_LIVE = 'live'
export const CLAVE_LIVE = 'modo-live'

// Va en el <body> antes que el contenido: aplica la clase del Modo Live antes del primer pintado,
// así una recarga con el modo encendido nunca deja ver una cifra.
export function GuionLive() {
  const codigo = `try{if(localStorage.getItem('${CLAVE_LIVE}')==='1')document.documentElement.classList.add('${CLASE_LIVE}')}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: codigo }} />
}
