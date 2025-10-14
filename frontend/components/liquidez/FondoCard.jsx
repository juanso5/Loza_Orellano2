"use client";

export default function FondoCard({ fondo, onAsignar }) {
  const { 
    id_fondo, 
    tipo_cartera, 
    liquidez_asignada, 
    saldo_disponible, 
    progreso_porcentaje, 
    valor_total_fondo,
    rendimiento_porcentaje 
  } = fondo;

  const color = tipo_cartera?.color || '#8b5cf6';
  const nombre = tipo_cartera?.descripcion || 'Sin nombre';
  const icono = tipo_cartera?.icono || 'fas fa-chart-line';

  return (
    <div className="fondo-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="fondo-header">
        <div className="fondo-name">
          <i className={icono} style={{ marginRight: 8, color }}></i>
          {nombre}
        </div>
      </div>

      <div className="fondo-stats">
        <div className="stat-item">
          <span className="stat-label">Liquidez Asignada</span>
          <span className="stat-value">${liquidez_asignada?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Saldo Disponible</span>
          <span className="stat-value success">${saldo_disponible?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Valor Total</span>
          <span className="stat-value">${valor_total_fondo?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Rendimiento</span>
          <span className={`stat-value ${rendimiento_porcentaje >= 0 ? 'success' : 'danger'}`}>
            {rendimiento_porcentaje >= 0 ? '+' : ''}{rendimiento_porcentaje?.toFixed(2) || '0.00'}%
          </span>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-info">
          <span className="progress-label">Progreso</span>
          <span className="progress-value">{progreso_porcentaje?.toFixed(0) || '0'}%</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${Math.min(100, progreso_porcentaje || 0)}%`,
              backgroundColor: color 
            }}
          ></div>
        </div>
      </div>

      <button 
        className="btn primary btn-sm" 
        onClick={() => onAsignar(fondo)}
        style={{ marginTop: '12px', width: '100%' }}
      >
        <i className="fas fa-hand-holding-usd"></i> Asignar Liquidez
      </button>
    </div>
  );
}
