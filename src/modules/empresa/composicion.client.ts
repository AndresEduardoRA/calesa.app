// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export {
  descartarIconos,
  dibujarIconos,
  subirIconos,
  type IconoDibujado,
} from './infra/iconos.client'
export { descartarLogo, prepararLogo, subirLogo, type LogoListo } from './infra/logo.client'
