import React, { memo } from 'react';
import PropTypes from 'prop-types';

function ExperimentCard({ experiment, onLoad, onShare }) {
  const author = experiment.authorId?.username || experiment.author?.username || 'Unknown';
  const date = experiment.createdAt ? new Date(experiment.createdAt).toLocaleDateString() : '';

  return (
    <article className="experiment-card">
      <div className="experiment-thumb">
        {experiment.thumbnail ? <img src={experiment.thumbnail} alt="" /> : <span>{experiment.title?.slice(0, 1) || 'V'}</span>}
      </div>
      <div className="experiment-body">
        <h3>{experiment.title}</h3>
        <p>{experiment.description || 'No description provided.'}</p>
        <div className="tag-row">
          {(experiment.tags || []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="experiment-meta">
          <span>{author}</span>
          <span>{date}</span>
        </div>
        <div className="experiment-actions">
          <button type="button" onClick={() => onLoad(experiment)}>Load</button>
          <button type="button" onClick={() => onShare(experiment)}>Share</button>
        </div>
      </div>
    </article>
  );
}

ExperimentCard.propTypes = {
  experiment: PropTypes.object.isRequired,
  onLoad: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
};

export default memo(ExperimentCard);
