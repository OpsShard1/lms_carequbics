import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/fees.css';

const FeesDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [feesData, setFeesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCurriculumFilter, setSelectedCurriculumFilter] = useState('all');

  useEffect(() => {
    loadFeesDetail();
  }, [studentId]);

  const loadFeesDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/fees/student/${studentId}`);
      setFeesData(res.data);
    } catch (err) {
      console.error('Failed to load fees detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN');
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'partial': return 'status-partial';
      case 'unpaid': return 'status-unpaid';
      default: return 'status-unpaid';
    }
  };

  const getFilteredTransactions = () => {
    if (!feesData?.all_transactions) return [];
    if (selectedCurriculumFilter === 'all') return feesData.all_transactions;
    return feesData.all_transactions.filter(t => t.curriculum_id === parseInt(selectedCurriculumFilter));
  };

  if (loading) {
    return <div className="loading">Loading fees details...</div>;
  }

  if (!feesData) {
    return <div className="no-data">Fees data not found</div>;
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="fees-detail-page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
        <div>
          <h2>Fees Details</h2>
          <p className="subtitle">{feesData.first_name} {feesData.last_name}</p>
        </div>
      </div>

      <div className="fees-detail-content">
        {/* Overall Summary Card */}
        <div className="fees-summary-card">
          <div className="summary-header">
            <h3>Overall Payment Summary (All Curriculums)</h3>
          </div>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Total Fees (All Courses)</div>
              <div className="summary-value">₹{parseFloat(feesData.summary?.total_fees_all_curriculums || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="summary-item success">
              <div className="summary-label">Total Paid</div>
              <div className="summary-value">₹{parseFloat(feesData.summary?.total_paid_all_curriculums || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="summary-item warning">
              <div className="summary-label">Total Pending</div>
              <div className="summary-value">₹{parseFloat(feesData.summary?.total_pending_all_curriculums || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
          {feesData.summary?.total_paid_all_curriculums > 0 && feesData.summary?.total_fees_all_curriculums > 0 && (
            <div className="progress-bar-container">
              <div className="progress-label">
                <span>Overall Payment Progress</span>
                <span>{Math.round((feesData.summary.total_paid_all_curriculums / feesData.summary.total_fees_all_curriculums) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(feesData.summary.total_paid_all_curriculums / feesData.summary.total_fees_all_curriculums) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Current Curriculum Info */}
        {feesData.current_curriculum?.id && (
          <div className="current-curriculum-card">
            <h4>Current Curriculum</h4>
            <p><strong>{feesData.current_curriculum.name}</strong></p>
          </div>
        )}

        {/* Curriculum-wise Breakdown */}
        {feesData.all_fees_payments && feesData.all_fees_payments.length > 0 && (
          <div className="curriculum-breakdown-card">
            <h3>Curriculum-wise Breakdown</h3>
            <div className="curriculum-breakdown-list">
              {feesData.all_fees_payments.map((payment) => (
                <div key={payment.fees_payment_id} className="curriculum-breakdown-item">
                  <div className="breakdown-header">
                    <div className="breakdown-curriculum-name">
                      {payment.curriculum_name}
                      {payment.curriculum_id === feesData.current_curriculum?.id && (
                        <span className="current-badge">Current</span>
                      )}
                    </div>
                    <span className={`status-badge ${getStatusClass(payment.payment_status)}`}>
                      {payment.payment_status?.toUpperCase()}
                    </span>
                  </div>
                  {payment.discount_percentage > 0 && (
                    <div className="discount-info">
                      <span className="discount-label">Discount Applied:</span>
                      <span className="discount-value">{payment.discount_percentage}% (₹{parseFloat(payment.discount_amount || 0).toLocaleString('en-IN')})</span>
                      {payment.discount_reason && (
                        <div className="discount-reason">Reason: {payment.discount_reason}</div>
                      )}
                    </div>
                  )}
                  <div className="breakdown-amounts">
                    <div className="breakdown-amount-item">
                      <span className="amount-label">Total:</span>
                      <span className="amount-value">₹{parseFloat(payment.total_fees).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="breakdown-amount-item success">
                      <span className="amount-label">Paid:</span>
                      <span className="amount-value">₹{parseFloat(payment.amount_paid).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="breakdown-amount-item warning">
                      <span className="amount-label">Pending:</span>
                      <span className="amount-value">₹{parseFloat(payment.amount_pending).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="transactions-card">
          <div className="transactions-header">
            <h3>Payment History</h3>
            {feesData.all_fees_payments && feesData.all_fees_payments.length > 1 && (
              <select 
                value={selectedCurriculumFilter}
                onChange={(e) => setSelectedCurriculumFilter(e.target.value)}
                className="curriculum-filter"
              >
                <option value="all">All Curriculums</option>
                {feesData.all_fees_payments.map((payment) => (
                  <option key={payment.curriculum_id} value={payment.curriculum_id}>
                    {payment.curriculum_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {filteredTransactions && filteredTransactions.length > 0 ? (
            <div className="transactions-list">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-header">
                    <div className="transaction-date">
                      <span className="date-icon">📅</span>
                      {formatDate(transaction.payment_date)}
                    </div>
                    <div className="transaction-amount">₹{parseFloat(transaction.amount).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="transaction-details">
                    <div className="detail-row">
                      <span className="detail-label">Curriculum:</span>
                      <span className="detail-value curriculum-tag">{transaction.curriculum_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Payment Method:</span>
                      <span className="detail-value">{transaction.payment_method?.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    {transaction.transaction_reference && (
                      <div className="detail-row">
                        <span className="detail-label">Reference:</span>
                        <span className="detail-value">{transaction.transaction_reference}</span>
                      </div>
                    )}
                    {transaction.remarks && (
                      <div className="detail-row">
                        <span className="detail-label">Remarks:</span>
                        <span className="detail-value">{transaction.remarks}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Recorded by:</span>
                      <span className="detail-value">{transaction.recorded_by_name || 'System'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-transactions">
              <p>No payment transactions recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeesDetail;
