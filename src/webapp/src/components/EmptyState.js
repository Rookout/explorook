import React from 'react';
import { Text } from './EmptyStateText'

export const EmptyState = () => {
  return (
    <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center', display: 'flex', color: '#56588980', fontWeight: 500 }}>
          App is up and running in the background
    </div>
  );
}
