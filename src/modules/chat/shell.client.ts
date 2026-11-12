// La entrada del SHELL del módulo `chat` para Client Components de `src/app/(app)/_shell/`: sólo lo que el marco dibuja en toda pantalla (la burbuja del chat
// y el contador de la barra lateral). Existe aparte de `client.ts` porque lo que importa el shell viaja en el JS de **todas** las pantallas
// (`docs/RENDIMIENTO.md`); el panel, el hilo y Realtime van diferidos.
export { WidgetChat } from './features/widget/components/widget-chat'
export { NoLeidosDeLaBarra } from './features/widget/components/no-leidos-de-la-barra'
