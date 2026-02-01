const express = require('express');
const pool = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get fees overview for a center (with payment status)
router.get('/center/:centerId/overview', authenticate, async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.curriculum_id,
        c.name as curriculum_name,
        c.fees as curriculum_fees,
        COALESCE(fp.discount_percentage, 0) as discount_percentage,
        COALESCE(fp.discount_amount, 0) as discount_amount,
        fp.discount_reason,
        COALESCE(fp.total_fees, c.fees, 0) as total_fees,
        COALESCE(fp.amount_paid, 0) as amount_paid,
        COALESCE(fp.amount_pending, c.fees, 0) as amount_pending,
        COALESCE(fp.payment_status, 'unpaid') as payment_status,
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

// Record a payment
router.post('/payment', authenticate, authorize('developer', 'trainer_head', 'registrar'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { student_id, curriculum_id, amount, payment_method, payment_date, transaction_reference, remarks, discount_percentage, discount_reason } = req.body;
    
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
    
    // Get or create fees_payment record
    let [feesPayment] = await connection.query(
      'SELECT * FROM fees_payments WHERE student_id = ? AND curriculum_id = ?',
      [student_id, curriculum_id]
    );
    
    let feesPaymentId;
    let isFirstPayment = false;
    
    if (feesPayment.length === 0) {
      isFirstPayment = true;
      
      // Get curriculum fees
      const [curriculum] = await connection.query('SELECT fees FROM curriculums WHERE id = ?', [curriculum_id]);
      const originalFees = curriculum[0]?.fees || 0;
      
      // Calculate discount if provided
      let totalFees = originalFees;
      let discountAmount = 0;
      let discountPercentage = 0;
      let discountReasonValue = null;
      
      if (discount_percentage !== undefined && discount_percentage !== null && discount_percentage !== '') {
        discountPercentage = parseFloat(discount_percentage);
        if (discountPercentage < 0 || discountPercentage > 100) {
          return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
        }
        discountAmount = (originalFees * discountPercentage) / 100;
        totalFees = originalFees - discountAmount;
        discountReasonValue = discount_reason || null;
      }

      // Validate payment amount doesn't exceed total fees
      if (amount > totalFees) {
        return res.status(400).json({ error: `Payment amount cannot exceed total fees of ₹${totalFees}` });
      }
      
      // Create fees payment record with discount
      const [result] = await connection.query(
        `INSERT INTO fees_payments (student_id, curriculum_id, total_fees, discount_percentage, discount_amount, discount_reason, amount_paid, amount_pending, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'unpaid')`,
        [student_id, curriculum_id, totalFees, discountPercentage, discountAmount, discountReasonValue, totalFees]
      );
      feesPaymentId = result.insertId;
      feesPayment = [{ id: feesPaymentId, total_fees: totalFees, amount_paid: 0 }];
    } else {
      feesPaymentId = feesPayment[0].id;
      
      // Check if this is truly the first payment (amount_paid is 0)
      if (parseFloat(feesPayment[0].amount_paid) === 0) {
        isFirstPayment = true;
        
        // If discount is provided on first payment, update the fees_payment record
        if (discount_percentage !== undefined && discount_percentage !== null && discount_percentage !== '') {
          const discountPercentage = parseFloat(discount_percentage);
          if (discountPercentage < 0 || discountPercentage > 100) {
            return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
          }
          
          // Get original curriculum fees
          const [curriculum] = await connection.query('SELECT fees FROM curriculums WHERE id = ?', [curriculum_id]);
          const originalFees = curriculum[0]?.fees || 0;
          
          const discountAmount = (originalFees * discountPercentage) / 100;
          const totalFeesAfterDiscount = originalFees - discountAmount;
          
          await connection.query(
            `UPDATE fees_payments 
             SET discount_percentage = ?, discount_amount = ?, discount_reason = ?, 
                 total_fees = ?, amount_pending = ?
             WHERE id = ?`,
            [discountPercentage, discountAmount, discount_reason || null, totalFeesAfterDiscount, totalFeesAfterDiscount, feesPaymentId]
          );
          
          // Update feesPayment for calculation below
          feesPayment[0].total_fees = totalFeesAfterDiscount;
        }
      }
      
      // Validate payment amount doesn't exceed pending amount
      const pendingAmount = parseFloat(feesPayment[0].total_fees) - parseFloat(feesPayment[0].amount_paid);
      if (amount > pendingAmount) {
        return res.status(400).json({ error: `Payment amount cannot exceed pending amount of ₹${pendingAmount}` });
      }
    }
    
    // Record transaction
    await connection.query(
      `INSERT INTO fees_transactions (fees_payment_id, amount, payment_method, transaction_reference, payment_date, remarks, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [feesPaymentId, amount, payment_method || 'cash', transaction_reference, payment_date, remarks, req.user.id]
    );
    
    // Update fees_payment record
    const newAmountPaid = parseFloat(feesPayment[0].amount_paid) + parseFloat(amount);
    const totalFees = parseFloat(feesPayment[0].total_fees);
    const newAmountPending = totalFees - newAmountPaid;
    
    let paymentStatus = 'unpaid';
    if (newAmountPaid >= totalFees) {
      paymentStatus = 'paid';
    } else if (newAmountPaid > 0) {
      paymentStatus = 'partial';
    }
    
    await connection.query(
      `UPDATE fees_payments 
       SET amount_paid = ?, amount_pending = ?, payment_status = ?
       WHERE id = ?`,
      [newAmountPaid, newAmountPending, paymentStatus, feesPaymentId]
    );
    
    await connection.commit();
    res.status(201).json({ 
      message: 'Payment recorded successfully',
      is_first_payment: isFirstPayment
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

// Set or update discount for a student
router.post('/discount', authenticate, authorize('developer', 'trainer_head', 'registrar'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { student_id, curriculum_id, discount_percentage, discount_reason } = req.body;
    
    if (!student_id || !curriculum_id || discount_percentage === undefined) {
      return res.status(400).json({ error: 'Student ID, Curriculum ID, and discount percentage are required' });
    }
    
    if (discount_percentage < 0 || discount_percentage > 100) {
      return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
    }
    
    // Get curriculum fees
    const [curriculum] = await connection.query('SELECT fees FROM curriculums WHERE id = ?', [curriculum_id]);
    if (curriculum.length === 0) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }
    
    const originalFees = parseFloat(curriculum[0].fees);
    const discountAmount = (originalFees * discount_percentage) / 100;
    const totalFeesAfterDiscount = originalFees - discountAmount;
    
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
             total_fees = ?, amount_pending = ?, payment_status = ?
         WHERE id = ?`,
        [discount_percentage, discountAmount, discount_reason, totalFeesAfterDiscount, newAmountPending, paymentStatus, existing[0].id]
      );
    } else {
      // Create new record with discount
      await connection.query(
        `INSERT INTO fees_payments (student_id, curriculum_id, total_fees, discount_percentage, discount_amount, discount_reason, amount_paid, amount_pending, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'unpaid')`,
        [student_id, curriculum_id, totalFeesAfterDiscount, discount_percentage, discountAmount, discount_reason, totalFeesAfterDiscount]
      );
    }
    
    await connection.commit();
    res.json({ 
      message: 'Discount applied successfully',
      original_fees: originalFees,
      discount_percentage: discount_percentage,
      discount_amount: discountAmount,
      total_fees_after_discount: totalFeesAfterDiscount
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
