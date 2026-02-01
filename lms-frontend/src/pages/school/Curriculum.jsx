import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import '../../styles/curriculum.css';

const SchoolCurriculum = () => {
  const { user } = useAuth();
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [curriculumDetails, setCurriculumDetails] = useState(null);
  const [showCurriculumForm, setShowCurriculumForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState([]);
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [editingProjects, setEditingProjects] = useState(null);
  const [loading, setLoading] = useState(false);
  const [draggedOver, setDraggedOver] = useState(null);

  const [curriculumForm, setCurriculumForm] = useState({
    name: '',
    grade_name: '',
    description: ''
  });

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    description: ''
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: ''
  });

  const canEdit = ['developer', 'trainer_head'].includes(user?.role_name);

  useEffect(() => {
    loadCurriculums();
  }, []);

  const loadCurriculums = async () => {
    try {
      const res = await api.get('/school-curriculum');
      setCurriculums(res.data);
    } catch (err) {
      console.error('Failed to load curriculums:', err);
    }
  };

  const loadCurriculumDetails = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/school-curriculum/${id}/full`);
      setCurriculumDetails(res.data);
      setSelectedCurriculum(id);
      setExpandedSubjects([]);
      setEditingSubjects(false);
      setEditingProjects(null);
    } catch (err) {
      console.error('Failed to load curriculum details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCurriculum = async (e) => {
    e.preventDefault();
    try {
      await api.post('/school-curriculum', curriculumForm);
      setCurriculumForm({ name: '', grade_name: '', description: '' });
      setShowCurriculumForm(false);
      loadCurriculums();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create curriculum');
    }
  };

  const handleDeleteCurriculum = async (id) => {
    if (!confirm('Are you sure you want to delete this curriculum? This will remove all subjects and projects.')) return;
    try {
      await api.delete(`/school-curriculum/${id}`);
      setSelectedCurriculum(null);
      setCurriculumDetails(null);
      loadCurriculums();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete curriculum');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('Are you sure you want to delete this subject? This will remove all its projects.')) return;
    try {
      await api.delete(`/school-curriculum/subjects/${subjectId}`);
      loadCurriculumDetails(selectedCurriculum);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete subject');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/school-curriculum/projects/${projectId}`);
      loadCurriculumDetails(selectedCurriculum);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete project');
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      const maxOrder = curriculumDetails.subjects?.length || 0;
      await api.post(`/school-curriculum/${selectedCurriculum}/subjects`, {
        ...subjectForm,
        sort_order: maxOrder
      });
      setSubjectForm({ name: '', description: '' });
      setShowSubjectForm(false);
      loadCurriculumDetails(selectedCurriculum);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add subject');
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const subject = curriculumDetails.subjects.find(s => s.id === selectedSubject);
      const maxOrder = subject?.projects?.length || 0;
      await api.post(`/school-curriculum/subjects/${selectedSubject}/projects`, {
        ...projectForm,
        sort_order: maxOrder
      });
      setProjectForm({ name: '', description: '' });
      loadCurriculumDetails(selectedCurriculum);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add project');
    }
  };

  const finishAddingProjects = () => {
    setShowProjectForm(false);
    setSelectedSubject(null);
    setProjectForm({ name: '', description: '' });
  };

  const toggleSubject = (subjectId) => {
    if (expandedSubjects.includes(subjectId)) {
      setExpandedSubjects(expandedSubjects.filter(id => id !== subjectId));
    } else {
      setExpandedSubjects([...expandedSubjects, subjectId]);
    }
  };

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

  const handleDragOver = (e, index, expectedType) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    const dragType = e.dataTransfer.types.includes('type') ? 'unknown' : 'unknown';
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver(index);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear if we're actually leaving the element
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
    if (dragType !== 'subject') return; // Only process subject drops
    
    const dragIndex = parseInt(e.dataTransfer.getData('index'));
    if (dragIndex === dropIndex || isNaN(dragIndex)) return;

    const newSubjects = [...curriculumDetails.subjects];
    const [removed] = newSubjects.splice(dragIndex, 1);
    newSubjects.splice(dropIndex, 0, removed);

    // Update sort_order for all subjects
    for (let i = 0; i < newSubjects.length; i++) {
      newSubjects[i].sort_order = i;
      try {
        await api.put(`/school-curriculum/subjects/${newSubjects[i].id}`, {
          name: newSubjects[i].name,
          description: newSubjects[i].description,
          sort_order: i
        });
      } catch (err) {
        console.error('Failed to update subject order:', err);
      }
    }

    setCurriculumDetails({ ...curriculumDetails, subjects: newSubjects });
  };

  const handleDropProject = async (e, subjectId, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOver(null);
    
    const dragType = e.dataTransfer.getData('type');
    if (dragType !== 'project') return; // Only process project drops
    
    const dragIndex = parseInt(e.dataTransfer.getData('index'));
    if (dragIndex === dropIndex || isNaN(dragIndex)) return;

    const subjectIndex = curriculumDetails.subjects.findIndex(s => s.id === subjectId);
    const newSubjects = [...curriculumDetails.subjects];
    const newProjects = [...newSubjects[subjectIndex].projects];
    
    const [removed] = newProjects.splice(dragIndex, 1);
    newProjects.splice(dropIndex, 0, removed);

    // Update sort_order for all projects
    for (let i = 0; i < newProjects.length; i++) {
      newProjects[i].sort_order = i;
      try {
        await api.put(`/school-curriculum/projects/${newProjects[i].id}`, {
          name: newProjects[i].name,
          description: newProjects[i].description,
          sort_order: i
        });
      } catch (err) {
        console.error('Failed to update project order:', err);
      }
    }

    newSubjects[subjectIndex].projects = newProjects;
    setCurriculumDetails({ ...curriculumDetails, subjects: newSubjects });
  };

  return (
    <div className="curriculum-page">
      <div className="page-header">
        <h2>School Curriculum Management</h2>
        {canEdit && (
          <button onClick={() => setShowCurriculumForm(!showCurriculumForm)} className="btn-primary">
            {showCurriculumForm ? 'Cancel' : '+ New Curriculum'}
          </button>
        )}
      </div>

      {showCurriculumForm && (
        <div className="form-card">
          <h3>Create New Curriculum</h3>
          <form onSubmit={handleCreateCurriculum}>
            <div className="form-row">
              <input
                placeholder="Learning Level (e.g., Beginner, Intermediate, Advanced)"
                value={curriculumForm.name}
                onChange={(e) => setCurriculumForm({ ...curriculumForm, name: e.target.value })}
                required
              />
              <input
                placeholder="Grade/Class Name (e.g., Grade 5)"
                value={curriculumForm.grade_name}
                onChange={(e) => setCurriculumForm({ ...curriculumForm, grade_name: e.target.value })}
                required
              />
            </div>
            <textarea
              placeholder="Description"
              value={curriculumForm.description}
              onChange={(e) => setCurriculumForm({ ...curriculumForm, description: e.target.value })}
              rows="3"
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
              className={`curriculum-item ${selectedCurriculum === curr.id ? 'active' : ''}`}
            >
              <div onClick={() => loadCurriculumDetails(curr.id)} style={{ flex: 1, cursor: 'pointer' }}>
                <div className="curriculum-name">{curr.name}</div>
                <div className="curriculum-meta">
                  <span className="grade-badge">{curr.grade_name}</span>
                  <span className="subject-count">{curr.subject_count} subjects</span>
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCurriculum(curr.id);
                  }}
                  className="delete-btn"
                  title="Delete curriculum"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="curriculum-details">
          {!selectedCurriculum ? (
            <div className="no-selection">
              <p>📚 Select a curriculum to view details</p>
            </div>
          ) : loading ? (
            <div className="loading">Loading...</div>
          ) : curriculumDetails ? (
            <>
              <div className="details-header">
                <div>
                  <h3>{curriculumDetails.name}</h3>
                  <p className="grade-label">Grade: {curriculumDetails.grade_name}</p>
                  {curriculumDetails.description && <p className="description">{curriculumDetails.description}</p>}
                </div>
                <div className="header-actions">
                  {canEdit && !showSubjectForm && (
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
                  <form onSubmit={handleAddSubject}>
                    <input
                      placeholder="Subject Name (e.g., Robotics)"
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                      required
                    />
                    <textarea
                      placeholder="Subject Description"
                      value={subjectForm.description}
                      onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                      rows="2"
                    />
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">Add Subject</button>
                      <button type="button" onClick={() => setShowSubjectForm(false)} className="btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="subjects-list">
                {curriculumDetails.subjects?.map((subject, index) => (
                  <div 
                    key={subject.id} 
                    className={`subject-card ${draggedOver === `subject-${index}` ? 'drag-over' : ''}`}
                    draggable={editingSubjects && !editingProjects}
                    onDragStart={(e) => handleDragStart(e, index, 'subject')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => editingSubjects && !editingProjects && handleDragOver(e, `subject-${index}`, 'subject')}
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
                      {canEdit && expandedSubjects.includes(subject.id) && !editingSubjects && (
                        <div className="subject-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProjects(editingProjects === subject.id ? null : subject.id);
                            }}
                            className={`btn-small ${editingProjects === subject.id ? 'active' : ''}`}
                          >
                            {editingProjects === subject.id ? '✓ Done' : '✎ Edit'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubject(subject.id);
                              setShowProjectForm(true);
                            }}
                            className="btn-small"
                          >
                            + Add Project
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
                        {showProjectForm && selectedSubject === subject.id && (
                          <div className="project-form">
                            <h5>Add Project to {subject.name}</h5>
                            <form onSubmit={handleAddProject}>
                              <input
                                placeholder="Project Name (e.g., Line Following Robot)"
                                value={projectForm.name}
                                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                                required
                              />
                              <textarea
                                placeholder="Project Description"
                                value={projectForm.description}
                                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                rows="3"
                              />
                              <div className="form-actions">
                                <button type="submit" className="btn-primary">Add Project</button>
                                <button type="button" onClick={finishAddingProjects} className="btn-secondary">
                                  Finish
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        <div className="projects-list">
                          {subject.projects?.length > 0 ? (
                            subject.projects.map((project, pIndex) => (
                              <div 
                                key={project.id} 
                                className={`project-item ${draggedOver === `project-${subject.id}-${pIndex}` ? 'drag-over' : ''}`}
                                draggable={editingProjects === subject.id}
                                onDragStart={(e) => handleDragStart(e, pIndex, 'project')}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => editingProjects === subject.id && handleDragOver(e, `project-${subject.id}-${pIndex}`, 'project')}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDropProject(e, subject.id, pIndex)}
                              >
                                {editingProjects === subject.id && <span className="drag-handle">☰</span>}
                                <div className="project-number">{pIndex + 1}</div>
                                <div className="project-content">
                                  <div className="project-name">{project.name}</div>
                                  {project.description && <div className="project-desc">{project.description}</div>}
                                </div>
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteProject(project.id)}
                                    className="delete-btn-small"
                                    title="Delete project"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="no-projects">No projects added yet</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SchoolCurriculum;
