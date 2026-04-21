import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './Damages.css';

const Damages = () => {
  const { user } = useAuth();
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDamages = async () => {
    try {
      const res = await axios.get('/api/damages');
      setDamages(res.data);
    } catch (error) {
      toast.error('Error loading damage records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDamages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="damages">
        <div className="page-header">
          <h1>Damage</h1>
        </div>
        <div className="no-access">You do not have access to this page.</div>
      </div>
    );
  }

  return (
    <div className="damages">
      <div className="page-header">
        <h1>Damage</h1>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Remark</th>
              <th>Deleted By</th>
            </tr>
          </thead>
          <tbody>
            {damages.map((d) => (
              <tr key={d.id}>
                <td>{d.created_at ? new Date(d.created_at).toLocaleString() : '-'}</td>
                <td>{d.product_snapshot?.sku || d.product_id?.sku || '-'}</td>
                <td>{d.product_snapshot?.name || d.product_id?.name || '-'}</td>
                <td>{d.product_snapshot?.category || d.product_id?.category || 'N/A'}</td>
                <td>{d.quantity}</td>
                <td className="remark-cell">{d.remark || '-'}</td>
                <td>{d.deleted_by?.username || '-'}</td>
              </tr>
            ))}
            {damages.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-state">
                  No damage records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Damages;

