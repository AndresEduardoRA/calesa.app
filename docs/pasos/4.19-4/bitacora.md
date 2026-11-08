## 2026-11-08 — Paso 4.19-4: la vista previa en vivo del editor de la plantilla

- **Hecho:** cierra el 4.19. **Commit 1:** la consulta de tonos pide los seis colores (`TonoDelCatalogo` suma `claro` y `oscuro`) y el contexto reducido lleva el `plazo` de cada grupo.
  **Commit 2:** `entities/vista-previa-de-la-plantilla.ts` (el hueco: tipo sin código, lectura plana y `FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA = 4`) y
  `entities/plantilla/lectura-para-la-vista-previa.ts` (grupos en el orden de la plantilla, filas en el de la fórmula, etiqueta escrita o la del nodo, leyenda sólo la escrita, tono
  si sigue en el catálogo, tope de 4 filas cortado antes de mapear). **Commit 3:** `entities/tarjeta/vista-previa-de-ejemplo.ts` (adaptador a `TarjetaLista`, cifras de ejemplo, página
  de ejemplo), `VistaPreviaDeLaPlantilla`, su diferida y `pantallas/tarjeta-plantilla.ts`. **Commit 4:** `VistaPreviaDelEditor`, el editor (`VistaPrevia?`, grilla a dos columnas desde
  `xl`), la pestaña, la sección y la página (`max-w-6xl` sólo en «Tarjeta»), con E1.
- **Verificación** (`.piloto/salidas/4.19-4/`): vitest de lo tocado (lectura 6, ejemplo 4, componente 3, editor +3, contexto y lectura de tonos +2); `scripts/guardas` 1.007 en verde;
  `e1.txt` (E1, 2 de 2 en escritorio y móvil); `dirigidos.txt` (los cinco specs de la pestaña y E1: **44 de 44** en los dos proyectos; E7 con 500 y 600 miembros dentro de los topes
  de 154.900 B y 5.000 nodos, sin tocarlos); `presupuesto-js.txt` (`/cotizaciones/nuevo`: 439,5 KB de 460 con gzip).
  e2e completo: no (4.19-4, pantalla, 3 de 3)
- **Desvío:** la primera corrida de los cinco specs cayó en `E9` de descartar y `E10` de publicar (escritorio, al 200 % de texto: `24rem` fijos de la columna de la vista previa
  ensanchaban la página). La columna pasó a `minmax(0, 24rem)`; no hay defecto de pulido nuevo.
- **Abiertos:** sigue **4-101** (mover, agregar o quitar grupos a mano: la persona lo decide mirando la vista previa) y **4-102**; nuevo **4-103** (la vista previa no muestra la
  descripción del nodo, el nombre de `tipos_cambio` ni el título de la variante: no viajan al navegador).
- **Pendientes que se arrastran** (salieron de `docs/ESTADO.md` para dejarlo en 60 líneas): ficha del lead («Datos» 39,2 de 43 KB, «Oportunidades» 61,2 de 66); portal (su texto por empresa;
  `api/portal/*` en la Fase 8); lead sin dueño tras una baja (lo rescata la supervisión); Fase 6 (publicar sin mover la versión de la ficha; la papelera manual no mira `documentos`); Fases 7 a 9
  (notificar al compartir, transferir y limpiar; «Escribirle por chat»; `recordatorios_notificar()` sin cron).
