## 2026-11-12 · Decisiones del paso 8.05-2 (la disponibilidad y la ficha en `/perfil`)

- **D11** · El identificador (`handle`) se pasa a minúsculas y pide 3 a 30 caracteres de `a-z0-9._-`, sin signo en los bordes; la base sólo pide unicidad. Lo más
  conservador y reversible: aflojarlo no pide migración.
- **D12** · Con «Ver como» el interruptor y la ficha quedan de sólo lectura con «Estás mirando como otro rol…»: escribirían en la cuenta real de la dueña.
- **D13** · «Aparecer en la web» sin WhatsApp lo rechaza el formulario («Para aparecer en la web necesitas tu WhatsApp.»); la base no lo exige.
- **D14** · Si el motivo del interruptor es «Tu rol no recibe turnos de la web.», el texto de «Turnos de la web» no lo repite (los e2e de `rueda-por-rol` buscan esa frase una vez).
- **D15** · El formulario de la ficha se pide con `diferido()` al abrir su bloque: montado de entrada, el documento de `/perfil` pasaba de 103 a 115,9 KB (12 % sobre el
  tope); diferido, 107,0 KB. El tope sube a 113 KB (lo medido más un 5 %).
- **D16** · La versión de la ficha es `perfiles.actualizado_en`, la misma de «Tus datos»: `/perfil` le pone esa `key` a los dos formularios para que guardar uno vuelva a
  montar el otro (el bloque de la ficha, que no lleva la `key`, no se cierra al guardar).
