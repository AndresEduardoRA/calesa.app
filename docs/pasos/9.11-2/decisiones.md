# 9.11-2 · Tablero: los widgets del margen del mes y la cola web (2026-11-12)

- **D12 · El nombre del grupo del margen no lleva el monto.** `CifraDelWidget` pone el valor en el `aria-label`: con un monto, el Modo Live lo dejaría en
  el árbol de accesibilidad. El margen va en `CifraDeMonto` (grupo «Margen del mes», el monto por `<Monto>`); nulo, `CifraDelWidget` con «Sin venta
  registrada», que no es dinero. Reversible.
- **D13 · `TEXTO_SIN_VENTA` propio del tablero**, con el mismo texto que logística: `SIN_VENTA_REGISTRADA` no sale por la entrada de `logistica` y abrirla
  por una cadena no vale un cambio en otro módulo.
- **D14 · «Turnos», no «Solicitudes»**, en el widget de la cola: el glosario llama **Turno web** a la fila de `solicitudes_contacto_web`. El título sigue
  «Cola de la web».
- **D15 · El caso T7 lo hace entero la dueña** (registra y confirma el pago): `pago_confirmar` no impide confirmar un pago propio y así el caso no depende
  de dos sesiones.
- **D16 · T7 no siembra gasto:** la diferencia esperada es el pago. La resta pago − gasto al centavo la prueba R1 de `margen-y-cola.sql` (9.11-1).
- **D17 · El margen se dibuja sin «mes cerrado»:** la nota dice que cada vehículo cuenta por su último pago confirmado (consecuencia de D3 de la 9.11-1).
- **D18 · `mediana_minutos` sin `min(0)` en el esquema:** un turno con `contactada_en` anterior a `asignada_en` tumbaría el widget entero; la RPC no lo
  acota y un número raro se ve, no esconde las demás cifras.
- **D19 · `borrarDineroDeEsteOrigen`** en `e2e/soporte/dinero.ts`: `borrarDinero` barre todos los orígenes `e2e_%` y no convive con un terreno que tiene
  cotizaciones vivas (el de la final en `tablero.spec.ts`).
