// Una suscripción de push de la propia persona (un navegador). El `endpoint` es la llave para quitarla y no se muestra.
export const TOPE_DE_SUSCRIPCIONES = 10

export type SuscripcionPropia = {
  endpoint: string
  userAgent: string | null
  creadoEn: string
}
