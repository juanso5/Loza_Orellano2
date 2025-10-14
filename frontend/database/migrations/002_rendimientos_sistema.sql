-- =========================================
-- MIGRACIÓN: Sistema de Rendimientos y Origen de Liquidez
-- Fecha: 2025-10-13
-- =========================================

-- PASO 1: Agregar columna 'origen' a asignacion_liquidez
-- =========================================
ALTER TABLE asignacion_liquidez 
ADD COLUMN IF NOT EXISTS origen VARCHAR(30) DEFAULT 'manual';

COMMENT ON COLUMN asignacion_liquidez.origen IS 
  'Origen de la asignación: manual, compra_automatica, venta_automatica';

-- Actualizar registros existentes basándose en el comentario
UPDATE asignacion_liquidez 
SET origen = 'compra_automatica'
WHERE comentario LIKE 'Compra automática:%' 
  OR comentario LIKE 'Compra automática:%';

UPDATE asignacion_liquidez 
SET origen = 'venta_automatica'
WHERE comentario LIKE '%Recupero por venta%' 
  OR comentario LIKE 'Asignación automática: Recupero%';

-- Crear índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_asignacion_liquidez_origen 
ON asignacion_liquidez(origen);


-- PASO 2: Crear tabla fondo_snapshot para rendimientos mensuales
-- =========================================
CREATE TABLE IF NOT EXISTS fondo_snapshot (
  id_snapshot SERIAL PRIMARY KEY,
  fondo_id INTEGER NOT NULL REFERENCES fondo(id_fondo) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  
  -- Valores al cierre del período
  valor_especies NUMERIC(15,2) DEFAULT 0 CHECK (valor_especies >= 0),
  liquidez_asignada NUMERIC(15,2) DEFAULT 0 CHECK (liquidez_asignada >= 0),
  valor_total NUMERIC(15,2) GENERATED ALWAYS AS (valor_especies + liquidez_asignada) STORED,
  
  -- Flujos del período (solo manuales para TWR)
  depositos_periodo NUMERIC(15,2) DEFAULT 0 CHECK (depositos_periodo >= 0),
  extracciones_periodo NUMERIC(15,2) DEFAULT 0 CHECK (extracciones_periodo >= 0),
  flujo_neto NUMERIC(15,2) GENERATED ALWAYS AS (depositos_periodo - extracciones_periodo) STORED,
  
  -- Rendimientos calculados (TWR - Time Weighted Return)
  rendimiento_periodo NUMERIC(10,6), -- Rendimiento del mes (ej: 0.05 = 5%)
  rendimiento_acumulado NUMERIC(10,6), -- Rendimiento desde inception
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Restricciones
  CONSTRAINT fondo_snapshot_fecha_unique UNIQUE(fondo_id, fecha),
  CONSTRAINT rendimiento_valido CHECK (
    rendimiento_periodo >= -0.99 AND -- No más de -99% en un período
    rendimiento_periodo <= 10.0 -- No más de 1000% en un período (protección contra errores)
  )
);

-- Índices para consultas rápidas
CREATE INDEX idx_fondo_snapshot_fondo ON fondo_snapshot(fondo_id);
CREATE INDEX idx_fondo_snapshot_fecha ON fondo_snapshot(fecha DESC);
CREATE INDEX idx_fondo_snapshot_fondo_fecha ON fondo_snapshot(fondo_id, fecha DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_fondo_snapshot_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fondo_snapshot_timestamp
BEFORE UPDATE ON fondo_snapshot
FOR EACH ROW
EXECUTE FUNCTION update_fondo_snapshot_timestamp();

COMMENT ON TABLE fondo_snapshot IS 
  'Snapshots mensuales para cálculo de rendimientos TWR';
COMMENT ON COLUMN fondo_snapshot.rendimiento_periodo IS 
  'TWR del período: (Valor_Final - Valor_Inicial - Flujos) / Valor_Inicial';
COMMENT ON COLUMN fondo_snapshot.rendimiento_acumulado IS 
  'TWR acumulado: [(1+R1) × (1+R2) × ... × (1+Rn)] - 1';


-- PASO 3: Crear tabla fondo_valoracion_diaria (opcional)
-- =========================================
CREATE TABLE IF NOT EXISTS fondo_valoracion_diaria (
  id_valoracion SERIAL PRIMARY KEY,
  fondo_id INTEGER NOT NULL REFERENCES fondo(id_fondo) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  
  -- Valores al cierre del día
  valor_especies NUMERIC(15,2) DEFAULT 0,
  liquidez_disponible NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) GENERATED ALWAYS AS (valor_especies + liquidez_disponible) STORED,
  
  -- Retorno diario
  retorno_diario NUMERIC(10,8), -- Mayor precisión para retornos diarios
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fondo_valoracion_fecha_unique UNIQUE(fondo_id, fecha)
);

-- Índices
CREATE INDEX idx_fondo_valoracion_fondo ON fondo_valoracion_diaria(fondo_id);
CREATE INDEX idx_fondo_valoracion_fecha ON fondo_valoracion_diaria(fecha DESC);

COMMENT ON TABLE fondo_valoracion_diaria IS 
  'Valoraciones diarias de fondos para tracking detallado';


-- PASO 4: Funciones de utilidad
-- =========================================

-- Función para obtener el último snapshot de un fondo
CREATE OR REPLACE FUNCTION get_ultimo_snapshot(p_fondo_id INTEGER)
RETURNS TABLE (
  id_snapshot INTEGER,
  fecha DATE,
  valor_total NUMERIC,
  rendimiento_acumulado NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fs.id_snapshot,
    fs.fecha,
    fs.valor_total,
    fs.rendimiento_acumulado
  FROM fondo_snapshot fs
  WHERE fs.fondo_id = p_fondo_id
  ORDER BY fs.fecha DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener flujos manuales de un período
CREATE OR REPLACE FUNCTION get_flujos_manuales_periodo(
  p_fondo_id INTEGER,
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS TABLE (
  depositos NUMERIC,
  extracciones NUMERIC,
  neto NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN tipo_operacion = 'asignacion' THEN monto_usd ELSE 0 END), 0) as depositos,
    COALESCE(SUM(CASE WHEN tipo_operacion = 'desasignacion' THEN monto_usd ELSE 0 END), 0) as extracciones,
    COALESCE(SUM(CASE WHEN tipo_operacion = 'asignacion' THEN monto_usd ELSE -monto_usd END), 0) as neto
  FROM asignacion_liquidez
  WHERE fondo_id = p_fondo_id
    AND origen = 'manual'
    AND fecha >= p_fecha_inicio
    AND fecha <= p_fecha_fin;
END;
$$ LANGUAGE plpgsql;


-- PASO 5: Vistas útiles
-- =========================================

-- Vista: Rendimientos anuales por fondo
CREATE OR REPLACE VIEW v_rendimientos_anuales AS
SELECT 
  f.id_fondo,
  tc.descripcion as tipo_cartera,
  EXTRACT(YEAR FROM fs.fecha) as año,
  COUNT(*) as meses_con_data,
  AVG(fs.rendimiento_periodo) as rendimiento_promedio_mensual,
  ((1 + AVG(fs.rendimiento_periodo))^12 - 1) as rendimiento_anualizado_estimado,
  SUM(fs.depositos_periodo) as depositos_anuales,
  SUM(fs.extracciones_periodo) as extracciones_anuales,
  MAX(fs.valor_total) as valor_maximo,
  MIN(fs.valor_total) as valor_minimo,
  (SELECT valor_total FROM fondo_snapshot WHERE fondo_id = f.id_fondo ORDER BY fecha DESC LIMIT 1) as valor_actual
FROM fondo f
JOIN tipo_cartera tc ON f.tipo_cartera_id = tc.id_tipo_cartera
LEFT JOIN fondo_snapshot fs ON f.id_fondo = fs.fondo_id
GROUP BY f.id_fondo, tc.descripcion, EXTRACT(YEAR FROM fs.fecha);

COMMENT ON VIEW v_rendimientos_anuales IS 
  'Resumen de rendimientos anuales por fondo';


-- Vista: Estado actual de todos los fondos
CREATE OR REPLACE VIEW v_estado_fondos AS
WITH ultimo_snapshot AS (
  SELECT DISTINCT ON (fondo_id)
    fondo_id,
    fecha,
    valor_especies,
    liquidez_asignada,
    valor_total,
    rendimiento_acumulado
  FROM fondo_snapshot
  ORDER BY fondo_id, fecha DESC
)
SELECT 
  f.id_fondo,
  f.cliente_id,
  c.nombre as cliente_nombre,
  tc.descripcion as tipo_cartera,
  tc.categoria,
  us.fecha as ultima_valoracion,
  us.valor_especies,
  us.liquidez_asignada,
  us.valor_total,
  us.rendimiento_acumulado,
  CASE 
    WHEN us.rendimiento_acumulado > 0 THEN 'positivo'
    WHEN us.rendimiento_acumulado < 0 THEN 'negativo'
    ELSE 'neutro'
  END as estado_rendimiento
FROM fondo f
JOIN cliente c ON f.cliente_id = c.id_cliente
JOIN tipo_cartera tc ON f.tipo_cartera_id = tc.id_tipo_cartera
LEFT JOIN ultimo_snapshot us ON f.id_fondo = us.fondo_id;

COMMENT ON VIEW v_estado_fondos IS 
  'Estado actual de todos los fondos con última valoración';


-- PASO 6: Verificación de la migración
-- =========================================

-- Verificar que la columna origen existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'asignacion_liquidez' 
    AND column_name = 'origen'
  ) THEN
    RAISE EXCEPTION 'ERROR: Columna origen no fue creada en asignacion_liquidez';
  END IF;
  
  RAISE NOTICE 'OK: Columna origen existe en asignacion_liquidez';
END $$;

-- Verificar que las tablas existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fondo_snapshot') THEN
    RAISE EXCEPTION 'ERROR: Tabla fondo_snapshot no fue creada';
  END IF;
  
  RAISE NOTICE 'OK: Tabla fondo_snapshot existe';
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fondo_valoracion_diaria') THEN
    RAISE EXCEPTION 'ERROR: Tabla fondo_valoracion_diaria no fue creada';
  END IF;
  
  RAISE NOTICE 'OK: Tabla fondo_valoracion_diaria existe';
END $$;

-- Mostrar resumen de migración
SELECT 
  'Resumen de Migración' as titulo,
  (SELECT COUNT(*) FROM asignacion_liquidez) as total_asignaciones,
  (SELECT COUNT(*) FROM asignacion_liquidez WHERE origen = 'manual') as asignaciones_manuales,
  (SELECT COUNT(*) FROM asignacion_liquidez WHERE origen = 'compra_automatica') as compras_automaticas,
  (SELECT COUNT(*) FROM asignacion_liquidez WHERE origen = 'venta_automatica') as ventas_automaticas;

-- =========================================
-- FIN DE MIGRACIÓN
-- =========================================
