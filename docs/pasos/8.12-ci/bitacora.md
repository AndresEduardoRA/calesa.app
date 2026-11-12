## 2026-11-12 · Paso 8.12: el rojo del CI del PR (bloque 4 del e2e)

### Hecho

- Causa del rojo (corrida 43308319908, sobre 24473b9b): `e2e/vehiculos-resumen-casos.spec.ts:124` («sin red al abrir el resumen…») cayó 2 de 2. Al cortar
  la red, además del resumen, la suscripción diferida de los no leídos del chat (`SuscripcionDeNoLeidosDiferida`, pedida al descansar) no llegaba y ponía su
  barra fija «Sin conexión. No se pudo abrir esto.» justo encima de la del resumen; al volver la red no se iba (la campana sí, desde 7.14-1), y tapaba el
  «Reintentar» de `#contenido` 30 s. No es del cotizador: depende de si el código del chat llega antes del corte, y en este bloque llegó tarde.
- Arreglo: la primera mitad del abierto **7-5** («el mismo hook y una `key`»). `useVueltaDeLaRed` pasa a `src/shared/ui/use-vuelta-de-la-red.ts` (el de
  `notificaciones/features/campana/hooks/` lo reexporta: el núcleo no se borra desde un carril) y `<WidgetChat>` remonta la suscripción con cada `online`.
- Prueba: `widget-chat.test.tsx` (el `diferido()` de verdad sobre un cargador que falla dos veces; con `online` el aviso se va y la burbuja dice «Chat, 3 sin
  leer»). Sin la `key` cae (verificado).

### Salidas

- `.piloto/salidas/8.12/ci-43308319908.log`, `vitest-related-ci.txt` (2 de 2), `e2e-resumen-casos.txt`.

### No hecho

- La segunda mitad de 7-5 (una suscripción de fondo no debería poner barra mientras no hay red) sigue abierta: es de producto.
- `vehiculos-alta.spec.ts:238` fue `flaky` en la misma corrida (la tecla N abrió «Nuevo lead» del marco): no tumbó el CI; sin medir la causa.

- e2e completo: no (8.12, arreglo del CI: sólo el spec dirigido `vehiculos-resumen-casos`; lo prueba el CI del PR)
