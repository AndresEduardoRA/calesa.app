// Las plataformas de subasta que apibara sabe consultar. Es vocabulario del proveedor, no una regla
// del negocio: lo usan la configuración de la integración (`empresa`) y los orígenes de subasta
// (`origenes`), que no pueden importarse entre sí.

export const PLATAFORMAS_APIBARA = ['copart', 'iaai'] as const
export type PlataformaApibara = (typeof PLATAFORMAS_APIBARA)[number]

export const NOMBRE_DE_PLATAFORMA: Record<PlataformaApibara, string> = {
  copart: 'Copart',
  iaai: 'IAAI',
}

// De lo que guarda la base (texto libre) a lo que apibara sabe consultar.
export function plataformasConocidas(valores: readonly string[]): PlataformaApibara[] {
  return PLATAFORMAS_APIBARA.filter((plataforma) => valores.includes(plataforma))
}
