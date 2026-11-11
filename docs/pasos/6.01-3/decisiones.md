## 2026-11-11 — Paso 6.01-3: `/logistica` con el drawer y Configuración › Logística

- **D17 · La clave de la URL del drawer va en `clave-de-unidad.ts`, no en el archivo `'use client'`:** una constante importada de un módulo de cliente llega a un Server Component como referencia, no como el texto (la página leía `parametros[<referencia>]` y nunca abría el drawer).
- **D18 · El marco del drawer cierra con `shallow: false`:** quitar `?vehiculo=` vuelve a pedir la página, así el panel no queda montado con una unidad que ya no se muestra; la lectura la hace el servidor (`<UnidadAbierta>`) y llega como hijo. Abrirlo desde una tarjeta, sumando al historial y marcando la vuelta del foco, es del 6.03.
- **D19 · La sección «Logística» del hub existe sólo con un catálogo lleno** (`SECCIONES_DE_LOGISTICA` es vacía o de una): ninguna tarjeta lleva a una pantalla que dice «nada que configurar». La URL entra antes, con la clave.
- **D20 · El drawer se titula «Unidad»** (el término del glosario: puede ser un vehículo o, en 8.13, un repuesto); el título del vehículo lo dice el panel.
