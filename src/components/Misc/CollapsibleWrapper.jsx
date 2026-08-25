import React, { useState } from 'react';

const CollapsibleWrapper = ({ title, children, defaultCollapsed = false }) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>{title}</span>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={styles.toggleBtn}
        >
          {collapsed ? '▼ Show' : '▲ Hide'}
        </button>
      </div>
      {!collapsed && <div style={styles.body}>{children}</div>}
    </div>
  );
};

const styles = {
  wrapper: {
    border: '1px solid #444',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 10px',
    backgroundColor: 'var(--header-bg, #2a2a2a)',
    color: 'var(--header-text, #fff)',
  },
  headerTitle: { fontWeight: 'bold', fontSize: '13px' },
  toggleBtn: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#555',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  body: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    color: 'black',
    padding: '10px',
  },
};

export default CollapsibleWrapper;