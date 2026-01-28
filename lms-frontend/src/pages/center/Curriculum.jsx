import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import '../../styles/curriculum.css';

const CurriculumManagement = () => {
  const { user } = useAuth();
  const canEditCurriculum = ['developer', 'trainer_head'].includes(user?.role_name);
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [showCurriculumForm, setShowCurriculumForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  
  const [curriculumForm, setCurriculumForm] = useState({ name: '', description: '', fees: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', sort_order: 0 });
  const [topicForm, setTopicForm] = useState({ name: '', description: '', sort_order: 0, subject_id: '' });
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [feesForm, setFeesForm] = useState({ curriculum_id: '', fees: '' });

  useEffect(() => {
    loadCurriculums();
  }, []);

  const loadCurriculums = async () => {
    try {
      const res = await api.get('/curriculum');
      setCurriculums(res.data);
    } catch (err) {
      console.error('Failed to load curriculums:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurriculumFull = async (id) => {
    try {
      const res = await api.get(`/curriculum/${id}/full`);
      setSelectedCurriculum(res.data);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    }
  };

  const handleCreateCurriculum = async (e) => {
    e.preventDefault();
    try {
      await api.post('/curriculum', curriculumForm);
      setShowCurriculumForm(false);
      setCurriculumForm({ name: '', description: '', fees: '' });
      loadCurriculums();
    } catch (err) {
      alert('Failed to create curriculum');
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/curriculum/${selectedCurriculum.id}/subjects`, subjectForm);
      setShowSubjectForm(false);
      setSubjectForm({ name: '', description: '', sort_order: 0 });
      loadCurriculumFull(selectedCurriculum.id);
    } catch (err) {
      alert('Failed to create subject');
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/curriculum/subjects/${topicForm.subject_id}/topics`, {
        name: topicForm.name,
        description: topicForm.description,
        sort_order: topicForm.sort_order
      });
      setShowTopicForm(false);
      setTopicForm({ name: '', description: '', sort_order: 0, subject_id: '' });
      loadCurriculumFull(selectedCurriculum.id);
    } catch (err) {
      alert('Failed to create topic');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Delete this subject and all its topics?')) return;
    try {
      await api.delete(`/curriculum/subjects/${id}`);
      loadCurriculumFull(selectedCurriculum.id);
    } catch (err) {
      alert('Failed to delete subject');
    }
  };

  const handleDeleteTopic = async (id) => {
    if (!confirm('Delete this topic?')) return;
    try {
      await api.delete(`/curriculum/topics/${id}`);
      loadCurriculumFull(selectedCurriculum.id);
    } catch (err) {
      alert('Failed to delete topic');
    }
  };

  const handleDeleteCurriculum = async (id) => {
    if (!confirm('Delete this curriculum and all its subjects/topics?')) return;
    try {
      await api.delete(`/curriculum/${id}`);
      setSelectedCurriculum(null);
      loadCurriculums();
    } catch (err) {
      alert('Failed to delete curriculum');
    }
  };

  const openFeesModal = (curriculum) => {
    setFeesForm({
      curriculum_id: curriculum.id,
      fees: curriculum.fees || ''
    });
    setShowFeesModal(true);
  };

  const handleUpdateFees = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/fees/curriculum/${feesForm.curriculum_id}/fees`, {
        fees: parseFloat(feesForm.fees) || 0
      });
      alert('Fees updated successfully');
      setShowFeesModal(false);
      loadCurriculums();
      if (selectedCurriculum?.id === feesForm.curriculum_id) {
        loadCurriculumFull(feesForm.curriculum_id);
      }
    } catch (err) {
      alert('Failed to update fees');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="curriculum-page">
      <div className="page-header">
        <div>
          <h2>Curriculum Management</h2>
          <p className="subtitle">Create and manage curriculums, subjects, and topics</p>
        </div>
        {canEditCurriculum && (
          <button onClick={() => setShowCurriculumForm(true)} className="btn-primary">
            + New Curriculum
          </button>
        )}
      </div>

      <div className="curriculum-layout">
        {/* Curriculum List */}
        <div className="curriculum-list">
          <h3>Curriculums</h3>
          {curriculums.length === 0 ? (
            <p className="empty-text">No curriculums yet</p>
          ) : (
            curriculums.map(c => (
              <div 
                key={c.id} 
                className={`curriculum-item ${selectedCurriculum?.id === c.id ? 'active' : ''}`}
                onClick={() => loadCurriculumFull(c.id)}
              >
                <div className="curriculum-info">
                  <span className="curriculum-name">{c.name}</span>
                  <span className="curriculum-fees">₹{parseFloat(c.fees || 0).toLocaleString('en-IN')}</span>
                </div>
                {canEditCurriculum && (
                  <div className="curriculum-actions">
                    <button 
                      className="btn-sm btn-secondary"
                      onClick={(e) => { e.stopPropagation(); openFeesModal(c); }}
                      title="Update Fees"
                    >₹</button>
                    <button 
                      className="btn-sm btn-danger"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCurriculum(c.id); }}
                      title="Delete"
                    >×</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Curriculum Details */}
        <div className="curriculum-details">
          {!selectedCurriculum ? (
            <div className="no-selection">
              <p>👈 Select a curriculum to view its subjects and topics</p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <div className="header-content">
                  <h3>{selectedCurriculum.name}</h3>
                  <p>{selectedCurriculum.description}</p>
                  <div className="curriculum-fees-display">
                    <span className="fees-label">Course Fees:</span>
                    <span className="fees-amount">₹{parseFloat(selectedCurriculum.fees || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {canEditCurriculum && (
                  <div className="details-actions">
                    <button onClick={() => setShowSubjectForm(true)} className="btn-primary btn-sm">
                      + Add Subject
                    </button>
                    <button onClick={() => setShowTopicForm(true)} className="btn-secondary btn-sm">
                      + Add Topic
                    </button>
                  </div>
                )}
              </div>

              <div className="subjects-list">
                {selectedCurriculum.subjects?.length === 0 ? (
                  <p className="empty-text">No subjects yet. Add one to get started.</p>
                ) : (
                  selectedCurriculum.subjects?.map(subject => (
                    <div key={subject.id} className="subject-card">
                      <div className="subject-header">
                        <h4>{subject.name}</h4>
                        {canEditCurriculum && (
                          <button 
                            className="btn-sm btn-danger"
                            onClick={() => handleDeleteSubject(subject.id)}
                          >Delete</button>
                        )}
                      </div>
                      {subject.description && <p className="subject-desc">{subject.description}</p>}
                      
                      <div className="topics-list">
                        {subject.topics?.length === 0 ? (
                          <p className="empty-topics">No topics yet</p>
                        ) : (
                          subject.topics?.map(topic => (
                            <div key={topic.id} className="curriculum-topic-item">
                              <span>{topic.name}</span>
                              {canEditCurriculum && (
                                <button 
                                  className="btn-sm btn-danger"
                                  onClick={() => handleDeleteTopic(topic.id)}
                                >×</button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Curriculum Modal */}
      {showCurriculumForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create Curriculum</h3>
            <form onSubmit={handleCreateCurriculum}>
              <div className="form-group">
                <label>Name *</label>
                <input 
                  value={curriculumForm.name}
                  onChange={(e) => setCurriculumForm({...curriculumForm, name: e.target.value})}
                  placeholder="e.g., Primary Curriculum"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={curriculumForm.description}
                  onChange={(e) => setCurriculumForm({...curriculumForm, description: e.target.value})}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Course Fees (₹)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={curriculumForm.fees}
                  onChange={(e) => setCurriculumForm({...curriculumForm, fees: e.target.value})}
                  placeholder="e.g., 5000"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCurriculumForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {showSubjectForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Subject to {selectedCurriculum?.name}</h3>
            <form onSubmit={handleCreateSubject}>
              <div className="form-group">
                <label>Subject Name *</label>
                <input 
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                  placeholder="e.g., Robotics, Electronics, AI"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({...subjectForm, description: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input 
                  type="number"
                  value={subjectForm.sort_order}
                  onChange={(e) => setSubjectForm({...subjectForm, sort_order: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowSubjectForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Topic Modal */}
      {showTopicForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Topic</h3>
            <form onSubmit={handleCreateTopic}>
              <div className="form-group">
                <label>Subject *</label>
                <select 
                  value={topicForm.subject_id}
                  onChange={(e) => setTopicForm({...topicForm, subject_id: e.target.value})}
                  required
                >
                  <option value="">Select Subject</option>
                  {selectedCurriculum?.subjects?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Topic Name *</label>
                <input 
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({...topicForm, name: e.target.value})}
                  placeholder="e.g., Introduction to Sensors"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({...topicForm, description: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowTopicForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Fees Modal */}
      {showFeesModal && (
        <div className="modal-overlay" onClick={() => setShowFeesModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Update Course Fees</h3>
            <form onSubmit={handleUpdateFees}>
              <div className="form-group">
                <label>Course Fees (₹) *</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={feesForm.fees}
                  onChange={(e) => setFeesForm({...feesForm, fees: e.target.value})}
                  placeholder="e.g., 5000"
                  required
                />
                <small style={{ color: '#6b7280', marginTop: '8px', display: 'block' }}>
                  This will be the default fees for all students enrolled in this curriculum
                </small>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowFeesModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update Fees</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumManagement;
