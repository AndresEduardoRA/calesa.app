# 8.01-3: decisiones (2026-11-12)

- **D1 · El hueco es `HuecoDePestana<P = never> = ComponentType<P> | null`**, en `entities/nucleo/hueco-de-pestana.ts` (lo usan `sitio` y `contenido`).
  Nulo = la pestaña no existe; el paso que lo llena declara sus props. El `| null` se queda en el tipo aunque se llene: sin él, `no-unnecessary-condition`
  avisaría en `pestanas.ts`.
- **D2 · Sin pestañas llenas, «Sitio web» no figura en el hub** (precedente `SECCIONES_DE_LOGISTICA`): `secciones.ts` importa `SECCIONES_DE_WEB` (0 o 1),
  no `SECCION_DE_WEB` suelta como decía la fila; el efecto es el que la fila pide (nadie ve una tarjeta que lleva a nada).
- **D3 · La tarjeta se abre con las claves de las pestañas llenas**, no de todas: al llenarse sólo «Ajustes», quien tiene sólo `web.contenido.gestionar` no la ve.
- **D4 · Por URL:** sin ninguna clave de las pestañas, «No tienes permiso»; con alguna pero sin pestaña llena para esa persona, «Por ahora no hay nada que
  configurar aquí.» (como Logística).
- **D5 · `/configuracion/cola-web` es del 8.04:** aquí sólo `RUTAS.configuracionDeColaWeb`, sin carpeta ni sección vacía.
- **D6 · `sitio-legales` es del área `contenido`** en `PANTALLAS_DE_AREA` de la guarda: el 8.03 la llena desde `features/contenido/legales/`. El permiso sigue
  siendo `web.ajustes.gestionar` (es de la pestaña, no del área).
- **D7 · Textos:** «Sitio web» con `GlobeIcon`; pestañas «Ajustes», «Legales», «Guías», «Preguntas frecuentes», «Testimonios», en el orden de la fila.
  Reversibles: los ajusta el paso que llena cada una.
