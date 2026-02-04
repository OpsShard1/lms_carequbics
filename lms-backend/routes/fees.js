const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get fees overview for a center (with payment status and installment tracking)
router.get('/center/:centerId/overview', authenticate, async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.curriculum_id,
        s.class_format,
        c.name as curriculum_name,
        c.fees as curriculum_fees,
        c.duration_months,
        c.classes_per_installment as classes_per_installment_weekday,
        c.classes_per_installment_weekend,
        COALESCE(fp.discount_percentage, 0) as discount_percentage,
        COALESCE(fp.discount_amount, 0) as discount_amount,
        fp.discount_reason,
        COALESCE(fp.total_fees, c.fees, 0) as total_fees,
        COALESCE(fp.amount_paid, 0) as amount_paid,
        COALESCE(fp.amount_pending, c.fees, 0) as amount_pending,
        COALESCE(fp.payment_status, 'unpaid') as payment_status,
        fp.payment_type,
        fp.installment_number,
        fp.total_installments,
        fp.installment_amount,
        fp.attendance_count_at_payment,
        fp.id as fees_payment_id
      FROM students s
      LEFT JOIN curriculums c ON s.curriculum_id = c.id
      LEFT JOIN fees_payments fp ON s.id = fp.student_id AND s.curriculum_id = fp.curriculum_id
      WHERE s.center_id = ? AND s.is_active = true AND s.curriculum_id IS NOT NULL
      ORDER BY 
        CASE 
          WHEN COALESCE(fp.payment_status, 'unpaid') = 'unpaid' THEN 1
          WHEN COALESCE(fp.payment_status, 'unpaid') = 'partial' THEN 2
          WHEN COALESCE(fp.payment_status, 'unpaid') = 'paid' THEN 3
        END,
        s.first_name
    `, [req.params.centerId]);
    
    // For each student, check if installment is due based on attendance
    for (let student of students) {
      if (student.payment_type === 'installment' && student.payment_status !== 'paid') {
        // Get current attendance count
        const [attendance] = await pool.query(
          `SELECT COUNT(*) as count FROM attendance 
           WHERE student_id = ? AND status = 'present' AND center_id = ?`,
          [student.id, req.params.centerId]
        );
        
        const currentAttendance = attendance[0].count;
        
        // Use weekday or weekend classes based on student's class_format
        const classesPerInstallment = student.class_format === 'weekend'
          ? (student.classes_per_installment_weekend || 4)
          : (student.classes_per_installment_weekday || 8);
        
        // Calculate installment details
        const installmentAmount = parseFloat(student.installment_amount);
        const currentInstallmentNumber = student.installment_number || 0; // Number of COMPLETED installments
        const amountPaid = parseFloat(student.amount_paid);
        
        // Calculate how much has been paid for the CURRENT installment (the one being worked on)
        const paidForPreviousInstallments = currentInstallmentNumber * installmentAmount;
        const paidForCurrentInstallment = amountPaid - paidForPreviousInstallments;
        const currentInstallmentPending = Math.max(0, installmentAmount - paidForCurrentInstallment);
        
        // Check if current installment is fully paid
        const isCurrentInstallmentComplete = paidForCurrentInstallment >= installmentAmount;
        
        // Calculate when next payment reminder should appear
        // Based on classes covered by PAID installments
        // 0 installments paid = 0 classes covered → reminder at 0+ classes
        // 1 installment paid = 8 classes covered → reminder at 8+ classes
        // 2 installments paid = 16 classes covered → reminder at 16+ classes
        const classesCoveredByPayments = currentInstallmentNumber * classesPerInstallment;
        
        // Show "Pay Now" reminder when attendance exceeds classes covered by payments
        const isInstallmentDue = currentAttendance >= classesCoveredByPayments;
        
        student.current_attendance = currentAttendance;
        student.classes_per_installment = classesPerInstallment;
        student.classes_covered_by_payments = classesCoveredByPayments;
        student.current_installment_paid = paidForCurrentInstallment;
        student.current_installment_pending = currentInstallmentPending;
        student.is_current_installment_complete = isCurrentInstallmentComplete;
        student.is_installment_due = isInstallmentDue;
      } else {
        student.current_attendance = 0;
        student.classes_per_installment = 0;
        student.classes_covered_by_payments = 0;
        student.current_installment_paid = 0;
        student.current_installment_pending = 0;
        student.is_current_installment_complete = false;
        student.is_installment_due = false;
      }
    }
    
    res.json(students);
  } catch (error) {
    console.error('Get fees overview error:', error);
    res.status(500).json({ error: 'Failed to fetch fees overview' });
  }
});

// Get fees details for a specific student (ALL curriculums)
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    // Get student info with current curriculum
    const [student] = await pool.query(`
      SELECT 
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.curriculum_id as current_curriculum_id,
        c.name as current_curriculum_name,
        c.fees as current_curriculum_fees
      FROM students s
      LEFT JOIN curriculums c ON s.curriculum_id = c.id
      WHERE s.id = ?
    `, [req.params.studentId]);
    
    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get ALL fees payment records for this student (all curriculums)
    const [allFeesPayments] = await pool.query(`
      SELECT 
        fp.id as fees_payment_id,
        fp.curriculum_id,
        c.name as curriculum_name,
        fp.total_fees,
        fp.discount_percentage,
        fp.discount_amount,
        fp.discount_reason,
        fp.amount_paid,
        fp.amount_pending,
        fp.payment_status,
        fp.payment_type,
        fp.installment_number,
        fp.total_installments,
        fp.installment_amount,
        fp.created_at,
        fp.updated_at
      FROM fees_payments fp
      LEFT JOIN curriculums c ON fp.curriculum_id = c.id
      WHERE fp.student_id = ?
      ORDER BY fp.created_at DESC
    `, [req.params.studentId]);
    
    // Get ALL transaction history for this student (across all curriculums)
    const [allTransactions] = await pool.query(`
      SELECT 
        ft.*,
        u.first_name as recorded_by_name,
        c.name as curriculum_name,
        fp.curriculum_id
      FROM fees_transactions ft
      LEFT JOIN fees_payments fp ON ft.fees_payment_id = fp.id
      LEFT JOIN curriculums c ON fp.curriculum_id = c.id
      LEFT JOIN users u ON ft.recorded_by = u.id
      WHERE fp.student_id = ?
      ORDER BY ft.payment_date DESC, ft.created_at DESC
    `, [req.params.studentId]);
    
    // Calculate totals across all curriculums
    const totalFeesAllCurriculums = allFeesPayments.reduce((sum, fp) => sum + parseFloat(fp.total_fees || 0), 0);
    const totalPaidAllCurriculums = allFeesPayments.reduce((sum, fp) => sum + parseFloat(fp.amount_paid || 0), 0);
    const totalPendingAllCurriculums = allFeesPayments.reduce((sum, fp) => sum + parseFloat(fp.amount_pending || 0), 0);
    
    res.json({
      ...student[0],
      current_curriculum: {
        id: student[0].current_curriculum_id,
        name: student[0].current_curriculum_name,
        fees: student[0].current_curriculum_fees
      },
      all_fees_payments: allFeesPayments,
      all_transactions: allTransactions,
      summary: {
        total_fees_all_curriculums: totalFeesAllCurriculums,
        total_paid_all_curriculums: totalPaidAllCurriculums,
        total_pending_all_curriculums: totalPendingAllCurriculums
      }
    });
  } catch (error) {
    console.error('Get student fees error:', error);
    res.status(500).json({ error: 'Failed to fetch student fees' });
  }
});

// Initialize or update fees payment record
router.post('/initialize', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { student_id, curriculum_id, total_fees } = req.body;
    
    if (!student_id || !curriculum_id) {
      return res.status(400).json({ error: 'Student ID and Curriculum ID are required' });
    }
    
    // Check if record exists
    const [existing] = await pool.query(
      'SELECT id FROM fees_payments WHERE student_id = ? AND curriculum_id = ?',
      [student_id, curriculum_id]
    );
    
    if (existing.length > 0) {
      // Update existing record
      await pool.query(
        'UPDATE fees_payments SET total_fees = ?, amount_pending = total_fees - amount_paid WHERE id = ?',
        [total_fees, existing[0].id]
      );
      res.json({ id: existing[0].id, message: 'Fees record updated' });
    } else {
      // Create new record
      const [result] = await pool.query(
        `INSERT INTO fees_payments (student_id, curriculum_id, total_fees, amount_paid, amount_pending, payment_status)
         VALUES (?, ?, ?, 0, ?, 'unpaid')`,
        [student_id, curriculum_id, total_fees, total_fees]
      );
      res.status(201).json({ id: result.insertId, message: 'Fees record created' });
    }
  } catch (error) {
    console.error('Initialize fees error:', error);
    res.status(500).json({ error: 'Failed to initialize fees' });
  }
});

// Record a payment (with installment tracking)
router.post('/payment', authenticate, authorize('developer', 'trainer_head', 'registrar'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { student_id, curriculum_id, amount, payment_method, payment_date, transaction_reference, remarks } = req.body;
    
    if (!student_id || !curriculum_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment data' });
    }

    // Validate amount is a whole number
    if (!Number.isInteger(parseFloat(amount))) {
      return res.status(400).json({ error: 'Amount must be a whole number (no decimals)' });
    }

    if (amount < 1) {
      return res.status(400).json({ error: 'Minimum payment amount is ₹1' });
    }
    
    // Get fees_payment record (must exist after discount setup)
    let [feesPayment] = await connection.query(
      'SELECT * FROM fees_payments WHERE student_id = ? AND curriculum_id = ?',
      [student_id, curriculum_id]
    );
    
    if (feesPayment.length === 0) {
      return res.status(400).json({ error: 'Fees not initialized. Please set discount first.' });
    }
    
    const feesPaymentId = feesPayment[0].id;
    const totalFees = parseFloat(feesPayment[0].total_fees);
    const currentPaid = parseFloat(feesPayment[0].amount_paid);
    const pendingAmount = totalFees - currentPaid;
    
    // Validate payment amount doesn't exceed pending amount
    if (amount > pendingAmount) {
      return res.status(400).json({ error: `Payment amount cannot exceed pending amount of ₹${pendingAmount}` });
    }
    
    // Get current attendance for installment tracking
    const [student] = await connection.query('SELECT center_id FROM students WHERE id = ?', [student_id]);
    const [attendance] = await connection.query(
      `SELECT COUNT(*) as count FROM attendance 
       WHERE student_id = ? AND status = 'present' AND center_id = ?`,
      [student_id, student[0].center_id]
    );
    const currentAttendance = attendance[0].count;
    
    // Record transaction
    await connection.query(
      `INSERT INTO fees_transactions (fees_payment_id, amount, payment_method, transaction_reference, payment_date, remarks, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [feesPaymentId, amount, payment_method || 'cash', transaction_reference, payment_date, remarks, req.user.id]
    );
    
    // Calculate new amounts
    const newAmountPaid = currentPaid + parseFloat(amount);
    const newAmountPending = totalFees - newAmountPaid;
    
    let paymentStatus = 'unpaid';
    let newInstallmentNumber = feesPayment[0].installment_number || 0;
    
    // For installment payments, track per-installment completion
    if (feesPayment[0].payment_type === 'installment') {
      const installmentAmount = parseFloat(feesPayment[0].installment_amount);
      const totalInstallments = feesPayment[0].total_installments;
      
      // Calculate how much has been paid for the CURRENT installment
      const paidForPreviousInstallments = newInstallmentNumber * installmentAmount;
      const paidForCurrentInstallment = newAmountPaid - paidForPreviousInstallments;
      
      // Check if current installment is now fully paid
      if (paidForCurrentInstallment >= installmentAmount) {
        // Current installment is complete, increment the counter
        newInstallmentNumber = newInstallmentNumber + 1;
      }
      
      // Determine overall payment status
      if (newAmountPaid >= totalFees) {
        paymentStatus = 'paid';
      } else if (newInstallmentNumber > 0 || paidForCurrentInstallment > 0) {
        paymentStatus = 'partial';
      }
    } else {
      // Full payment mode
      if (newAmountPaid >= totalFees) {
        paymentStatus = 'paid';
      } else if (newAmountPaid > 0) {
        paymentStatus = 'partial';
      }
    }
    
    await connection.query(
      `UPDATE fees_payments 
       SET amount_paid = ?, amount_pending = ?, payment_status = ?,
           installment_number = ?
       WHERE id = ?`,
      [newAmountPaid, newAmountPending, paymentStatus, newInstallmentNumber, feesPaymentId]
    );
    
    await connection.commit();
    res.status(201).json({ 
      message: 'Payment recorded successfully',
      payment_status: paymentStatus,
      installment_number: newInstallmentNumber,
      total_installments: feesPayment[0].total_installments
    });
  } catch (error) {
    await connection.rollback();
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    connection.release();
  }
});

// Update curriculum fees
router.put('/curriculum/:curriculumId/fees', authenticate, authorize('developer', 'trainer_head'), async (req, res) => {
  try {
    const { fees } = req.body;
    
    if (fees === undefined || fees < 0) {
      return res.status(400).json({ error: 'Invalid fees amount' });
    }
    
    await pool.query('UPDATE curriculums SET fees = ? WHERE id = ?', [fees, req.params.curriculumId]);
    res.json({ message: 'Curriculum fees updated successfully' });
  } catch (error) {
    console.error('Update curriculum fees error:', error);
    res.status(500).json({ error: 'Failed to update curriculum fees' });
  }
});

// Get fees statistics for a center
router.get('/center/:centerId/stats', authenticate, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE WHEN fp.payment_status = 'paid' THEN s.id END) as paid_count,
        COUNT(DISTINCT CASE WHEN fp.payment_status = 'partial' THEN s.id END) as partial_count,
        COUNT(DISTINCT CASE WHEN fp.payment_status = 'unpaid' OR fp.payment_status IS NULL THEN s.id END) as unpaid_count,
        COALESCE(SUM(fp.total_fees), 0) as total_fees_amount,
        COALESCE(SUM(fp.amount_paid), 0) as total_collected,
        COALESCE(SUM(fp.amount_pending), 0) as total_pending
      FROM students s
      LEFT JOIN fees_payments fp ON s.id = fp.student_id AND s.curriculum_id = fp.curriculum_id
      WHERE s.center_id = ? AND s.is_active = true AND s.curriculum_id IS NOT NULL
    `, [req.params.centerId]);
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Get fees stats error:', error);
    res.status(500).json({ error: 'Failed to fetch fees statistics' });
  }
});

// Get installment status for a student (for parent portal)
router.get('/student/:studentId/installment-status', authenticate, async (req, res) => {
  try {
    const [student] = await pool.query(`
      SELECT s.*, c.duration_months, c.classes_per_installment, c.classes_per_installment_weekend, c.name as curriculum_name
      FROM students s
      LEFT JOIN curriculums c ON s.curriculum_id = c.id
      WHERE s.id = ?
    `, [req.params.studentId]);
    
    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const [feesPayment] = await pool.query(`
      SELECT * FROM fees_payments 
      WHERE student_id = ? AND curriculum_id = ?
    `, [req.params.studentId, student[0].curriculum_id]);
    
    if (feesPayment.length === 0) {
      return res.json({
        has_fees: false,
        message: 'No fees record found'
      });
    }
    
    const fp = feesPayment[0];
    
    // Get current attendance
    const [attendance] = await pool.query(
      `SELECT COUNT(*) as count FROM attendance 
       WHERE student_id = ? AND status = 'present' AND center_id = ?`,
      [req.params.studentId, student[0].center_id]
    );
    
    const currentAttendance = attendance[0].count;
    
    // Use weekday or weekend classes based on student's class_format
    const classesPerInstallment = student[0].class_format === 'weekend'
      ? (student[0].classes_per_installment_weekend || 4)
      : (student[0].classes_per_installment || 8);
    
    // Calculate current installment status
    const installmentAmount = parseFloat(fp.installment_amount);
    const currentInstallmentNumber = fp.installment_number || 0;
    const paidForPreviousInstallments = currentInstallmentNumber * installmentAmount;
    const paidForCurrentInstallment = parseFloat(fp.amount_paid) - paidForPreviousInstallments;
    const currentInstallmentPending = Math.max(0, installmentAmount - paidForCurrentInstallment);
    
    // Check if current installment is complete
    const isCurrentInstallmentComplete = paidForCurrentInstallment >= installmentAmount;
    
    // Calculate classes covered by paid installments
    const classesCoveredByPayments = currentInstallmentNumber * classesPerInstallment;
    
    const isInstallmentDue = fp.payment_type === 'installment' && 
                             fp.payment_status !== 'paid' && 
                             currentAttendance >= classesCoveredByPayments;
    
    res.json({
      has_fees: true,
      curriculum_name: student[0].curriculum_name,
      payment_type: fp.payment_type,
      payment_status: fp.payment_status,
      total_fees: fp.total_fees,
      amount_paid: fp.amount_paid,
      amount_pending: fp.amount_pending,
      installment_number: fp.installment_number,
      total_installments: fp.total_installments,
      installment_amount: fp.installment_amount,
      current_installment_pending: currentInstallmentPending,
      current_attendance: currentAttendance,
      classes_covered_by_payments: classesCoveredByPayments,
      classes_per_installment: classesPerInstallment,
      is_installment_due: isInstallmentDue,
      next_installment_amount: fp.installment_amount
    });
  } catch (error) {
    console.error('Get installment status error:', error);
    res.status(500).json({ error: 'Failed to fetch installment status' });
  }
});

// Get installment status for parent portal (public - no auth required)
router.post('/student/installment-status/parent', async (req, res) => {
  try {
    const { student_name, date_of_birth } = req.body;
    
    if (!student_name || !date_of_birth) {
      return res.status(400).json({ error: 'Student name and date of birth are required' });
    }
    
    // Find student by name and DOB - handle cases where last_name might be empty
    const [students] = await pool.query(
      `SELECT s.*, c.duration_months, c.classes_per_installment, c.classes_per_installment_weekend, c.name as curriculum_name
       FROM students s
       LEFT JOIN curriculums c ON s.curriculum_id = c.id
       WHERE TRIM(CONCAT(s.first_name, ' ', COALESCE(s.last_name, ''))) = ? AND s.date_of_birth = ?`,
      [student_name, date_of_birth]
    );
    
    if (students.length === 0) {
      return res.json({ 
        has_fees: false, 
        message: 'Student not found or no curriculum assigned' 
      });
    }
    
    const student = students[0];
    
    // Check if student has curriculum
    if (!student.curriculum_id) {
      return res.json({ 
        has_fees: false, 
        message: 'No curriculum assigned to student' 
      });
    }
    
    const [feesPayment] = await pool.query(`
      SELECT * FROM fees_payments 
      WHERE student_id = ? AND curriculum_id = ?
    `, [student.id, student.curriculum_id]);
    
    if (feesPayment.length === 0) {
      return res.json({
        has_fees: false,
        message: 'No fees record found'
      });
    }
    
    const fp = feesPayment[0];
    
    // Get current attendance
    const [attendance] = await pool.query(
      `SELECT COUNT(*) as count FROM attendance 
       WHERE student_id = ? AND status = 'present' AND center_id = ?`,
      [student.id, student.center_id]
    );
    
    const currentAttendance = attendance[0].count;
    const installmentNumber = fp.installment_number || 0;
    
    // Use weekday or weekend classes based on student's class_format
    const classesPerInstallment = student.class_format === 'weekend'
      ? (student.classes_per_installment_weekend || 4)
      : (student.classes_per_installment || 8);
    
    // Calculate allowed classes based on completed installments
    const allowedClasses = (installmentNumber + 1) * classesPerInstallment;
    
    // Calculate current installment status
    const installmentAmount = parseFloat(fp.installment_amount);
    const paidForPreviousInstallments = installmentNumber * installmentAmount;
    const paidForCurrentInstallment = parseFloat(fp.amount_paid) - paidForPreviousInstallments;
    const currentInstallmentPending = Math.max(0, installmentAmount - paidForCurrentInstallment);
    
    const isInstallmentDue = fp.payment_type === 'installment' && 
                             fp.payment_status !== 'paid' && 
                             currentAttendance >= allowedClasses;
    
    res.json({
      has_fees: true,
      student_name: `${student.first_name} ${student.last_name}`,
      curriculum_name: student.curriculum_name,
      payment_type: fp.payment_type,
      payment_status: fp.payment_status,
      total_fees: fp.total_fees,
      amount_paid: fp.amount_paid,
      amount_pending: fp.amount_pending,
      installment_number: fp.installment_number,
      total_installments: fp.total_installments,
      installment_amount: fp.installment_amount,
      current_installment_paid: paidForCurrentInstallment,
      current_installment_pending: currentInstallmentPending,
      current_attendance: currentAttendance,
      allowed_classes: allowedClasses,
      classes_per_installment: classesPerInstallment,
      is_installment_due: isInstallmentDue,
      next_installment_amount: fp.installment_amount
    });
  } catch (error) {
    console.error('Get parent installment status error:', error);
    res.status(500).json({ error: 'Failed to fetch installment status', details: error.message });
  }
});

// Set or update discount for a student (with installment support)
router.post('/discount', authenticate, authorize('developer', 'trainer_head', 'registrar'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { student_id, curriculum_id, discount_percentage, discount_reason, payment_type } = req.body;
    
    if (!student_id || !curriculum_id || discount_percentage === undefined || !payment_type) {
      return res.status(400).json({ error: 'Student ID, Curriculum ID, discount percentage, and payment type are required' });
    }
    
    if (discount_percentage < 0 || discount_percentage > 100) {
      return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
    }
    
    if (!['full', 'installment'].includes(payment_type)) {
      return res.status(400).json({ error: 'Payment type must be either "full" or "installment"' });
    }
    
    // Get curriculum and student details
    const [curriculum] = await connection.query(
      'SELECT fees, duration_months, classes_per_installment, classes_per_installment_weekend FROM curriculums WHERE id = ?', 
      [curriculum_id]
    );
    if (curriculum.length === 0) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }
    
    const [student] = await connection.query(
      'SELECT center_id, class_format FROM students WHERE id = ?',
      [student_id]
    );
    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const originalFees = parseFloat(curriculum[0].fees);
    const durationMonths = curriculum[0].duration_months || 12;
    
    // Use weekday or weekend classes based on student's class_format
    const classesPerInstallment = student[0].class_format === 'weekend'
      ? (curriculum[0].classes_per_installment_weekend || 4)
      : (curriculum[0].classes_per_installment || 8);
    
    const discountAmount = (originalFees * discount_percentage) / 100;
    const totalFeesAfterDiscount = originalFees - discountAmount;
    
    // Calculate installment details
    const totalInstallments = payment_type === 'installment' ? durationMonths : 1;
    const installmentAmount = payment_type === 'installment' ? 
      Math.ceil(totalFeesAfterDiscount / totalInstallments) : 0;
    
    // Get current attendance count
    const [attendance] = await connection.query(
      `SELECT COUNT(*) as count FROM attendance 
       WHERE student_id = ? AND status = 'present' AND center_id = ?`,
      [student_id, student[0].center_id]
    );
    const currentAttendance = attendance[0].count;
    
    // Check if fees_payment record exists
    const [existing] = await connection.query(
      'SELECT id, amount_paid FROM fees_payments WHERE student_id = ? AND curriculum_id = ?',
      [student_id, curriculum_id]
    );
    
    if (existing.length > 0) {
      // Update existing record
      const amountPaid = parseFloat(existing[0].amount_paid);
      const newAmountPending = totalFeesAfterDiscount - amountPaid;
      
      let paymentStatus = 'unpaid';
      if (amountPaid >= totalFeesAfterDiscount) {
        paymentStatus = 'paid';
      } else if (amountPaid > 0) {
        paymentStatus = 'partial';
      }
      
      await connection.query(
        `UPDATE fees_payments 
         SET discount_percentage = ?, discount_amount = ?, discount_reason = ?, 
             total_fees = ?, amount_pending = ?, payment_status = ?,
             payment_type = ?, total_installments = ?, installment_amount = ?
         WHERE id = ?`,
        [discount_percentage, discountAmount, discount_reason, totalFeesAfterDiscount, 
         newAmountPending, paymentStatus, payment_type, totalInstallments, 
         installmentAmount, existing[0].id]
      );
    } else {
      // Create new record with discount and installment info
      await connection.query(
        `INSERT INTO fees_payments (
          student_id, curriculum_id, total_fees, discount_percentage, discount_amount, 
          discount_reason, amount_paid, amount_pending, payment_status, payment_type,
          installment_number, total_installments, installment_amount
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'unpaid', ?, 0, ?, ?)`,
        [student_id, curriculum_id, totalFeesAfterDiscount, discount_percentage, discountAmount, 
         discount_reason, totalFeesAfterDiscount, payment_type, totalInstallments, 
         installmentAmount]
      );
    }
    
    await connection.commit();
    res.json({ 
      message: 'Discount and payment plan applied successfully',
      original_fees: originalFees,
      discount_percentage: discount_percentage,
      discount_amount: discountAmount,
      total_fees_after_discount: totalFeesAfterDiscount,
      payment_type: payment_type,
      total_installments: totalInstallments,
      installment_amount: installmentAmount
    });
  } catch (error) {
    await connection.rollback();
    console.error('Apply discount error:', error);
    res.status(500).json({ error: 'Failed to apply discount' });
  } finally {
    connection.release();
  }
});

module.exports = router;
