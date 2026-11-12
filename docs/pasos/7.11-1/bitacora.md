## 2026-11-12 · Paso 7.11-1: la burbuja del chat, el panel y los no leídos (parte 1 de 2)

### Hecho

- El contador de no leídos de la pestaña: `leerNoLeidos` (la entidad valida 0 a 100), `infra/no-leidos.client.ts` (`chat_no_leidos`), un store sin Supabase y `SuscripcionDeNoLeidos`
  (diferida; lee al descansar el navegador, tras cada señal de la lista con 250 ms de espera y al reconectar).
- `<WidgetChat>` en el hueco del marco (`HuecoChat`, sólo con `chat.participar`): la burbuja con el contador, oculta en `/chat`; botón que abre el panel desde 768 px y enlace a `/chat` en el celular.
- El panel diferido: la lista (las mismas filas de `/chat`, que aquí son botones) y el hilo sin tocar la URL (`HiloDelWidget`); «Abrir en Chat», «Volver a la lista», Escape y el foco de vuelta a la burbuja.
- El contador también en la entrada «Chat» de la barra lateral y del menú del celular (`NoLeidosDeLaBarra`, el mismo store).
- `e2e/chat-widget.spec.ts`: llega un mensaje en `/leads`, la burbuja y la barra dicen «1», se abre, se responde con la URL intacta y el contador vuelve a 0; en el celular la burbuja lleva a `/chat`; sin permiso, ni burbuja ni entrada.

Commits: ver `git log` de la rama (cuatro de código y el de docs).

### Verificación

- e2e `chat-widget`, `chat` y `chat-menciones` en escritorio y movil: 34 de 34 (2 saltadas por proyecto), `.piloto/salidas/7.11/e2e-dirigidos.txt`; `chat-widget` repetido 4 veces en escritorio: 8 de 8.
- `presupuesto-js`, `avisos-sobre-el-pie`, `avisos-con-panel`, `botones-texto-200` y `buscador` en verde (`.piloto/salidas/7.11/e2e-presupuesto*.txt`). JS en frío con gzip, antes → después: `/leads` 512,0 → 513,8, `/perfil` 418,6 → 420,5,
  `/vehiculos` 477,8 → 479,7, `/cotizaciones` 357,2 → 359,1, `/cotizaciones/nuevo` 443,0 → 444,9, `/cotizaciones/[id]` 447,3 → 449,2 (tope 448 → 452), `/logistica` 397,2 → 399,2: ≈ 1,9 KB y un chunk en todas.
- `vitest` de `src/modules/chat` y `scripts/guardas`: 1.251 en verde; `typecheck` y `lint` limpios. Sin SQL: no corre `db:probar`.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- Bajo la fila 7.11: «7.11-1 hecha (burbuja, panel y no leídos; docs del paso); sigue 7.11-2 («Escribirle por chat», `/chat?con=`, `leads-alta.spec.ts:216`)».
- Abierto: `/cotizaciones/[id]` ya medía 447,3 de 448 antes del paso (el tope se subió a 452 con la burbuja); la próxima pantalla que sume al marco lo vuelve a rozar.

e2e completo: no (7.11-1, Nivel 2; dirigidos: chat-widget, chat, chat-menciones, presupuesto-js, avisos-sobre-el-pie, avisos-con-panel, botones-texto-200 y buscador en escritorio y movil)
