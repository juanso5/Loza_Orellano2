"use client";

import { useState, useEffect } from "react";
import SidebarProvider from "../../components/SidebarProvider";
import LiquidezSummaryCard from "../../components/liquidez/LiquidezSummaryCard";
import FondoCard from "../../components/liquidez/FondoCard";
import MovimientoModal from "../../components/liquidez/MovimientoModal";
import AsignacionModal from "../../components/liquidez/AsignacionModal";
import { useAppData } from "../../components/AppDataProvider";
import "../../styles/liquidez.css";

export default function LiquidezPage() {
  const { clientes, selectedClientId, setSelectedClientId, liquidez: estadoLiquidez, loading, error, refreshAll } = useAppData();
  const [searchQuery, setSearchQuery] = useState("");
  const [movimientosLiquidez, setMovimientosLiquidez] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  useEffect(() => {
    if (!selectedClientId) {
      setMovimientosLiquidez([]);
      return;
    }
    setLoadingMovimientos(true);
    fetch(`/api/liquidez?cliente_id=${selectedClientId}&limit=20`, { cache: 'no-store' })
      .then(r => r.json())
      .then(json => { if (json.success) setMovimientosLiquidez(json.data || []); })
      .catch(err => console.error('Error:', err))
      .finally(() => setLoadingMovimientos(false));
  }, [selectedClientId]);
  
  const [modalState, setModalState] = useState({ movimiento: { isOpen: false, tipo: "deposito" }, asignacion: { isOpen: false, fondo: null } });
  
  const openMovimientoModal = (tipo) => setModalState(prev => ({ ...prev, movimiento: { isOpen: true, tipo } }));
  const closeMovimientoModal = () => setModalState(prev => ({ ...prev, movimiento: { isOpen: false, tipo: "deposito" } }));
  const openAsignacionModal = (fondo) => setModalState(prev => ({ ...prev, asignacion: { isOpen: true, fondo } }));
  const closeAsignacionModal = () => setModalState(prev => ({ ...prev, asignacion: { isOpen: false, fondo: null } }));
  
  const handleMovimientoSave = async () => {
    await refreshAll();
    if (selectedClientId) {
      const res = await fetch(`/api/liquidez?cliente_id=${selectedClientId}&limit=20`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setMovimientosLiquidez(json.data || []);
    }
    closeMovimientoModal();
  };
  
  const handleAsignacionSave = async () => {
    await refreshAll();
    if (selectedClientId) {
      const res = await fetch(`/api/liquidez?cliente_id=${selectedClientId}&limit=20`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setMovimientosLiquidez(json.data || []);
    }
    closeAsignacionModal();
  };

  const clienteActual = clientes.find(c => c.id === selectedClientId);
  const filteredClientes = clientes.filter((c) => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SidebarProvider>
      <div className="main-content">
        {/* Panel de clientes estilo Fondos */}
        <div style={{ 
          width: '300px', 
          backgroundColor: '#f9fafb', 
          borderRight: '1px solid #e5e7eb', 
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>Clientes</h2>
            <input 
              type="text" 
              placeholder="🔍 Buscar cliente..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: '0.625rem 0.875rem', 
                border: '1px solid #d1d5db', 
                borderRadius: '8px', 
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {loading.clientes ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  border: '3px solid #e5e7eb', 
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 0.5rem'
                }}></div>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>Cargando...</p>
              </div>
            ) : filteredClientes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>No hay clientes</p>
              </div>
            ) : (
              filteredClientes.map((c) => {
                const isSelected = c.id === selectedClientId;
                const initials = c.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
                
                return (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedClientId(c.id)}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem',
                      cursor: 'pointer', 
                      borderRadius: '8px', 
                      marginBottom: '0.5rem',
                      backgroundColor: isSelected ? '#eff6ff' : '#fff',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 1px 3px rgba(59, 130, 246, 0.1)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#fff';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#3b82f6' : '#e5e7eb',
                      color: isSelected ? '#fff' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: isSelected ? '600' : '500',
                        fontSize: '0.9375rem',
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {c.name}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#6b7280',
                        marginTop: '2px'
                      }}>
                        💰 Liquidez
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ color: '#3b82f6', fontSize: '1rem', fontWeight: 'bold' }}>✓</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="content-panel">
          <div className="page-header">
            <div>
              <h1 className="page-title">💰 Gestión de Liquidez</h1>
              {clienteActual && <p className="page-subtitle">{clienteActual.name}</p>}
            </div>
            <div className="action-buttons">
              <button className="btn primary" onClick={() => openMovimientoModal("deposito")} disabled={!selectedClientId || loading.liquidez}>➕ Nuevo Depósito</button>
              <button className="btn danger" onClick={() => openMovimientoModal("extraccion")} disabled={!selectedClientId || loading.liquidez}>➖ Nueva Extracción</button>
            </div>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}
          {loading.liquidez && <div className="loading-container"><div className="spinner"></div><p>Cargando datos de liquidez...</p></div>}

          {!loading.liquidez && selectedClientId && (
            <>
              <LiquidezSummaryCard estado={estadoLiquidez} loading={loading.liquidez} />
              {estadoLiquidez?.fondos && estadoLiquidez.fondos.length > 0 && (
                <div className="section">
                  <h2 className="section-title">📊 Fondos del Cliente</h2>
                  <div className="fondos-grid">
                    {estadoLiquidez.fondos.map((fondo) => (<FondoCard key={fondo.id_fondo} fondo={{ ...fondo, dineroEnAcciones: fondo.dineroInvertido }} onAsignar={openAsignacionModal} />))}
                  </div>
                </div>
              )}
              {movimientosLiquidez.length > 0 && (
                <div className="section">
                  <h2 className="section-title">📝 Últimos Movimientos</h2>
                  <div className="table-container">
                    <table className="data-table">
                      <thead><tr><th>Fecha</th><th>Tipo</th><th className="text-right">Monto</th><th>Moneda</th><th className="text-right">Monto USD</th><th>Comentario</th></tr></thead>
                      <tbody>
                        {movimientosLiquidez.map((mov) => (
                          <tr key={mov.id_mov_liq}>
                            <td>{new Date(mov.fecha).toLocaleDateString('es-AR')}</td>
                            <td><span className={`badge ${mov.tipo_mov === "deposito" ? "success" : "danger"}`}>{mov.tipo_mov === "deposito" ? "➕ Depósito" : "➖ Extracción"}</span></td>
                            <td className="text-right font-medium">${mov.monto.toFixed(2)}</td>
                            <td>{mov.moneda}</td>
                            <td className="text-right font-medium">${mov.monto_usd.toFixed(2)}</td>
                            <td className="text-muted">{mov.comentario || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {!loadingMovimientos && movimientosLiquidez.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <h3 className="empty-state-title">No hay movimientos registrados</h3>
                  <p className="empty-state-description">Crea un depósito para comenzar a gestionar la liquidez de {clienteActual?.name}</p>
                </div>
              )}
            </>
          )}

          {!loading.liquidez && !selectedClientId && (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <h3 className="empty-state-title">Selecciona un cliente</h3>
              <p className="empty-state-description">Elige un cliente de la lista para ver su estado de liquidez</p>
            </div>
          )}
        </div>
      </div>

      <MovimientoModal isOpen={modalState.movimiento.isOpen} onClose={closeMovimientoModal} onSave={handleMovimientoSave} clienteId={selectedClientId} tipo={modalState.movimiento.tipo} />
      <AsignacionModal isOpen={modalState.asignacion.isOpen} onClose={closeAsignacionModal} onSave={handleAsignacionSave} clienteId={selectedClientId} fondo={modalState.asignacion.fondo || {}} />
    </SidebarProvider>
  );
}
