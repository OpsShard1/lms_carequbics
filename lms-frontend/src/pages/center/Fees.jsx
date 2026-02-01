import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import '../../styles/fees.css';

const CenterFees = () => {
  const { selectedCenter, user } = useAuth();
  const navigate = useNavigate();
  const canManageFees = ['developer', 'trainer_head', 'registrar'].includes(user?.role_name);
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference: '',
    remarks: ''
  });
  const [discountForm, setDiscountForm] = useState({
    discount_percentage: '',
    discount_reason: ''
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
    const isFirstPayment = !student.amount_paid || parseFloat(student.amount_paid) === 0;
    
    setSelectedStudent(student);
    
    // If first payment, show discount modal first
    if (isFirstPayment) {
      setDiscountForm({
        discount_percentage: '',
        discount_reason: ''
      });
      setShowDiscountModal(true);
    } else {
      // Not first payment, go directly to payment modal
      setPaymentForm({
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        transaction_reference: '',
        remarks: ''
      });
      setShowPaymentModal(true);
    }
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

  const closeDiscountModal = () => {
    setShowDiscountModal(false);
    setSelectedStudent(null);
    setDiscountForm({
      discount_percentage: '',
      discount_reason: ''
    });
  };

  const handleDiscountSubmit = () => {
    // Validate discount if provided
    if (discountForm.discount_percentage !== '' && discountForm.discount_percentage !== null) {
      const discount = parseFloat(discountForm.discount_percentage);
      if (discount < 0 || discount > 100) {
        alert('Discount percentage must be between 0 and 100');
        return;
      }
    }
    
    // Calculate new pending amount after discount
    const originalFees = parseFloat(selectedStudent.curriculum_fees || selectedStudent.total_fees);
    let newPendingAmount = originalFees;
    
    if (discountForm.discount_percentage && parseFloat(discountForm.discount_percentage) > 0) {
      const discountAmount = (originalFees * parseFloat(discountForm.discount_percentage)) / 100;
      newPendingAmount = originalFees - discountAmount;
    }
    
    // Update selected student with new pending amount
    setSelectedStudent({
      ...selectedStudent,
      amount_pending: newPendingAmount,
      total_fees: newPendingAmount
    });
    
    // Close discount modal and open payment modal
    setShowDiscountModal(false);
    setPaymentForm({
      amount: '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      transaction_reference: '',
      remarks: ''
    });
    setShowPaymentModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(paymentForm.amount);
    const pendingAmount = parseFloat(selectedStudent.amount_pending);
    
    if (!selectedStudent || !paymentForm.amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Check if amount is a whole number
    if (!Number.isInteger(amount)) {
      alert('Amount must be a whole number (no decimals)');
      return;
    }

    if (amount < 1) {
      alert('Minimum payment amount is ₹1');
      return;
    }

    // Check if amount exceeds pending amount
    if (amount > pendingAmount) {
      alert(`Payment amount cannot exceed pending amount of ₹${pendingAmount.toLocaleString('en-IN')}`);
      return;
    }

    try {
      const paymentData = {
        student_id: selectedStudent.id,
        curriculum_id: selectedStudent.curriculum_id,
        amount: amount,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        transaction_reference: paymentForm.transaction_reference,
        remarks: paymentForm.remarks
      };

      // Add discount if it was set (from discount modal)
      if (discountForm.discount_percentage !== '' && discountForm.discount_percentage !== null) {
        paymentData.discount_percentage = parseFloat(discountForm.discount_percentage);
        paymentData.discount_reason = discountForm.discount_reason;
      }

      await api.post('/fees/payment', paymentData);
      
      alert('Payment recorded successfully');
      closePaymentModal();
      // Reset discount form
      setDiscountForm({
        discount_percentage: '',
        discount_reason: ''
      });
      loadFeesData();
      loadStats();
    } catch (err) {
      console.error('Payment error:', err);
      alert(err.response?.data?.error || 'Failed to record payment');
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
              <th>Discount</th>
              <th>Paid</th>
              <th>Pending</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  {searchQuery || filterStatus !== 'all' ? 'No students found matching your filters' : 'No students with curriculum assigned'}
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.id} className={`fees-row ${getStatusClass(student.payment_status)}`}>
                  <td onClick={() => viewStudentDetails(student)} style={{ cursor: 'pointer' }}>
                    <div className="student-name-cell">
                      <div className="student-name">{student.first_name} {student.last_name}</div>
                    </div>
                  </td>
                  <td onClick={() => viewStudentDetails(student)} style={{ cursor: 'pointer' }}>{student.curriculum_name || '-'}</td>
                  <td onClick={() => viewStudentDetails(student)} style={{ cursor: 'pointer' }} className="amount-cell">₹{parseFloat(student.total_fees || 0).toLocaleString('en-IN')}</td>
                  <td onClick={() => viewStudentDetails(student)} style={{ cursor: 'pointer' }} className="discount-cell">
                    {student.discount_percentage > 0 ? (
                      <span className="discount-badge">
                        {student.discount_percentage}% (₹{parseFloat(student.discount_amount || 0).toLocaleString('en-IN')})
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>-</span>
                    )}
                  </td>
                  <td onClick={() => viewStudentDetails(student)} style={{ cursor: 'pointer' }} className="amount-cell success">₹{parseFloat(student.amount_paid || 0).toLocaleString('en-IN')}</td>
                  <td onClick={() => viewStudentDetails(student)} style={{ cursor: 'pointer' }} className="amount-cell warning">₹{parseFloat(student.amount_pending || 0).toLocaleString('en-IN')}</td>
                  <td onClick={() => viewStudentDetails(student)} style={{ cursor: 'pointer' }}>
                    <span className={`status-badge ${getStatusClass(student.payment_status)}`}>
                      {getStatusLabel(student.payment_status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
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

      {/* Discount Modal - Shows first for first payment */}
      {showDiscountModal && selectedStudent && (
        <div className="modal-overlay" onClick={closeDiscountModal}>
          <div className="modal discount-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Set Discount (Optional)</h3>
              <button onClick={closeDiscountModal} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="student-info-box">
                <p><strong>Student:</strong> {selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p><strong>Curriculum:</strong> {selectedStudent.curriculum_name}</p>
                <p><strong>Original Fees:</strong> ₹{parseFloat(selectedStudent.curriculum_fees || selectedStudent.total_fees).toLocaleString('en-IN')}</p>
              </div>
              <div className="discount-notice">
                <p>⚠️ <strong>Important:</strong> Discount can only be set during the first payment and cannot be changed later.</p>
                <p>Leave blank or enter 0 if no discount is needed.</p>
              </div>
              <div className="form-group">
                <label>Discount Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountForm.discount_percentage}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_percentage: e.target.value })}
                  placeholder="Enter discount percentage (0-100)"
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              <div className="form-group">
                <label>Discount Reason</label>
                <textarea
                  rows="3"
                  placeholder="Reason for discount (optional)..."
                  value={discountForm.discount_reason}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_reason: e.target.value })}
                />
              </div>
              {discountForm.discount_percentage && parseFloat(discountForm.discount_percentage) > 0 && (
                <div className="discount-preview">
                  <p><strong>Discount Preview:</strong></p>
                  <p>Original Fees: ₹{parseFloat(selectedStudent.curriculum_fees || selectedStudent.total_fees).toLocaleString('en-IN')}</p>
                  <p>Discount ({discountForm.discount_percentage}%): -₹{((parseFloat(selectedStudent.curriculum_fees || selectedStudent.total_fees) * parseFloat(discountForm.discount_percentage)) / 100).toLocaleString('en-IN')}</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                    Final Fees: ₹{(parseFloat(selectedStudent.curriculum_fees || selectedStudent.total_fees) - ((parseFloat(selectedStudent.curriculum_fees || selectedStudent.total_fees) * parseFloat(discountForm.discount_percentage)) / 100)).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" onClick={closeDiscountModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={handleDiscountSubmit} className="btn-primary">
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                {discountForm.discount_percentage && parseFloat(discountForm.discount_percentage) > 0 && (
                  <p style={{ color: '#10b981', fontWeight: '600' }}>
                    ✓ Discount Applied: {discountForm.discount_percentage}%
                  </p>
                )}
                <p><strong>Already Paid:</strong> ₹{parseFloat(selectedStudent.amount_paid).toLocaleString('en-IN')}</p>
                <p><strong>Pending:</strong> ₹{parseFloat(selectedStudent.amount_pending).toLocaleString('en-IN')}</p>
              </div>
              <form onSubmit={handlePayment}>
                <div className="form-group">
                  <label>Amount (₹) <span className="required">*</span></label>
                  <div className="amount-input-wrapper">
                    <input
                      type="number"
                      min="1"
                      max={Math.floor(selectedStudent.amount_pending)}
                      step="1"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      placeholder="Enter payment amount"
                      onWheel={(e) => e.target.blur()}
                      required
                    />
                    <button
                      type="button"
                      className="pay-full-btn"
                      onClick={() => setPaymentForm({ ...paymentForm, amount: Math.floor(selectedStudent.amount_pending).toString() })}
                      title="Pay full amount"
                    >
                      Pay Full
                    </button>
                  </div>
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Amount must be a whole number (₹1 - ₹{Math.floor(selectedStudent.amount_pending).toLocaleString('en-IN')})
                  </small>
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
