import React, { useState, useEffect } from 'react';
import { getPickupRequests } from '../../api/pickups';
import { CheckCircle, Loader2, Calendar, Clipboard, Weight, MapPin } from 'lucide-react';

const CompletedRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await getPickupRequests();
        const completed = data.filter((req) => req.status === 'COMPLETED');
        setRequests(completed);
      } catch (err) {
        console.error(err);
        setError('Failed to load completed requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Completed Requests</h2>
        <p className="page-subtitle">View your successfully collected and processed e-waste requests.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--dash-primary)' }} />
        </div>
      ) : error ? (
        <div className="auth-error-alert" style={{ display: 'flex', padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '8px' }}>
          {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CheckCircle size={48} />
          </div>
          <h3>No completed requests</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>You don't have any completed e-waste requests yet.</p>
        </div>
      ) : (
        <div className="requests-list-container">
          {requests.map((req) => (
            <div key={req.request_id} className="request-item-card">
              <div className="request-card-header">
                <span className="request-id">Request #{req.request_id}</span>
                <span className="request-status-badge status-completed">
                  {req.status}
                </span>
              </div>
              <div className="request-card-body">
                <div className="summary-item">
                  <span className="summary-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clipboard size={14} /> Appliance Details
                  </span>
                  <span className="summary-value">
                    {req.items?.[0]?.item_category || 'E-Waste Item'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Weight size={14} /> Est. Weight
                  </span>
                  <span className="summary-value">
                    {req.total_estimated_weight_kg ? `${req.total_estimated_weight_kg} kg` : 'N/A'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={14} /> Completed Date
                  </span>
                  <span className="summary-value">
                    {formatDate(req.completed_date || req.scheduled_date)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem', borderTop: '1px solid var(--dash-border)', paddingTop: '0.75rem', fontSize: '0.85rem', color: 'var(--dash-text-secondary)' }}>
                <MapPin size={14} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <span>{req.pickup_address}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CompletedRequestsPage;
