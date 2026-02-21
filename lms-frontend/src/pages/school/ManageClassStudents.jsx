import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import DatePicker from '../../components/DatePicker';
import PhoneInput from '../../components/PhoneInput';
import api from '../../api/axios';
import '../../styles/manage-class-students.css';

const ManageClassStudents = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { selectedSchool, user, ownerEditMode } = useAuth();
  const { showSuccess, showError, showWarning } = useNotificationContext();
  
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Bulk upload states
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Add student form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    parent_name: '',
    parent_contact: ''
  });

  const canEdit = user?.role_name === 'owner' 
    ? ownerEditMode 
    : ['developer', 'school_teacher', 'trainer_head'].includes(user?.role_name);

  useEffect(() => {
    if (classId && selectedSchool?.id) {
      loadClassInfo();
      loadStudents();
    }
  }, [classId, selectedSchool?.id]);

  // Handle tooltip positioning
  useEffect(() => {
    const handleTooltipPosition = (e) => {
      const tooltip = e.currentTarget.querySelector('.tooltip-content');
      if (tooltip) {
        const badge = e.currentTarget;
        const rect = badge.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 8}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
      }
    };

    const tooltips = document.querySelectorAll('.error-tooltip');
    tooltips.forEach(tooltip => {
      tooltip.addEventListener('mouseenter', handleTooltipPosition);
    });

    return () => {
      tooltips.forEach(tooltip => {
        tooltip.removeEventListener('mouseenter', handleTooltipPosition);
      });
    };
  }, [previewData]);

  const loadClassInfo = async () => {
    try {
      const res = await api.get(`/classes/${classId}`);
      setClassInfo(res.data);
    } catch (err) {
      showError('Failed to load class information');
      navigate('/school/classes');
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/students/class/${classId}`);
      setStudents(res.data);
    } catch (err) {
      showError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['text/csv'];
      
      if (!validTypes.includes(file.type) && !file.name.match(/\.csv$/i)) {
        showError('Please select a valid CSV file');
        return;
      }
      
      setSelectedFile(file);
      setPreviewData(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      showWarning('Please select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('classId', classId);
    formData.append('schoolId', selectedSchool.id);

    try {
      const res = await api.post('/students/bulk-upload/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPreviewData(res.data);
      setShowPreview(true);
      setShowBulkUploadModal(false);
      
      if (res.data.invalidCount === 0) {
        showSuccess(`All ${res.data.validCount} students are valid and ready to upload`);
      } else {
        showWarning(`${res.data.invalidCount} students have errors that need to be fixed`);
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to process file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!previewData) return;
    
    const validStudents = previewData.students
      .filter(s => s.isValid)
      .map(s => s.normalized);
    
    if (validStudents.length === 0) {
      showWarning('No valid students to upload');
      return;
    }
    
    setUploading(true);
    try {
      const res = await api.post('/students/bulk-upload/confirm', {
        classId,
        schoolId: selectedSchool.id,
        students: validStudents
      });
      
      showSuccess(`Successfully uploaded ${res.data.success.length} students`);
      setShowPreview(false);
      setPreviewData(null);
      setSelectedFile(null);
      loadStudents();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to upload students');
    } finally {
      setUploading(false);
    }
  };

  const handleEditStudent = (index) => {
    setEditingIndex(index);
    setEditingStudent({ ...previewData.students[index].normalized });
  };

  const handleSaveEdit = () => {
    if (!editingStudent) return;
    
    // Validate edited student
    const errors = [];
    if (!editingStudent.first_name.trim()) errors.push('First name is required');
    if (!editingStudent.last_name.trim()) errors.push('Last name is required');
    if (!editingStudent.date_of_birth) errors.push('Date of birth is required');
    if (!['Male', 'Female', 'Other'].includes(editingStudent.gender)) errors.push('Invalid gender');
    if (!editingStudent.parent_name.trim()) errors.push('Parent name is required');
    
    const contactStr = String(editingStudent.parent_contact).replace(/\D/g, '');
    if (contactStr.length !== 10 && contactStr.length !== 12) {
      errors.push('Parent contact must be 10 or 12 digits (with country code)');
    }
    
    const updatedStudents = [...previewData.students];
    updatedStudents[editingIndex] = {
      ...updatedStudents[editingIndex],
      normalized: editingStudent,
      errors: errors,
      isValid: errors.length === 0
    };
    
    setPreviewData({
      ...previewData,
      students: updatedStudents,
      validCount: updatedStudents.filter(s => s.isValid).length,
      invalidCount: updatedStudents.filter(s => !s.isValid).length
    });
    
    setEditingIndex(null);
    setEditingStudent(null);
    
    if (errors.length === 0) {
      showSuccess('Student data updated successfully');
    } else {
      showWarning('Student still has validation errors');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingStudent(null);
  };

  const downloadTemplate = () => {
    const csvContent = 'first_name,last_name,date_of_birth,gender,parent_name,parent_contact\n' +
                      'John,Doe,2010-05-15,Male,Jane Doe,1234567890\n' +
                      'Mary,Smith,2011-03-20,Female,Robert Smith,0987654321';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportStudents = () => {
    if (!classInfo || students.length === 0) {
      showWarning('No students to export');
      return;
    }

    // Create CSV header with school and class info
    let csvContent = `School: ${selectedSchool.name}\n`;
    csvContent += `Class: ${classInfo.name}\n`;
    if (classInfo.section) {
      csvContent += `Section: ${classInfo.section}\n`;
    }
    csvContent += `Total Students: ${students.length}\n`;
    csvContent += `Export Date: ${new Date().toLocaleDateString()}\n\n`;
    
    // Add column headers
    csvContent += 'First Name,Last Name,Date of Birth,Gender,Parent Name,Parent Contact,Status\n';
    
    // Add student data
    students.forEach(student => {
      const dob = new Date(student.date_of_birth).toLocaleDateString();
      const status = student.is_extra === 1 || student.is_extra === true 
        ? 'Pending Approval' 
        : student.is_extra === 2 
        ? 'Rejected' 
        : 'Approved';
      
      csvContent += `${student.first_name},${student.last_name},${dob},${student.gender || ''},${student.parent_name || ''},${student.parent_contact || ''},${status}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Create filename: SchoolName_ClassName_Date.csv
    const schoolName = selectedSchool.name.replace(/[^a-z0-9]/gi, '_');
    const className = classInfo.name.replace(/[^a-z0-9]/gi, '_');
    const date = new Date().toISOString().split('T')[0];
    a.download = `${schoolName}_${className}_${date}.csv`;
    
    a.click();
    window.URL.revokeObjectURL(url);
    showSuccess('Student data exported successfully');
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/students/school', {
        ...newStudent,
        school_id: selectedSchool.id,
        class_id: classId
      });
      
      showSuccess('Student added successfully');
      setNewStudent({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        parent_name: '',
        parent_contact: ''
      });
      setShowAddModal(false);
      loadStudents();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to add student');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Remove this student from the class?')) return;
    
    try {
      await api.delete(`/students/${studentId}`);
      showSuccess('Student removed from class');
      loadStudents();
    } catch (err) {
      showError('Failed to remove student');
    }
  };

  const handleApproveStudent = async (studentId) => {
    try {
      await api.post(`/students/${studentId}/approve`);
      showSuccess('Student approved successfully');
      loadStudents();
    } catch (err) {
      showError('Failed to approve student');
    }
  };

  const handleDisapproveStudent = async (studentId) => {
    if (!window.confirm('Disapprove this student? They will be marked as rejected.')) return;
    
    try {
      await api.post(`/students/${studentId}/disapprove`);
      showSuccess('Student disapproved');
      loadStudents();
    } catch (err) {
      showError('Failed to disapprove student');
    }
  };

  if (loading) {
    return (
      <div className="manage-class-students">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-class-students">
      <div className="page-header">
        <div className="mcs-header-left">
          <button onClick={() => navigate('/school/classes')} className="btn-back">
            <span className="back-icon">←</span> Back to Classes
          </button>
          <div className="header-info">
            <h2>Manage Students</h2>
            {classInfo && (
              <div className="class-info-badges">
                <span className="badge badge-primary">{classInfo.name}</span>
                {classInfo.section && <span className="badge badge-secondary">Section {classInfo.section}</span>}
                <span className="badge badge-count">{students.length} Students</span>
              </div>
            )}
          </div>
        </div>
        
        {canEdit && (
          <div className="header-actions">
            <button onClick={() => setShowBulkUploadModal(true)} className="btn-outline">
              Bulk Upload
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <span className="btn-icon">+</span> Add Student
            </button>
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Upload Students</h3>
              <button onClick={() => setShowBulkUploadModal(false)} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <p className="upload-instructions">
                Upload a CSV file with student data. The file should contain the following columns:
                <code>first_name, last_name, date_of_birth, gender, parent_name, parent_contact</code>
              </p>
              
              <div className="upload-actions">
                <button onClick={() => setShowInstructionsModal(true)} className="btn-link">
                  View Instructions
                </button>
                
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="btn-secondary">
                    Choose CSV File
                  </label>
                  {selectedFile && <span className="file-name">{selectedFile.name}</span>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowBulkUploadModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={!selectedFile || uploading}
                className="btn-primary"
              >
                {uploading ? 'Processing...' : 'Preview & Validate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructionsModal && (
        <div className="modal-overlay" onClick={() => setShowInstructionsModal(false)}>
          <div className="modal-content modal-instructions" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>CSV File Creation Instructions</h3>
              <button onClick={() => setShowInstructionsModal(false)} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <div className="instructions-content">
                <h4>How to Create a CSV File Using Excel</h4>
                
                <div className="instruction-step">
                  <span className="step-number">1</span>
                  <div className="step-content">
                    <h5>Open Microsoft Excel</h5>
                    <p>Create a new blank workbook</p>
                  </div>
                </div>

                <div className="instruction-step">
                  <span className="step-number">2</span>
                  <div className="step-content">
                    <h5>Add Column Headers</h5>
                    <p>In the first row, add these exact column names (case-sensitive):</p>
                    <code className="code-block">first_name, last_name, date_of_birth, gender, parent_name, parent_contact</code>
                  </div>
                </div>

                <div className="instruction-step">
                  <span className="step-number">3</span>
                  <div className="step-content">
                    <h5>Fill in Student Data</h5>
                    <p>Starting from row 2, enter student information:</p>
                    <ul>
                      <li><strong>first_name:</strong> Student's first name (required)</li>
                      <li><strong>last_name:</strong> Student's last name (required)</li>
                      <li><strong>date_of_birth:</strong> Format as DD-MM-YYYY or YYYY-MM-DD (e.g., 15-05-2010 or 2010-05-15)</li>
                      <li><strong>gender:</strong> Must be exactly "Male", "Female", or "Other"</li>
                      <li><strong>parent_name:</strong> Parent or guardian's name</li>
                      <li><strong>parent_contact:</strong> 10-digit phone number (with or without +91)</li>
                    </ul>
                  </div>
                </div>

                <div className="instruction-step">
                  <span className="step-number">4</span>
                  <div className="step-content">
                    <h5>Format Cells as Text (Important!)</h5>
                    <p>To prevent Excel from auto-formatting dates and numbers:</p>
                    <ul>
                      <li>Select all cells with data</li>
                      <li>Right-click → Format Cells</li>
                      <li>Choose "Text" category</li>
                      <li>Click OK</li>
                    </ul>
                  </div>
                </div>

                <div className="instruction-step">
                  <span className="step-number">5</span>
                  <div className="step-content">
                    <h5>Save as CSV</h5>
                    <p>File → Save As → Choose "CSV (Comma delimited) (*.csv)" as file type</p>
                  </div>
                </div>

                <div className="instruction-note warning">
                  <strong>⚠️ Important Notes:</strong>
                  <ul>
                    <li>Do not use Excel formulas or special characters</li>
                    <li>Ensure dates are in text format to avoid auto-conversion</li>
                    <li>Phone numbers should be 10 digits only (country code optional)</li>
                    <li>Gender must match exactly: "Male", "Female", or "Other"</li>
                    <li>Save as CSV, not Excel (.xlsx) format</li>
                  </ul>
                </div>

                <div className="instruction-example">
                  <h5>Example Data:</h5>
                  <table className="example-table">
                    <thead>
                      <tr>
                        <th>first_name</th>
                        <th>last_name</th>
                        <th>date_of_birth</th>
                        <th>gender</th>
                        <th>parent_name</th>
                        <th>parent_contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>John</td>
                        <td>Doe</td>
                        <td>15-05-2010</td>
                        <td>Male</td>
                        <td>Jane Doe</td>
                        <td>9876543210</td>
                      </tr>
                      <tr>
                        <td>Mary</td>
                        <td>Smith</td>
                        <td>2011-03-20</td>
                        <td>Female</td>
                        <td>Robert Smith</td>
                        <td>9123456789</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowInstructionsModal(false)} className="btn-secondary">
                Close
              </button>
              <button onClick={downloadTemplate} className="btn-primary">
                📥 Download Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {showPreview && previewData && (
        <div className="preview-section">
          <div className="preview-header">
            <h3>Upload Preview</h3>
            <div className="preview-stats">
              <span className="stat-valid">✓ {previewData.validCount} Valid</span>
              <span className="stat-invalid">✗ {previewData.invalidCount} Invalid</span>
            </div>
          </div>

          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Parent Name</th>
                  <th style={{ minWidth: '150px' }}>Parent Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {previewData.students.map((student, index) => (
                  <tr key={index} className={student.isValid ? 'valid-row' : 'invalid-row'}>
                    {editingIndex === index ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={editingStudent.first_name}
                            onChange={(e) => setEditingStudent({ ...editingStudent, first_name: e.target.value })}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editingStudent.last_name}
                            onChange={(e) => setEditingStudent({ ...editingStudent, last_name: e.target.value })}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <DatePicker
                            selected={editingStudent.date_of_birth ? new Date(editingStudent.date_of_birth + 'T00:00:00') : null}
                            onChange={(date) => {
                              if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                setEditingStudent({ ...editingStudent, date_of_birth: `${year}-${month}-${day}` });
                              } else {
                                setEditingStudent({ ...editingStudent, date_of_birth: '' });
                              }
                            }}
                            maxDate={new Date()}
                          />
                        </td>
                        <td>
                          <select
                            value={editingStudent.gender}
                            onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                            className="edit-input"
                          >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editingStudent.parent_name}
                            onChange={(e) => setEditingStudent({ ...editingStudent, parent_name: e.target.value })}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <PhoneInput
                            value={editingStudent.parent_contact}
                            onChange={(phone) => setEditingStudent({ ...editingStudent, parent_contact: phone })}
                          />
                        </td>
                        <td colSpan="2">
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} className="btn-sm btn-primary">Save</button>
                            <button onClick={handleCancelEdit} className="btn-sm btn-secondary">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={student.errors.some(e => e.includes('First name')) ? 'error-cell' : ''}>
                          {student.normalized.first_name || <span className="empty-value">Empty</span>}
                        </td>
                        <td className={student.errors.some(e => e.includes('Last name')) ? 'error-cell' : ''}>
                          {student.normalized.last_name || <span className="empty-value">Empty</span>}
                        </td>
                        <td className={student.errors.some(e => e.includes('Date of birth') || e.includes('date')) ? 'error-cell' : ''}>
                          {student.normalized.date_of_birth ? (
                            (() => {
                              const [year, month, day] = student.normalized.date_of_birth.split('-');
                              return `${day}/${month}/${year}`;
                            })()
                          ) : (
                            <span className="empty-value">Invalid</span>
                          )}
                        </td>
                        <td className={student.errors.some(e => e.includes('Gender') || e.includes('gender')) ? 'error-cell' : ''}>
                          {student.normalized.gender || <span className="empty-value">Invalid</span>}
                        </td>
                        <td className={student.errors.some(e => e.includes('Parent name')) ? 'error-cell' : ''}>
                          {student.normalized.parent_name || <span className="empty-value">Empty</span>}
                        </td>
                        <td className={student.errors.some(e => e.includes('Parent contact') || e.includes('contact')) ? 'error-cell' : ''}>
                          {student.normalized.parent_contact || <span className="empty-value">Invalid</span>}
                        </td>
                        <td>
                          {student.isValid ? (
                            <span className="status-badge valid">✓ Valid</span>
                          ) : (
                            <div className="error-tooltip">
                              <span className="status-badge invalid">✗ Invalid</span>
                              <div className="tooltip-content">
                                {student.errors.map((err, i) => (
                                  <div key={i}>• {err}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <button onClick={() => handleEditStudent(index)} className="btn-sm btn-secondary">
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="preview-actions">
            <button onClick={() => { setShowPreview(false); setPreviewData(null); setSelectedFile(null); }} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleConfirmUpload}
              disabled={previewData.invalidCount > 0 || uploading}
              className="btn-primary"
              title={previewData.invalidCount > 0 ? 'Fix all errors before uploading' : ''}
            >
              {uploading ? 'Uploading...' : `Confirm Upload (${previewData.validCount} students)`}
            </button>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="btn-close">×</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newStudent.first_name}
                      onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newStudent.last_name}
                      onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth <span className="required">*</span></label>
                    <DatePicker
                      selected={newStudent.date_of_birth ? new Date(newStudent.date_of_birth + 'T00:00:00') : null}
                      onChange={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setNewStudent({ ...newStudent, date_of_birth: `${year}-${month}-${day}` });
                        } else {
                          setNewStudent({ ...newStudent, date_of_birth: '' });
                        }
                      }}
                      maxDate={new Date()}
                      placeholderText="Select date of birth"
                      className="mcs-datepicker-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Gender <span className="required">*</span></label>
                    <select
                      value={newStudent.gender}
                      onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Parent Name <span className="required">*</span></label>
                    <input
                      type="text"
                      value={newStudent.parent_name}
                      onChange={(e) => setNewStudent({ ...newStudent, parent_name: e.target.value })}
                      placeholder="Enter parent name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Parent Contact <span className="required">*</span></label>
                    <PhoneInput
                      value={newStudent.parent_contact}
                      onChange={(phone) => setNewStudent({ ...newStudent, parent_contact: phone })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <span className="btn-icon">+</span> Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="students-section">
        <div className="students-section-header">
          <h3>Students in Class ({students.length})</h3>
          {students.length > 0 && (
            <button onClick={handleExportStudents} className="btn-export">
              📥 Export Students
            </button>
          )}
        </div>
        
        {students.length === 0 ? (
          <div className="empty-state">
            <p>No students in this class yet</p>
          </div>
        ) : (
          <div className="students-table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Parent Name</th>
                  <th>Parent Contact</th>
                  <th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.first_name} {student.last_name}</td>
                    <td>{new Date(student.date_of_birth).toLocaleDateString()}</td>
                    <td>{student.gender}</td>
                    <td>{student.parent_name}</td>
                    <td>{student.parent_contact}</td>
                    <td>
                      {student.is_extra === 1 || student.is_extra === true ? (
                        <span className="status-badge pending">⏳ Pending Approval</span>
                      ) : student.is_extra === 2 ? (
                        <span className="status-badge rejected">✗ Rejected</span>
                      ) : (
                        <span className="status-badge approved">✓ Approved</span>
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <div className="action-buttons">
                          {(student.is_extra === 1 || student.is_extra === true) && (
                            <>
                              <button
                                onClick={() => handleApproveStudent(student.id)}
                                className="btn-approve btn-sm"
                                title="Approve student"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDisapproveStudent(student.id)}
                                className="btn-reject btn-sm"
                                title="Reject student"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleRemoveStudent(student.id)}
                            className="btn-danger btn-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageClassStudents;
