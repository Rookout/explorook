import React from 'react';


export const Text = ({ style, children, ...props }) => {
  return <p style={{fontSize: 16, fontWeight: 500, width: 'fit-content', color: '#B6C8D4', ...style }} {...props}>{children}</p>
}