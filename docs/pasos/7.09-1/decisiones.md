## 2026-11-12 — Paso 7.09-1: base del módulo `chat` y la lista de conversaciones (parte 1 de 4 del 7.09)

- **D1** · Presencia y «escribiendo…» no entran (la recomendada de la fila 7.09). Cumplida.
- **D2** · La lista se actualiza por dos señales de Realtime, nunca `DELETE`: `mensajes` `INSERT` con `autor_id=neq.<yo>` (la RLS de
  `mensajes: leer` decide por suscriptor) y `conversaciones_miembros` `INSERT`/`UPDATE` con `usuario_id=eq.<yo>`. Ante cualquiera se relee la
  cabeza con `chat_conversaciones` (una sola relectura por ráfaga: espera de 250 ms). Cumplida (`infra/realtime.client.ts`).
- **D3** · Iniciar una directa buscará en `perfiles` bajo `perfiles: leer`, sin RPC nueva ni migración: el paso no toca la base. Es de la parte 2.
- **D4** · Las dos pantallas del celular van por CSS (`hidden md:flex` según haya `?c=`), sin medir el ancho; «Volver a la lista» es un
  `<Link href="/chat">` visible sólo en celular. Cumplida (`e2e/chat.spec.ts`, `movil`).
- **D5** · `chat` se prende en `navegacion.ts` en esta parte: `navegacion.test.ts` exige que `page.tsx` exista si `disponible` es `true`. El hilo
  dice «Los mensajes llegan con la siguiente parte.» hasta la parte 3.
- **D6** · La lista se lee con el mismo código en servidor (primera página, `composicion.ts`) y navegador («Ver más» y señales,
  `composicion.client.ts`): `infra/consultas.ts` y un parser Zod en `entities/conversaciones.ts` (un JSON mal formado es un `Resultado`).
- **D7** · Una `?c=` ilegible cuenta como sin selección; un GUID que no es mío dibuja «Esta conversación ya no es tuya» con «Volver a la lista».
  `leerConversacion` decide por la fila propia de `conversaciones_miembros` (con `chat.global` perdido, la base tampoco la devuelve), no por poder
  leer `conversaciones`. Cumplida (`e2e/chat.spec.ts`, tercera prueba).
- **D8** · Sin `chat.participar` la página dice «No tienes permiso…» con `puede()` y no lee la base. Cumplida (cuarta prueba).
- **D9** · Tope de lo cargado: `TOPE_DE_LO_CARGADO` (500) con `<AvisoDeTope>`; el camino a lo antiguo es abrir la directa por la persona (parte 2).
- **D10** · Cambio frente al plan: «99+» sale de `textoDeNoLeidos()` (puro, con test), no de `conteoAcotado`/`conteoCorto`: la base ya acota en 100 y
  esas funciones piden un conteo con `tope + 1` que aquí no hay. El nombre accesible de la insignia en 100 es «Más de 99 sin leer».
- **D11** · El tope sin assert de `docs/RENDIMIENTO.md` (una conversación que sube mientras se pagina) se deja: lo cubre `fundirPagina` al releer la cabeza
  (`entities/conversaciones.test.ts`: no borra lo cargado más abajo ni duplica).
