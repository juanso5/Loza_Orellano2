-- ================================================
-- Migración 004: Vistas para Tenencias de Fondos
-- ================================================
-- Fecha: 2025-10-14
-- Descripción: Crea vistas para calcular posiciones actuales
--              de especies por fondo con valorización
-- ================================================

-- ================================================
-- Vista 1: v_tenencias_fondo
-- Calcula la posición actual (neta) de cada especie por fondo
-- ================================================
CREATE OR REPLACE VIEW v_tenencias_fondo AS
SELECT 
  m.fondo_id,
  m.tipo_especie_id,
  te.nombre as especie_nombre,
  -- Cantidad actual = compras - ventas
  SUM(CASE 
    WHEN m.tipo_mov = 'compra' THEN m.nominal 
    WHEN m.tipo_mov = 'venta' THEN -m.nominal 
    ELSE 0 
  END) as cantidad_actual,
  -- Precio promedio de compra (solo compras)
  AVG(CASE 
    WHEN m.tipo_mov = 'compra' THEN m.precio_usd 
    ELSE NULL 
  END) as precio_promedio_compra,
  -- Estadísticas adicionales
  COUNT(*) as total_movimientos,
  MAX(m.fecha_alta) as ultima_operacion,
  MIN(m.fecha_alta) as primera_operacion
FROM movimiento m
JOIN tipo_especie te ON m.tipo_especie_id = te.id_tipo_especie
GROUP BY m.fondo_id, m.tipo_especie_id, te.nombre
-- Solo mostrar especies con posición positiva (que aún se tienen)
HAVING SUM(CASE 
  WHEN m.tipo_mov = 'compra' THEN m.nominal 
  WHEN m.tipo_mov = 'venta' THEN -m.nominal 
  ELSE 0 
END) > 0;

-- Comentario de la vista
COMMENT ON VIEW v_tenencias_fondo IS 'Calcula posiciones actuales de especies por fondo (compras - ventas)';

-- ================================================
-- Vista 2: v_tenencias_valoradas
-- Agrega precio actual y cálculos de valorización
-- ================================================
CREATE OR REPLACE VIEW v_tenencias_valoradas AS
SELECT 
  t.fondo_id,
  t.tipo_especie_id,
  t.especie_nombre,
  t.cantidad_actual,
  t.precio_promedio_compra,
  t.total_movimientos,
  t.ultima_operacion,
  t.primera_operacion,
  -- Precio actual (último disponible)
  p.precio as precio_actual,
  p.fecha as fecha_precio,
  -- Valorización
  (t.cantidad_actual * COALESCE(p.precio, 0)) as valor_total_usd,
  -- Rendimiento porcentual
  CASE 
    WHEN t.precio_promedio_compra > 0 AND p.precio IS NOT NULL THEN
      ((p.precio - t.precio_promedio_compra) / t.precio_promedio_compra * 100)
    ELSE 0
  END as rendimiento_porcentaje,
  -- Ganancia/Pérdida en USD
  CASE 
    WHEN p.precio IS NOT NULL THEN
      (t.cantidad_actual * (p.precio - COALESCE(t.precio_promedio_compra, 0)))
    ELSE 0
  END as ganancia_perdida_usd
FROM v_tenencias_fondo t
-- LEFT JOIN para obtener el precio más reciente de cada especie
LEFT JOIN LATERAL (
  SELECT precio, fecha
  FROM precio_especie
  WHERE tipo_especie_id = t.tipo_especie_id
  ORDER BY fecha DESC
  LIMIT 1
) p ON true;

-- Comentario de la vista
COMMENT ON VIEW v_tenencias_valoradas IS 'Tenencias con precios actuales y cálculo de ganancia/pérdida';

-- ================================================
-- Índices recomendados para mejor performance
-- ================================================
-- Si no existen estos índices, crear:

-- Índice para mejorar consultas por fondo_id en movimiento
CREATE INDEX IF NOT EXISTS idx_movimiento_fondo_id 
ON movimiento(fondo_id);

-- Índice para mejorar consultas por tipo_especie_id en movimiento
CREATE INDEX IF NOT EXISTS idx_movimiento_tipo_especie_id 
ON movimiento(tipo_especie_id);

-- Índice para mejorar consultas de precio_especie por especie y fecha
CREATE INDEX IF NOT EXISTS idx_precio_especie_tipo_fecha 
ON precio_especie(tipo_especie_id, fecha DESC);

-- ================================================
-- Verificación de datos
-- ================================================
-- Descomentar las siguientes queries para verificar:

-- Ver ejemplo de tenencias de un fondo específico:
-- SELECT * FROM v_tenencias_fondo WHERE fondo_id = 1;

-- Ver ejemplo de tenencias valoradas:
-- SELECT * FROM v_tenencias_valoradas WHERE fondo_id = 1;

-- Contar total de tenencias actuales:
-- SELECT COUNT(*) as total_tenencias FROM v_tenencias_fondo;

-- Ver resumen por fondo:
-- SELECT 
--   fondo_id,
--   COUNT(*) as especies_activas,
--   SUM(valor_total_usd) as valor_total
-- FROM v_tenencias_valoradas
-- GROUP BY fondo_id
-- ORDER BY fondo_id;
