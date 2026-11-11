## 2026-11-11 — Paso 6.01-1: la base del módulo `logistica`

- **D1 · Drawer y página con el mismo componente** (`<PanelDeLaUnidad>`): el drawer desde la cadena (`?vehiculo=<id>`) y la página para el enlace de una notificación.
- **D2 · `flujos/areas/mover/` ya existía** (5.02-1): 6.01 sólo le suma `leerFlujoDeOrigen`; no toca el núcleo ni las otras áreas.
- **D3 · La unidad se lee con la sesión de quien mira**, sin RPC ni `security definer`. La RLS de `vehiculos` pide `vehiculos.ver`, no `logistica.ver`: el panel exige las dos y no se
  relaja la RLS (sería una compuerta de datos).
- **D4 · `Unidad` es una unión por `tipo`** (`vehiculo` | `repuesto`); sólo se construye la de vehículo hasta 8.13.
- **D5 · Los huecos se ordenan por su `clave`** (`ORDEN_DE_HUECOS`), no por el archivo que los declara; una clave desconocida o repetida no se dibuja.
- **D6 · Formas de los otros huecos** (vacíos hoy, reversibles): `HuecoDelGrupo`, `EnlaceDeLogistica` (nulo = la página no existe) y `CatalogoDeLogistica`.
- **D7 · La guarda de áreas es copia de la de `flujos`**, sin prueba de coherencia con `plan.yaml` (la valida `coordinador.mjs validar`). El núcleo es la carpeta `nucleo` de cada capa.
- **D8 · `RUTAS` se agrega en la 6.01-2,** con su primer uso: así esta parte no toca `src/shared` y cierra en Nivel 1.
- **D9 · Un componente de hueco recibe sólo datos serializables** y carga lo suyo al abrirse el bloque (`diferido()`).
- **D10 · El título del panel es `vehiculos.titulo`** y los días en la fase salen de `fase_desde`; 6.13 lo cambia por el campo «principal».
- **D11 · El menú «Logística» sigue apagado** hasta 6.03.
- **Partición:** 6.01 son 3 partes (1: módulo; 2: panel y ruta de la unidad, Nivel 2; 3: `/logistica` y Configuración), con el plan en `.piloto/planes/6.01.md`.
