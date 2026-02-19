import { useState, useEffect } from 'react';
import { useNotificationContext } from '../../context/NotificationContext';
import api from '../../api/axios';
import '../../styles/help.css';

const MyIssues = ({ onBack }) => {
  const { showError } = useNotificationContext();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    loadMyIssues();
  }, []);

  const loadMyIssues = async () => {
    setLoading(true);
    try {
      const res = await api.get('/help/my-issues');
      setIssues(res.data);
    } catch (err) {
      showError('Failed to load your issues');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredIssues = issues.filter(i => showResolved ? i.is_resolved : !i.is_resolved);

  if (loading) {
    return (
      <div className="my-issues-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your issues...</p>
        </div>
      </div>
    );
  }

  const unresolvedIssues = issues.filter(i => !i.is_resolved);
  const resolvedIssues = issues.filter(i => i.is_resolved);

  return (
    <div className="my-issues-page">
      <div className="my-issues-header">
        <div className="my-issues-header-left">
          <button onClick={onBack} className="btn-back">
            ← Back to Help
          </button>
          <h2>My Reported Issues</h2>
        </div>
        <div className="issue-toggle">
          <button 
            className={`toggle-btn ${!showResolved ? 'active' : ''}`}
            onClick={() => setShowResolved(false)}
          >
            Pending ({unresolvedIssues.length})
          </button>
          <button 
            className={`toggle-btn ${showResolved ? 'active' : ''}`}
            onClick={() => setShowResolved(true)}
          >
            Resolved ({resolvedIssues.length})
          </button>
        </div>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{showResolved ? '✓' : '📋'}</div>
          <h3>{showResolved ? 'No Resolved Issues' : 'No Pending Issues'}</h3>
          <p>{showResolved ? 'You have no resolved issues.' : 'You have not reported any issues yet.'}</p>
        </div>
      ) : (
        <div className="my-issues-list">
          {filteredIssues.map(issue => {
            const daysLeft = getDaysUntilDeletion(issue.resolved_at);
            return (
              <div key={issue.id} className={`my-issue-card ${issue.is_resolved ? 'resolved' : ''}`}>
                <div className="my-issue-header">
                  <div className="my-issue-meta">
                    <span className={`issue-section ${issue.section}`}>
                      {issue.section}
                    </span>
                    <span className="issue-date">{formatDate(issue.created_at)}</span>
                    {issue.is_resolved ? (
                      <span className="resolved-badge">
                        ✓ Resolved {daysLeft !== null && daysLeft > 0 ? `(Deletes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''})` : ''}
                      </span>
                    ) : (
                      <span className="pending-badge">
                        ⏳ Pending
                      </span>
                    )}
                  </div>
                </div>
                
                <h3 className="my-issue-title">{issue.title}</h3>
                {issue.subsections && (
                  <div className="issue-subsections">
                    {issue.subsections.split(', ').map((sub, idx) => (
                      <span key={idx} className="subsection-tag">{sub}</span>
                    ))}
                  </div>
                )}
                <p className="my-issue-description">{issue.description}</p>
                
                {issue.is_resolved ? (
                  <div className="my-issue-footer">
                    <div className="resolver-info">
                      <strong>Resolved by:</strong> {issue.resolver_first_name} {issue.resolver_last_name}
                      {issue.resolved_at ? ` on ${formatDate(issue.resolved_at)}` : ''}
                      {issue.resolution_message ? (
                        <div className="resolution-message">
                          <strong>Resolution:</strong> {issue.resolution_message}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyIssues;
