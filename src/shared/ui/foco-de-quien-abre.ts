// A dónde vuelve el foco al cerrar un panel que se abre desde otra parte de la pantalla (el «Editar» de una fila o de un resumen,
// «Nuevo»): a quien lo abrió. Un panel abierto por la URL (con `shallow: false`) a veces ya no tiene el foco del botón cuando termina de
// cerrarse, y Base UI lo deja en `body`. Es de toda la pantalla y no de un componente: el botón y el panel llaman cada uno a su propio
// hook de URL. El panel se lo pasa a `<Drawer focoAlCerrar>`.
let quienAbrio: HTMLElement | null = null

// Se llama al abrir el panel, mientras el foco sigue en el botón que lo pidió.
export function recordarQuienAbre(): void {
  quienAbrio = document.activeElement instanceof HTMLElement ? document.activeElement : null
}

// El elemento que lo abrió, si sigue en la página; si no, `true` deja el foco adonde lo ponga Base UI.
export function focoDeQuienAbrio(): HTMLElement | boolean {
  return quienAbrio?.isConnected ? quienAbrio : true
}
