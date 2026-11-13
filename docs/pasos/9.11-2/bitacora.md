## Paso 9.11-2 · Tablero: los widgets del margen del mes y la cola web (2026-11-12)

- **«Margen del mes»** (`logistica.margen.ver`): lee `tablero_margen`; el monto por `<Monto>` en un grupo que se llama sólo «Margen del mes» (D12: el
  Modo Live lo oculta entero), nulo «Sin venta registrada»; nota con venta, real y cotizado, «N vehículos por su último pago confirmado» (D17) y
  «N vehículos sin venta registrada». `components/cifra-de-monto.tsx` nuevo.
- **«Cola de la web»** (`web.cola.gestionar`, ancho): lee `tablero_cola_web`; «Turnos», «Tasa de contacto» y «Mediana hasta Contacté» sin los directos,
  la cuenta por estado y el ranking «Turnos por persona» con «Ver como tabla»; vacío «Todavía no hay turnos de la web en este período».
- Contrato Zod de las dos RPC en `entities/metricas.ts` con su test; catálogo con los permisos verdaderos (sin huecos); `HUECO` fuera del registro;
  ficha, `docs/UX.md` y `docs/RENDIMIENTO.md` (`/tablero`: cuatro RPC por carga).
- **Pruebas:** vitest de esquemas, catálogo y textos (`src/modules/tablero`, 71 ✓); `e2e/tablero.spec.ts` T7 (escritorio): confirmar un pago de 1500 sube
  el margen exactamente 150000 centavos y el nombre del grupo no lleva dígitos. T6 en `movil` esperaba mal el fin de «Restablecer» (carrera de la
  prueba, aflorada por los dos widgets nuevos): arreglado. `e2e/soporte/dinero.ts` gana `borrarDineroDeEsteOrigen` (D19). Salidas en
  `.piloto/salidas/9.11-2/`.
- **Cómo se anota en `docs/PLAN.md`:** la 9.11-2 queda hecha con «los widgets de margen del mes y cola web en `/tablero`»; el 9.11 se cierra (el «Terminado
  cuando» de la fase en lo del tablero: conversión, cola web y margen del mes).
- e2e completo: no (9.11-2, Nivel 2: sin e2e completo, lo prueba el CI del PR; dirigidos: tablero en escritorio y movil)
