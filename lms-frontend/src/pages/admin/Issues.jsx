import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationContext } from '../../context/NotificationContext';
import api from '../../api/axios';
import '../../styles/help.css';

const Issues = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);

  const canDelete = ['developer', 'super_admin', 'admin', 'owner'].includes(user?.role_name);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const res = await api.get('/help/issues');
      setIssues(res.data);
    } catch (err) {
      showError('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (issueId) => {
    try {
      await api.put(`/help/issues/${issueId}/resolve`);
      showSuccess('Issue marked as resolved');
      loadIssues();
    } catch (err) {
      showError('Failed to resolve issue');
    }
  };

  const handleDelete = async (issueId) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    
    try {
      await api.delete(`/help/issues/${issueId}`);
      showSuccess('Issue deleted successfully');
      loadIssues();
    } catch (err) {
      showError('Failed to delete issue');
    }
  };

  const filteredIssues = issues
    .filter(i => showResolved ? i.is_resolved : !i.is_resolved)
    .filter(i => filter === 'all' ? true : i.section === filter);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilDeletion = (resolvedAt) => {
    if (!resolvedAt) return null;
    const resolved = new Date(resolvedAt);
    const deleteDate = new Date(resolved.getTime() + 10 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((deleteDate - now) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  if (loading) {
    return (
      <div className="issues-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading issues...</p>
        </div>
      </div>
    );
  }

  const unresolvedIssues = issues.filter(i => !i.is_resolved);
  const resolvedIssues = issues.filter(i => i.is_resolved);

  return (
    <div className="issues-page">
      <div className="page-header">
        <h2>Reported Issues</h2>
        <div className="issue-toggle">
          <button 
            className={`toggle-btn ${!showResolved ? 'active' : ''}`}
            onClick={() => setShowResolved(false)}
          >
            Unresolved ({unresolvedIssues.length})
          </button>
          <button 
            className={`toggle-btn ${showResolved ? 'active' : ''}`}
            onClick={() => setShowResolved(true)}
          >
            Resolved ({resolvedIssues.length})
          </button>
        </div>
      </div>

      <div className="issue-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({(showResolved ? resolvedIssues : unresolvedIssues).length})
        </button>
        <button 
          className={`filter-btn ${filter === 'school' ? 'active' : ''}`}
          onClick={() => setFilter('school')}
        >
          School ({(showResolved ? resolvedIssues : unresolvedIssues).filter(i => i.section === 'school').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'center' ? 'active' : ''}`}
          onClick={() => setFilter('center')}
        >
          Center ({(showResolved ? resolvedIssues : unresolvedIssues).filter(i => i.section === 'center').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'admin' ? 'active' : ''}`}
          onClick={() => setFilter('admin')}
        >
          Admin ({(showResolved ? resolvedIssues : unresolvedIssues).filter(i => i.section === 'admin').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'general' ? 'active' : ''}`}
          onClick={() => setFilter('general')}
        >
          General ({(showResolved ? resolvedIssues : unresolvedIssues).filter(i => i.section === 'general').length})
        </button>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{showResolved ? '✓' : '📋'}</div>
          <h3>{showResolved ? 'No Resolved Issues' : 'No Issues Found'}</h3>
          <p>{showResolved ? 'There are no resolved issues in this category.' : 'There are no reported issues in this category.'}</p>
        </div>
      ) : (
        <div className="issues-list">
          {filteredIssues.map(issue => {
            const daysLeft = getDaysUntilDeletion(issue.resolved_at);
            return (
              <div key={issue.id} className={`issue-card ${issue.is_resolved ? 'resolved' : ''}`}>
                <div className="issue-header">
                  <div className="issue-meta">
                    <span className={`issue-section ${issue.section}`}>
                      {issue.section}
                    </span>
                    <span className="issue-date">{formatDate(issue.created_at)}</span>
                    {issue.is_resolved ? (
                      <span className="resolved-badge">
                        ✓ Resolved {daysLeft !== null && daysLeft > 0 ? `(Deletes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''})` : ''}
                      </span>
                    ) : null}
                  </div>
                  <div className="issue-actions">
                    {!issue.is_resolved && (
                      <button 
                        onClick={() => handleResolve(issue.id)}
                        className="btn-sm btn-success"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {canDelete && (
                      <button 
                        onClick={() => handleDelete(issue.id)}
                        className="btn-sm btn-delete"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="issue-title">{issue.title}</h3>
                {issue.subsections && (
                  <div className="issue-subsections">
                    {issue.subsections.split(', ').map((sub, idx) => (
                      <span key={idx} className="subsection-tag">{sub}</span>
                    ))}
                  </div>
                )}
                <p className="issue-description">{issue.description}</p>
                
                <div className="issue-footer">
                  <div className="reporter-info">
                    <strong>Reported by:</strong> {issue.first_name} {issue.last_name}
                    {issue.email ? ` (${issue.email})` : ''}
                    {issue.role_name ? ` - ${issue.role_name}` : ''}
                  </div>
                  {issue.is_resolved && issue.resolver_first_name ? (
                    <div className="resolver-info">
                      <strong>Resolved by:</strong> {issue.resolver_first_name} {issue.resolver_last_name}
                      {issue.resolved_at ? ` on ${formatDate(issue.resolved_at)}` : ''}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Issues;
