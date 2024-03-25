import React from 'react';


export const Text = ({ style, children, ...props }) => {
  return <p style={{width: 'fit-content', color: '#56588980', fontWeight: 500, fontSize: 20, ...style }} {...props}>{children}</p>
}
