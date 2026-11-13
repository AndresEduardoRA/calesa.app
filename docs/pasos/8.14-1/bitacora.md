## 8.14-1 · El cierre de la Fase 8: el recorrido del «Terminado cuando», las fichas, GLOSARIO y UX (2026-11-13)

Parte 1 de 2 (`parcial: true`): queda el **8.14-2**, el Nivel 3 (`pnpm test:e2e:completo` con los dos proyectos) y los docs de cierre (tabla de criterios,
«Cierre de la Fase 8», «Partición» marcada, arrastrados, contradicciones y abiertos 8-x, «Riesgos y huecos», ESTADO por sustitución —hoy 82 líneas con bloques
repetidos— y la línea «Fase 8 cerrada» de las fichas). Su plan está servido en `.piloto/planes/8.14-1.md` › «Partición» (borrador de la tabla en V20).

- **`e2e/fase-8-recorrido.spec.ts`**, ocho pruebas en serie, `escritorio` y `movil` (R3 sólo escritorio, `@sin-celular`), con su terreno en
  `e2e/soporte/fase-8-recorrido.ts` y `pedirComoVisitante`/`guiaPublica` en `e2e/soporte/web-publica.ts` (la clave pública, sin sesión): R1 un visitante
  anónimo pide asesor y le toca una de las dos asesoras (X); R2 X confirma el turno en Inicio con «Contacté» en un toque; R3 la fila de X en «En la rueda» dice
  «Contacta el 50 %» y la de Y «0 %»; R4 X apaga su disponibilidad en `/perfil` y el visitante que vuelve igual la recibe (pegajoso), uno nuevo va a Y; R5 con Y
  apagada, un visitante nuevo recibe el respaldo y su solicitud queda sin asesora; R6 Pía da acceso al portal desde la ficha y el cliente entra por
  `POST /api/portal/ingresar` con ese código (200 y cookie) y lee `GET /api/portal/estado`; R7 la dueña publica una guía con su sesión, sale en `web.guias` y
  queda `guias` en `interno.web_revalidar_pendiente` (la web pública apagada: el job no la vacía); R8 la dueña recibe el repuesto desde la Cadena y el vehículo
  pasa de «Falta: Esperar a «Recibido».» a «Cumplido».
- **La siembra de la espera** de `repuestos-espera-recorrido.spec.ts` pasa a `e2e/soporte/repuestos-espera.ts` (sin cambiar aserciones).
- **Corridas** (base recién reseteada): la primera de escritorio cayó en R2 porque las asesoras no tenían `leads.crear` (el bloque de turnos de Inicio lo pide; D9:
  del spec, no del producto). Después, escritorio 8/8 y luego 20/20 con `repuestos-espera-recorrido`, `portal-api` y `web-turno`; movil 10/10 dos veces
  (recorrido 7 + espera 3). `scripts/guardas` 37 archivos, 1.147 en verde; `typecheck` limpio.
- **Docs:** ficha de `web` sin «no está programado todavía» del job de expirar (lo programó el 8.04-1), sin la viñeta repetida del portal ni el «`cola` todavía
  vacío»; GLOSARIO con «Disponible», «Ficha pública» y «Movimiento de stock» (los otros cuatro términos de la fila ya estaban); UX con «Sitio web (config)»,
  «Cola web (config)», «Perfil» al día, la Cadena, el panel del ítem, «Pagos», el hueco «Repuestos» del vehículo y los bloques de Inicio, sin filas repetidas
  (D5). Consolidados los docs de paso pendientes (8.05, 8.12, 8.13 y los de la Fase 9).
- **Sin arreglos de producto** ni inestables.
- e2e completo: no (8.14-1, Nivel 1: el recorrido en escritorio y movil y los dirigidos; el completo con los dos proyectos lo corre el 8.14-2)
