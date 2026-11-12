# Paso 7.14-1 — El cierre de la Fase 7 (parte 1 de 2): el recorrido, el push de verdad, 7-2 y el JS del marco

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/7.14-1.md`.

- **D1** El 7.14 se parte en 7.14-1 (7-2, el push de verdad, el recorrido y el JS) y 7.14-2 (el Nivel 3 y los docs de cierre): el completo corre una vez sobre
  el SHA con el arreglo de 7-2 y lo que pida el recorrido; los 33 docs de paso de la fase y las dos esperas largas no caben con margen en la misma sesión.
- **D2** Un endpoint simulado no puede recibir el push: la base (`push_suscribir`) y la función (`endpointPermitido`) sólo aceptan `https` sin puerto de los
  servicios de push conocidos, a propósito (la función no es un proxy abierto, D22 del 7.03-2). Sumar un host de prueba debilitaría esa defensa y tocaría una
  función `security definer`: no se hace. `push-de-verdad.sh` prueba de verdad todo lo que está antes (aviso → disparo → pase → pg_net → gateway → función →
  canje) y la última milla vale por `push-contrato.test.ts`, como dice la fila.
- **D3** El script corre sin claves VAPID en la función y se niega si `supabase/functions/.env` las trae: con claves mandaría un pedido real a un servicio de
  push con un endpoint inventado. Una respuesta que no sea `sin_claves` es ✗.
- **D4** El aviso del script entra por `notificar()` con el tipo `tarea_asignada`, la puerta que usa la tarea; la tarea nacida en el chat la recorre el e2e (R1).
- **D5** El recorrido corre en `escritorio` y `movil` (la campana y el chat se usan con el celular); sin capturas (pruebas sólo lo clave).
- **D6** 7-2 lo toma este paso: un arreglo en la campana, sin tocar `src/shared` (un reintento general en `diferido()` es otra intención y Nivel 2). La burbuja
  del chat tiene el mismo patrón; el 7.14-2 la anota como abierto.
- **D7** Al volver la red se remonta la suscripción (`key`): vuelve a pedir el código y el conteo y quita el «Sin conexión» de ese intento. Sin red, el aviso
  sigue con «Reintentar».
- **D8** Ningún tope de JS cambió: todas las rutas quedaron bajo el suyo.
- **D9** (Para el 7.14-2) PLAN y ESTADO se editan directo y BITACORA y DECISIONES por el script, como el 6.14-2. Si el 6.14-2 todavía no está en `main`, ESTADO
  sólo sustituye lo de la Fase 7.
- **D10** (Para el 7.14-2) `aplicado_en` de `chat.participar` y `chat.moderar` es dato de catálogo: queda como **7-3**, lo decide la persona.
- **D11** R3 busca con Ana el teléfono de su propio lead y el lead de la dueña, y con Luis (sin `leads.ver`) el lead de Ana: «no busca por teléfono» no se
  confunde con «no lo ve».
- **D12** Con la base sin cuentas, `push-de-verdad.sh` crea primero una dueña de prueba en su propia transacción y la borra al salir: la primera cuenta nace
  dueña y el permiso de registro (`auth_registro_permitido`, diferido) se mira al confirmar.
