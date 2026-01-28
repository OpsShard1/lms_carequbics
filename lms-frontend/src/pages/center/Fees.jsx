import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/fees.css';

const CenterFees = () => {
  const { selectedCenter, user } = useAuth();
  const navigate = useNavigate();
  const canManageFees = ['developer', 'trainer_head', 'trainer'].includes(user?.role_name);
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference: '',
    remarks: ''
  });

  useEffect(() => {
    if (selectedCenter) {
      loadFeesData();
      loadStats();
    }
  }, [selectedCenter]);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, filterStatus]);

  const loadFeesData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/fees/center/${selectedCenter.id}/overview`);
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to load fees data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get(`/fees/center/${selectedCenter.id}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
        s.curriculum_name?.toLowerCase().includes(query)
      );
    }

    // Filter by payment status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.payment_status === filterStatus);
    }

    setFilteredStudents(filtered);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'partial': return 'status-partial';
      case 'unpaid': return 'status-unpaid';
      default: return 'status-unpaid';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'unpaid': return 'Unpaid';
      default: return 'Unpaid';
    }
  };

  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    setPaymentForm({
      amount: student.amount_pending > 0 ? student.amount_pending : '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      transaction_reference: '',
      remarks: ''
    });
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedStudent(null);
    setPaymentForm({
      amount: '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      transaction_reference: '',
      remarks: ''
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!selectedStudent || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await api.post('/fees/payment', {
        student_id: selectedStudent.id,
        curriculum_id: selectedStudent.curriculum_id,
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });
      
      alert('Payment recorded successfully');
      closePaymentModal();
      loadFeesData();
      loadStats();
    } catch (err) {
      console.error('Payment error:', err);
      alert('Failed to record payment');
    }
  };

  const viewStudentDetails = (student) => {
    navigate(`/center/fees/${student.id}`);
  };

  if (!selectedCenter) {
    return <p>Please select a center first.</p>;
  }

  if (loading) {
    return <div className="loading">Loading fees data...</div>;
  }

  return (
    <div className="fees-page">
      <div className="page-header">
        <h2>Fees Management</h2>
        <p className="subtitle">Track and manage student fees payments</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="fees-stats">
          <div className="stat-card">
            <div className="stat-icon">₹</div>
            <div className="stat-content">
              <div className="stat-value">₹{parseFloat(stats.total_fees_amount || 0).toLocaleString('en-IN')}</div>
              <div className="stat-label">Total Fees</div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <div className="stat-value">₹{parseFloat(stats.total_collected || 0).toLocaleString('en-IN')}</div>
              <div className="stat-label">Collected ({stats.paid_count} students)</div>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">₹{parseFloat(stats.total_pending || 0).toLocaleString('en-IN')}</div>
              <div className="stat-label">Pending ({stats.partial_count + stats.unpaid_count} students)</div>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total_students}</div>
              <div className="stat-label">Total Students</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="fees-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by student name or curriculum..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="clear-search">×</button>
          )}
        </div>
        <div className="status-filters">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({students.length})
          </button>
          <button
            className={`filter-btn status-paid ${filterStatus === 'paid' ? 'active' : ''}`}
            onClick={() => setFilterStatus('paid')}
          >
            Paid ({students.filter(s => s.payment_status === 'paid').length})
          </button>
          <button
            className={`filter-btn status-partial ${filterStatus === 'partial' ? 'active' : ''}`}
            onClick={() => setFilterStatus('partial')}
          >
            Partial ({students.filter(s => s.payment_status === 'partial').length})
          </button>
          <button
            className={`filter-btn status-unpaid ${filterStatus === 'unpaid' ? 'active' : ''}`}
            onClick={() => setFilterStatus('unpaid')}
          >
            Unpaid ({students.filter(s => s.payment_status === 'unpaid').length})
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="table-wrapper">
        <table className="fees-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Curriculum</th>
              <th>Total Fees</th>
              <th>Paid</th>
              <th>Pending</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  {searchQuery || filterStatus !== 'all' ? 'No students found matching your filters' : 'No students with curriculum assigned'}
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.id} className={`fees-row ${getStatusClass(student.payment_status)}`}>
                  <td>
                    <div className="student-name-cell">
                      <div className="student-name">{student.first_name} {student.last_name}</div>
                    </div>
                  </td>
                  <td>{student.curriculum_name || '-'}</td>
                  <td className="amount-cell">₹{parseFloat(student.total_fees || 0).toLocaleString('en-IN')}</td>
                  <td className="amount-cell success">₹{parseFloat(student.amount_paid || 0).toLocaleString('en-IN')}</td>
                  <td className="amount-cell warning">₹{parseFloat(student.amount_pending || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(student.payment_status)}`}>
                      {getStatusLabel(student.payment_status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => viewStudentDetails(student)}
                        className="btn-sm btn-secondary"
                      >
                        View
                      </button>
                      {canManageFees && student.payment_status !== 'paid' && (
                        <button
                          onClick={() => openPaymentModal(student)}
                          className="btn-sm btn-primary"
                        >
                          Add Payment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && (
        <div className="modal-overlay" onClick={closePaymentModal}>
          <div className="modal payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button onClick={closePaymentModal} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="student-info-box">
                <p><strong>Student:</strong> {selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p><strong>Curriculum:</strong> {selectedStudent.curriculum_name}</p>
                <p><strong>Total Fees:</strong> ₹{parseFloat(selectedStudent.total_fees).toLocaleString('en-IN')}</p>
                <p><strong>Already Paid:</strong> ₹{parseFloat(selectedStudent.amount_paid).toLocaleString('en-IN')}</p>
                <p><strong>Pending:</strong> ₹{parseFloat(selectedStudent.amount_pending).toLocaleString('en-IN')}</p>
              </div>
              <form onSubmit={handlePayment}>
                <div className="form-group">
                  <label>Amount (₹) <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedStudent.amount_pending}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Date <span className="required">*</span></label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Transaction Reference</label>
                  <input
                    type="text"
                    placeholder="Transaction ID, Cheque No., etc."
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea
                    rows="3"
                    placeholder="Any additional notes..."
                    value={paymentForm.remarks}
                    onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={closePaymentModal} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterFees;
