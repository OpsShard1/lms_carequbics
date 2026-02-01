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
  
  // NEW: Dropdown and drag-drop states
  const [expandedSubjects, setExpandedSubjects] = useState([]);
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [editingTopics, setEditingTopics] = useState(null);
  const [draggedOver, setDraggedOver] = useState(null);
  
  // Forms
  const [showCurriculumForm, setShowCurriculumForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  
  const [curriculumForm, setCurriculumForm] = useState({ name: '', description: '', fees: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '' });
  const [topicForm, setTopicForm] = useState({ name: '', description: '' });
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
      setExpandedSubjects([]);
      setEditingSubjects(false);
      setEditingTopics(null);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    }
  };

  // NEW: Toggle subject dropdown
  const toggleSubject = (subjectId) => {
    if (expandedSubjects.includes(subjectId)) {
      setExpandedSubjects(expandedSubjects.filter(id => id !== subjectId));
    } else {
      setExpandedSubjects([...expandedSubjects, subjectId]);
    }
  };

  // NEW: Drag and drop handlers for subjects
  const handleDragStart = (e, index, type) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('index', index.toString());
    e.dataTransfer.setData('type', type);
    e.currentTarget.style.opacity = '0.5';
    e.currentTarget.style.userSelect = 'none';
    e.stopPropagation();
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.userSelect = 'auto';
    setDraggedOver(null);
    e.stopPropagation();
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver(index);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDraggedOver(null);
    }
  };

  const handleDropSubject = async (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);
    
    const dragType = e.dataTransfer.getData('type');
    if (dragType !== 'subject') return;
    
    const dragIndex = parseInt(e.dataTransfer.getData('index'));
    if (dragIndex === dropIndex || isNaN(dragIndex)) return;

    const newSubjects = [...selectedCurriculum.subjects];
    const [removed] = newSubjects.splice(dragIndex, 1);
    newSubjects.splice(dropIndex, 0, removed);

    for (let i = 0; i < newSubjects.length; i++) {
      newSubjects[i].sort_order = i;
      try {
        await api.put(`/curriculum/subjects/${newSubjects[i].id}`, {
          name: newSubjects[i].name,
          description: newSubjects[i].description,
          sort_order: i
        });
      } catch (err) {
        console.error('Failed to update subject order:', err);
      }
    }

    setSelectedCurriculum({ ...selectedCurriculum, subjects: newSubjects });
  };

  const handleDropTopic = async (e, subjectId, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);
    
    const dragType = e.dataTransfer.getData('type');
    if (dragType !== 'topic') return;
    
    const dragIndex = parseInt(e.dataTransfer.getData('index'));
    if (dragIndex === dropIndex || isNaN(dragIndex)) return;

    const subjectIndex = selectedCurriculum.subjects.findIndex(s => s.id === subjectId);
    const newSubjects = [...selectedCurriculum.subjects];
    const newTopics = [...newSubjects[subjectIndex].topics];
    
    const [removed] = newTopics.splice(dragIndex, 1);
    newTopics.splice(dropIndex, 0, removed);

    for (let i = 0; i < newTopics.length; i++) {
      newTopics[i].sort_order = i;
      try {
        await api.put(`/curriculum/topics/${newTopics[i].id}`, {
          name: newTopics[i].name,
          description: newTopics[i].description,
          sort_order: i
        });
      } catch (err) {
        console.error('Failed to update topic order:', err);
      }
    }

    newSubjects[subjectIndex].topics = newTopics;
    setSelectedCurriculum({ ...selectedCurriculum, subjects: newSubjects });
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
      const maxOrder = selectedCurriculum.subjects?.length || 0;
      await api.post(`/curriculum/${selectedCurriculum.id}/subjects`, {
        ...subjectForm,
        sort_order: maxOrder
      });
      setShowSubjectForm(false);
      setSubjectForm({ name: '', description: '' });
      loadCurriculumFull(selectedCurriculum.id);
    } catch (err) {
      alert('Failed to create subject');
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      const subject = selectedCurriculum.subjects.find(s => s.id === selectedSubject);
      const maxOrder = subject?.topics?.length || 0;
      await api.post(`/curriculum/subjects/${selectedSubject}/topics`, {
        ...topicForm,
        sort_order: maxOrder
      });
      setTopicForm({ name: '', description: '' });
      loadCurriculumFull(selectedCurriculum.id);
    } catch (err) {
      alert('Failed to create topic');
    }
  };

  const finishAddingTopics = () => {
    setShowTopicForm(false);
    setSelectedSubject(null);
    setTopicForm({ name: '', description: '' });
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
        <h2>Center Curriculum Management</h2>
        {canEditCurriculum && (
          <button onClick={() => setShowCurriculumForm(!showCurriculumForm)} className="btn-primary">
            {showCurriculumForm ? 'Cancel' : '+ New Curriculum'}
          </button>
        )}
      </div>

      {showCurriculumForm && (
        <div className="form-card">
          <h3>Create New Curriculum</h3>
          <form onSubmit={handleCreateCurriculum}>
            <input 
              placeholder="Curriculum Name (e.g., Primary Curriculum)"
              value={curriculumForm.name}
              onChange={(e) => setCurriculumForm({...curriculumForm, name: e.target.value})}
              required
            />
            <textarea 
              placeholder="Description"
              value={curriculumForm.description}
              onChange={(e) => setCurriculumForm({...curriculumForm, description: e.target.value})}
              rows={3}
            />
            <input 
              type="number"
              step="1"
              min="0"
              placeholder="Course Fees (₹)"
              value={curriculumForm.fees}
              onChange={(e) => setCurriculumForm({...curriculumForm, fees: e.target.value})}
              onWheel={(e) => e.target.blur()}
            />
            <button type="submit" className="btn-primary">Create Curriculum</button>
          </form>
        </div>
      )}

      <div className="curriculum-layout">
        <div className="curriculum-list">
          <h3>Curriculums</h3>
          {curriculums.map(curr => (
            <div 
              key={curr.id} 
              className={`curriculum-item ${selectedCurriculum?.id === curr.id ? 'active' : ''}`}
            >
              <div onClick={() => loadCurriculumFull(curr.id)} style={{ flex: 1, cursor: 'pointer' }}>
                <div className="curriculum-name">{curr.name}</div>
                <div className="curriculum-meta">
                  <span className="fees-badge">₹{parseFloat(curr.fees || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
              {canEditCurriculum && (
                <div className="curriculum-actions">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openFeesModal(curr); }}
                    className="btn-sm btn-secondary"
                    title="Update Fees"
                  >₹</button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCurriculum(curr.id); }}
                    className="delete-btn"
                    title="Delete"
                  >×</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="curriculum-details">
          {!selectedCurriculum ? (
            <div className="no-selection">
              <p>📚 Select a curriculum to view details</p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <div>
                  <h3>{selectedCurriculum.name}</h3>
                  {selectedCurriculum.description && <p className="description">{selectedCurriculum.description}</p>}
                  <p className="fees-display">Course Fees: ₹{parseFloat(selectedCurriculum.fees || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="header-actions">
                  {canEditCurriculum && !showSubjectForm && (
                    <>
                      <button 
                        onClick={() => setEditingSubjects(!editingSubjects)} 
                        className={`btn-secondary ${editingSubjects ? 'active' : ''}`}
                      >
                        {editingSubjects ? '✓ Done Editing' : '✎ Edit Order'}
                      </button>
                      <button onClick={() => setShowSubjectForm(true)} className="btn-primary">
                        + Add Subject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showSubjectForm && (
                <div className="inline-form">
                  <h4>Add New Subject</h4>
                  <form onSubmit={handleCreateSubject}>
                    <input 
                      placeholder="Subject Name (e.g., Robotics)"
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                      required
                    />
                    <textarea 
                      placeholder="Subject Description"
                      value={subjectForm.description}
                      onChange={(e) => setSubjectForm({...subjectForm, description: e.target.value})}
                      rows={2}
                    />
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">Add Subject</button>
                      <button type="button" onClick={() => setShowSubjectForm(false)} className="btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="subjects-list">
                {selectedCurriculum.subjects?.map((subject, index) => (
                  <div 
                    key={subject.id} 
                    className={`subject-card ${draggedOver === `subject-${index}` ? 'drag-over' : ''}`}
                    draggable={editingSubjects && !editingTopics}
                    onDragStart={(e) => handleDragStart(e, index, 'subject')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => editingSubjects && !editingTopics && handleDragOver(e, `subject-${index}`)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropSubject(e, index)}
                  >
                    <div 
                      className="subject-header"
                      onClick={() => !editingSubjects && toggleSubject(subject.id)}
                    >
                      {editingSubjects && <span className="drag-handle">☰</span>}
                      <div className="subject-info">
                        <h4>
                          {!editingSubjects && <span className="expand-icon">{expandedSubjects.includes(subject.id) ? '▼' : '▶'}</span>}
                          {subject.name}
                        </h4>
                        {subject.description && <p className="school-subject-desc">{subject.description}</p>}
                      </div>
                      {canEditCurriculum && expandedSubjects.includes(subject.id) && !editingSubjects && (
                        <div className="subject-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTopics(editingTopics === subject.id ? null : subject.id);
                            }}
                            className={`btn-small ${editingTopics === subject.id ? 'active' : ''}`}
                          >
                            {editingTopics === subject.id ? '✓ Done' : '✎ Edit'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubject(subject.id);
                              setShowTopicForm(true);
                            }}
                            className="btn-small"
                          >
                            + Add Topic
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubject(subject.id);
                            }}
                            className="btn-small btn-danger"
                            title="Delete subject"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {expandedSubjects.includes(subject.id) && (
                      <>
                        {showTopicForm && selectedSubject === subject.id && (
                          <div className="project-form">
                            <h5>Add Topic to {subject.name}</h5>
                            <form onSubmit={handleCreateTopic}>
                              <input 
                                placeholder="Topic Name (e.g., Introduction to Sensors)"
                                value={topicForm.name}
                                onChange={(e) => setTopicForm({...topicForm, name: e.target.value})}
                                required
                              />
                              <textarea 
                                placeholder="Topic Description"
                                value={topicForm.description}
                                onChange={(e) => setTopicForm({...topicForm, description: e.target.value})}
                                rows={2}
                              />
                              <div className="form-actions">
                                <button type="submit" className="btn-primary">Add Topic</button>
                                <button type="button" onClick={finishAddingTopics} className="btn-secondary">
                                  Finish
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        <div className="projects-list">
                          {subject.topics?.length > 0 ? (
                            subject.topics.map((topic, tIndex) => (
                              <div 
                                key={topic.id} 
                                className={`project-item ${draggedOver === `topic-${subject.id}-${tIndex}` ? 'drag-over' : ''}`}
                                draggable={editingTopics === subject.id}
                                onDragStart={(e) => handleDragStart(e, tIndex, 'topic')}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => editingTopics === subject.id && handleDragOver(e, `topic-${subject.id}-${tIndex}`)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDropTopic(e, subject.id, tIndex)}
                              >
                                {editingTopics === subject.id && <span className="drag-handle">☰</span>}
                                <div className="project-number">{tIndex + 1}</div>
                                <div className="project-content">
                                  <div className="project-name">{topic.name}</div>
                                  {topic.description && <div className="project-desc">{topic.description}</div>}
                                </div>
                                {canEditCurriculum && (
                                  <button
                                    onClick={() => handleDeleteTopic(topic.id)}
                                    className="delete-btn-small"
                                    title="Delete topic"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="no-projects">No topics added yet</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Update Fees Modal */}
      {showFeesModal && (
        <div className="modal-overlay" onClick={() => setShowFeesModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Course Fees</h3>
              <button onClick={() => setShowFeesModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUpdateFees}>
                <div className="form-group">
                  <label>Course Fees (₹) *</label>
                  <input 
                    type="number"
                    step="1"
                    min="0"
                    value={feesForm.fees}
                    onChange={(e) => setFeesForm({...feesForm, fees: e.target.value})}
                    placeholder="e.g., 5000"
                    onWheel={(e) => e.target.blur()}
                    required
                  />
                  <small style={{ color: '#6b7280', marginTop: '8px', display: 'block' }}>
                    Amount must be a whole number (minimum ₹1)
                  </small>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowFeesModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Update Fees</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumManagement;
