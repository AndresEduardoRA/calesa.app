// Quitar un adjunto por su URL (`?panel=quitar-adjunto&adjunto=<id>`, 4.27-3). Sin imports: la sección que se carga con la página lo lee para montar la lista si la
// URL ya trae el diálogo, y no debe arrastrar Zod ni las reglas de `adjunto.ts`.
export const PANEL_QUITAR_ADJUNTO = 'quitar-adjunto'
export const CLAVE_DE_ADJUNTO = 'adjunto'
export const MENSAJE_ADJUNTO_YA_NO_ESTA = 'Ese adjunto ya no está.'
