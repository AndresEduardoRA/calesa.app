// ¿Se le ofrece instalar la app? Reglas puras, sin `window`: el hook las alimenta con lo que lee
// del navegador (`shared/ui/use-instalacion.ts`).

export type Oferta = 'ninguna' | 'prompt' | 'instrucciones'

type Entrada = {
  // La app ya corre instalada (ventana propia, sin barra del navegador).
  instalada: boolean
  // iOS no tiene `beforeinstallprompt`: se instala desde «Compartir».
  ios: boolean
  // El navegador avisó que puede instalar y guardamos su evento.
  hayEvento: boolean
}

export function ofrecerInstalacion({ instalada, ios, hayEvento }: Entrada): Oferta {
  if (instalada) return 'ninguna'
  if (hayEvento) return 'prompt'
  if (ios) return 'instrucciones'
  return 'ninguna'
}

// iPhone, iPad y iPod; el iPad moderno se presenta como Mac y se delata por la pantalla táctil.
export function esIos(userAgent: string, plataforma: string, puntosTactiles: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true
  return plataforma === 'MacIntel' && puntosTactiles > 1
}

// `navigator.standalone` es de Safari; el resto responde por `(display-mode: standalone)`.
export function estaInstalada(mediaStandalone: boolean, navigatorStandalone: boolean): boolean {
  return mediaStandalone || navigatorStandalone
}
