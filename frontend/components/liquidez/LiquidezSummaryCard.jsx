"use client";

export default function LiquidezSummaryCard({ estado, loading }) {
  if (loading) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
            padding: '1.5rem' 
          }}>
            <div style={{ 
              height: '1rem', 
              backgroundColor: '#e5e7eb', 
              borderRadius: '4px', 
              width: '75%', 
              marginBottom: '1rem',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}></div>
            <div style={{ 
              height: '2rem', 
              backgroundColor: '#e5e7eb', 
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (!estado) return null;

  const cards = [
    {
      title: 'Liquidez Total',
      value: estado.liquidezTotal || estado.total_usd,
      iconClass: 'fas fa-coins',
      color: '#3b82f6',
      bgColor: '#dbeafe',
      description: 'Pool completo del cliente'
    },
    {
      title: 'Liquidez Asignada',
      value: estado.liquidezAsignada || estado.asignada_usd,
      iconClass: 'fas fa-chart-pie',
      color: '#10b981',
      bgColor: '#d1fae5',
      percentage: estado.porcentajeAsignado || Math.round((estado.asignada_usd / estado.total_usd) * 100) || 0,
      description: 'Distribuida a fondos'
    },
    {
      title: 'Liquidez Disponible',
      value: estado.liquidezDisponible || estado.disponible_usd,
      iconClass: 'fas fa-money-bill-wave',
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      description: 'Pendiente de asignar'
    },
    {
      title: 'Total Depósitos',
      value: estado.totalDepositos || estado.depositos_usd,
      iconClass: 'fas fa-piggy-bank',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      description: 'Histórico de ingresos'
    }
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '1rem', 
      marginBottom: '2rem' 
    }}>
      {cards.map((card, index) => (
        <div 
          key={index} 
          style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
            padding: '1.5rem',
            transition: 'box-shadow 0.2s, transform 0.2s',
            cursor: 'default'
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ 
              padding: '0.75rem', 
              borderRadius: '8px', 
              backgroundColor: card.bgColor,
              fontSize: '1.5rem',
              color: card.color
            }}>
              <i className={card.iconClass}></i>
            </div>
            {card.percentage !== undefined && (
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>
                {card.percentage}%
              </span>
            )}
          </div>
          <h3 style={{ 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#6b7280', 
            marginBottom: '0.25rem',
            margin: 0
          }}>
            {card.title}
          </h3>
          <p style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: card.color,
            margin: '0.5rem 0'
          }}>
            ${card.value?.toFixed(2) || '0.00'}
          </p>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#9ca3af', 
            margin: '0.5rem 0 0 0'
          }}>
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
}
