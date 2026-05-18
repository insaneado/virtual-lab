import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';

function SaveExperimentModal({ open, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="save-dialog"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            title,
            description,
            tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          });
          setTitle('');
          setDescription('');
          setTags('');
        }}
      >
        <header className="panel-header">
          <strong>Save Current Lab</strong>
          <button type="button" className="icon-btn" onClick={onClose}>X</button>
        </header>
        <label className="field">
          <span>Title</span>
          <input value={title} required maxLength={120} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="field">
          <span>Tags</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="pendulum, energy" />
        </label>
        <button className="primary-btn" type="submit">Save</button>
      </form>
    </div>
  );
}

SaveExperimentModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default memo(SaveExperimentModal);
