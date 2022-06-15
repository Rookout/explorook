import React from 'react';
import { Text } from './EmptyStateText'

export const EmptyState = () => {
  return (
    <div style={{ width: "100%", height: "100%", textAlign: 'center', display: 'flex' }}>
      <div style={{ margin: 'auto', display:'flex', flexDirection:'row' }}>
        <img style={{ width: 120, height: 140, paddingRight: 10 }} src={process.env.PUBLIC_URL+"/bird-on-folder.png"}></img>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ marginBottom: "5px", marginTop: "55px" }}>Sweet! Rookout desktop app</Text>
          <Text style={{ marginTop: 0 }}>is up and running in the background</Text>
        </div>
      </div>
    </div>
  );
}
