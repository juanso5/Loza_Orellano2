// components/ClientDetail.jsx
import React from 'react';

const ClientDetail = ({ client, onAddPortfolio, onDeleteMovement, onOpenPortfolioDetail }) => {
  const totalClient = client.portfolios.reduce((acc, p) => acc + p.funds.reduce((s, f) => s + (f.nominal || 0), 0), 0);
  const money = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
  const formatNumber = (n) => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const fmtDate = (s) => {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const weighted = (arr, key) => {
    const tot = arr.reduce((s, a) => s + (a.nominal || 0), 0);
    if (tot <= 0) return 0;
    return arr.reduce((s, a) => s + ((a[key] || 0) * (a.nominal || 0)), 0) / tot;
  };

  const sortedMovements = client.movements.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);

  return (
    <div className="client-panel">
      <div className="client-header">
        <div>
          <h2 id="client-name"><i className="fas fa-user"></i> {client.name}</h2>
          <div id="client-meta" className="client-meta muted">{client.description || 'Resumen del cliente'}</div>
        </div>
        <div className="client-summary">
          <div className="summary-item muted">Patrimonio total</div>
          <div id="client-total" className="big-number">{money(totalClient)}</div>
        </div>
      </div>

      <div className="section-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 18px' }}>
        <h3 className="section-title" style={{ margin: '18px 0 8px 0' }}>Carteras</h3>
        <div className="portfolio-actions" style={{ margin: '18px 0 8px 0' }}>
          <button className="btn-add alt" onClick={onAddPortfolio}>
            <i className="fas fa-folder-plus"></i> Agregar Fondo
          </button>
        </div>
      </div>

      <div id="carteras-grid" className="carteras-grid" aria-label="Carteras del cliente">
        {client.portfolios.map((p) => {
          const totalNom = p.funds.reduce((s, f) => s + (f.nominal || 0), 0);
          const percent = totalClient > 0 ? (totalNom / totalClient * 100) : 0;
          const monthly = weighted(p.funds, 'monthlyReturn');
          const totalReturn = weighted(p.funds, 'totalReturn');
          
          // Metadata de la cartera
          const metadata = p.meta?.metadata;
          const categoria = p.meta?.tipo_cartera?.categoria;
          const color = p.meta?.tipo_cartera?.color || '#8b5cf6';
          const icono = p.meta?.tipo_cartera?.icono || 'fas fa-chart-line';

          return (
            <div 
              key={p.id} 
              className="cartera-card" 
              onClick={() => onOpenPortfolioDetail(p.id)}
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <div className="cartera-top">
                <div>
                  <div className="cartera-name">
                    <i className={icono} style={{ marginRight: 8 }}></i>
                    {p.name}
                  </div>
                  
                  {/* Metadata específica por estrategia */}
                  {metadata && categoria === 'jubilacion' && (
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      🎯 Objetivo: {metadata.edad_objetivo} años | Aporte: ${Number(metadata.aporte_mensual || 0).toFixed(0)}/mes
                    </div>
                  )}
                  {metadata && categoria === 'largo_plazo' && (
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      📈 Largo plazo {metadata.permite_acciones && '| Acciones permitidas'}
                      {metadata.descripcion && ` | ${metadata.descripcion}`}
                    </div>
                  )}
                  {metadata && categoria === 'Viajes' && (
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      ✈️ Meta: ${Number(metadata.monto_objetivo || 0).toLocaleString('es-AR')} | {metadata.descripcion}
                    </div>
                  )}
                  {metadata && categoria === 'objetivo' && (
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      🎯 ${Number(metadata.monto_objetivo || 0).toLocaleString('es-AR')} - {metadata.descripcion} | {fmtDate(metadata.fecha_objetivo)}
                    </div>
                  )}
                  {!metadata && (
                    <div className="muted">Periodo objetivo: <strong>{p.periodMonths}</strong> meses</div>
                  )}
                </div>
                <div className="cartera-percent">{percent.toFixed(1)}%</div>
              </div>
              <div className="returns">
                <div className="item"><div className="muted">Rend. mensual</div><div className="value">{(monthly * 100).toFixed(2)}%</div></div>
                <div className="item"><div className="muted">Rend. total</div><div className="value">{(totalReturn * 100).toFixed(2)}%</div></div>
                <div className="item"><div className="muted">Nominal</div><div className="value">{formatNumber(totalNom)}</div></div>
              </div>
              
              {/* Liquidez */}
              {p.liquidez && (
                <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: 6, border: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span className="muted">💰 Liquidez:</span>
                    <span style={{ fontWeight: 600, color: '#15803d' }}>
                      ${p.liquidez.saldoDisponible?.toFixed(2) || '0.00'} USD
                    </span>
                  </div>
                  {p.liquidez.liquidezAsignada > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
                      Asignada: ${p.liquidez.liquidezAsignada?.toFixed(2)} | Invertida: {p.liquidez.porcentajeInvertido || 0}%
                    </div>
                  )}
                </div>
              )}
              <div className="period" style={{ marginTop: '8px' }}>
                <div className="muted">Progreso periodo</div>
                <div className="progress-wrap">
                  <div className="progress-bar" style={{ width: `${Math.min(100, Math.round((p.progress || 0) * 100))}%`, backgroundColor: color }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="section-title">Últimos movimientos</h3>
      <div className="movements-card card">
        <div className="card-body">
          <table className="movements-table table" id="movements-table" role="table">
            <thead>
              <tr>
                <th><i className="fas fa-calendar-alt"></i> Fecha</th>
                <th><i className="fas fa-exchange-alt"></i> Tipo</th>
                <th><i className="fas fa-seedling"></i> Especie</th>
                <th><i className="fas fa-wallet"></i> Cartera</th>
                <th className="right"><i className="fas fa-money-bill-wave"></i> Monto (unidades)</th>
                <th aria-hidden="true"><i className="fas fa-cog"></i></th>
              </tr>
            </thead>
            <tbody>
              {sortedMovements.map((m) => (
                <tr key={m.id}>
                  <td>{fmtDate(m.date)}</td>
                  <td>{m.type}</td>
                  <td>{m.fund}</td>
                  <td>{m.portfolio}</td>
                  <td className="right">{formatNumber(m.amount)}</td>
                  <td>
                    <button className="btn-delete-mov" onClick={() => onDeleteMovement(m.id)} title="Eliminar movimiento">
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;