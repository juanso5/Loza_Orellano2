"use client";

/**
 * RendimientoCard - Muestra el rendimiento de un fondo individual
 * Similar al diseño de FondoCard de liquidez pero enfocado en métricas de performance
 */
export default function RendimientoCard({ fondo }) {
  // Determinar si el rendimiento es positivo o negativo
  const esPositivo = fondo.twr >= 0;
  const esGanancia = fondo.ganancia >= 0;

  // Formato de números con separador de miles
  const formatMoney = (num) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Formato de porcentaje
  const formatPercent = (num) => {
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  // Colores según estrategia (igual que en fondos)
  const getEstrategiaColor = (estrategia) => {
    switch (estrategia?.toLowerCase()) {
      case 'jubilacion':
        return '#8b5cf6'; // Púrpura
      case 'viajes':
        return '#3b82f6'; // Azul
      case 'largo_plazo':
        return '#10b981'; // Verde
      case 'objetivo':
        return '#f59e0b'; // Ámbar
      default:
        return '#6b7280'; // Gris
    }
  };

  const estrategiaColor = getEstrategiaColor(fondo.estrategia);

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header con nombre y estrategia */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: estrategiaColor,
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
            }}
          >
            {fondo.nombre}
          </h3>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          <i className="fas fa-chart-line" style={{ marginRight: '0.25rem' }} />
          {fondo.estrategia === 'jubilacion' && 'Jubilación'}
          {fondo.estrategia === 'viajes' && 'Viajes'}
          {fondo.estrategia === 'largo_plazo' && 'Largo Plazo'}
          {fondo.estrategia === 'objetivo' && 'Objetivo'}
          {!['jubilacion', 'viajes', 'largo_plazo', 'objetivo'].includes(fondo.estrategia) && 'General'}
        </div>
      </div>

      {/* Rendimiento principal (TWR) */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: esPositivo ? '#f0fdf4' : '#fef2f2',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: `2px solid ${esPositivo ? '#86efac' : '#fca5a5'}`,
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.25rem' }}>
          RENDIMIENTO (TWR)
        </div>
        <div
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: esPositivo ? '#15803d' : '#dc2626',
          }}
        >
          {formatPercent(fondo.twr)}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
          {esGanancia ? 'Ganancia: ' : 'Pérdida: '}
          <span style={{ fontWeight: '600', color: esGanancia ? '#15803d' : '#dc2626' }}>
            {formatMoney(Math.abs(fondo.ganancia))}
          </span>
        </div>
      </div>

      {/* Métricas en grid 2x2 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {/* Valor Inicial */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.25rem' }}>
            VALOR INICIAL
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
            {formatMoney(fondo.valorInicial)}
          </div>
        </div>

        {/* Valor Final */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.25rem' }}>
            VALOR FINAL
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
            {formatMoney(fondo.valorFinal)}
          </div>
        </div>

        {/* Flujos Netos */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.25rem' }}>
            FLUJOS NETOS
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: fondo.flujos.neto >= 0 ? '#10b981' : '#f59e0b' }}>
            {formatMoney(fondo.flujos.neto)}
          </div>
        </div>

        {/* Liquidez Final */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.25rem' }}>
            LIQUIDEZ
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
            {formatMoney(fondo.liquidezFinal)}
          </div>
        </div>
      </div>

      {/* Desglose de flujos (depósitos/extracciones) */}
      {(fondo.flujos.depositos > 0 || fondo.flujos.extracciones > 0) && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: '#6b7280' }}>
              <i className="fas fa-arrow-down" style={{ color: '#10b981', marginRight: '0.25rem' }} />
              Depósitos:
            </span>
            <span style={{ fontWeight: '600', color: '#10b981' }}>
              {formatMoney(fondo.flujos.depositos)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>
              <i className="fas fa-arrow-up" style={{ color: '#dc2626', marginRight: '0.25rem' }} />
              Extracciones:
            </span>
            <span style={{ fontWeight: '600', color: '#dc2626' }}>
              {formatMoney(fondo.flujos.extracciones)}
            </span>
          </div>
        </div>
      )}

      {/* Distribución valor final */}
      {fondo.especiesValor > 0 && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
            DISTRIBUCIÓN
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6b7280' }}>Especies</div>
              <div style={{ fontWeight: '600', color: '#3b82f6' }}>
                {formatMoney(fondo.especiesValor)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {((fondo.especiesValor / fondo.valorFinal) * 100).toFixed(1)}%
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6b7280' }}>Efectivo</div>
              <div style={{ fontWeight: '600', color: '#10b981' }}>
                {formatMoney(fondo.liquidezFinal)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {((fondo.liquidezFinal / fondo.valorFinal) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
