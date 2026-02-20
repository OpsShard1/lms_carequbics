import { useState, useEffect } from 'react';
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
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Add student form
  const [showAddForm, setShowAddForm] = useState(false);
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
      setShowAddForm(false);
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
            ← Back to Classes
          </button>
          <div>
            <h2>Manage Students</h2>
            {classInfo && (
              <p className="class-info">
                {classInfo.name} • Grade {classInfo.grade} • Section {classInfo.section || '-'}
              </p>
            )}
          </div>
        </div>
        
        {canEdit && (
          <div className="header-actions">
            <button onClick={() => setShowBulkUploadModal(true)} className="btn-secondary">
              📤 Bulk Upload
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
              + Add Student
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
              <p className="upload-note">
                <strong>Note:</strong> Only CSV files are supported. Date format should be DD-MM-YYYY or YYYY-MM-DD.
              </p>
              
              <div className="upload-actions">
                <button onClick={downloadTemplate} className="btn-link">
                  📥 Download CSV Template
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
                  <th>Row</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Parent Name</th>
                  <th>Parent Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {previewData.students.map((student, index) => (
                  <tr key={index} className={student.isValid ? 'valid-row' : 'invalid-row'}>
                    <td>{student.row}</td>
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

      {showAddForm && (
        <div className="add-student-form">
          <h3>Add New Student</h3>
          <form onSubmit={handleAddStudent}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={newStudent.first_name}
                  onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={newStudent.last_name}
                  onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <DatePicker
                  selected={newStudent.date_of_birth ? new Date(newStudent.date_of_birth) : null}
                  onChange={(date) => {
                    const formattedDate = date ? date.toISOString().split('T')[0] : '';
                    setNewStudent({ ...newStudent, date_of_birth: formattedDate });
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label>Gender *</label>
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Parent Name *</label>
                <input
                  type="text"
                  value={newStudent.parent_name}
                  onChange={(e) => setNewStudent({ ...newStudent, parent_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Parent Contact *</label>
                <PhoneInput
                  value={newStudent.parent_contact}
                  onChange={(phone) => setNewStudent({ ...newStudent, parent_contact: phone })}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Student
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="students-section">
        <h3>Students in Class ({students.length})</h3>
        
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
                    {canEdit && (
                      <td>
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="btn-danger btn-sm"
                        >
                          Remove
                        </button>
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
