import React from 'react'

const Text = ({ style, children, ...props }) => {
  return (
    <p
      style={{
        fontSize: 16,
        fontWeight: 500,
        width: 'fit-content',
        color: '#B6C8D4',
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  )
}

export const EmptyState = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        textAlign: 'center',
        display: 'flex',
      }}
    >
      <div style={{ margin: 'auto', display: 'flex', flexDirection: 'row' }}>
        <img
          style={{ width: 120, height: 140, paddingRight: 10 }}
          src={process.env.PUBLIC_URL + '/bird-on-folder.png'}
        ></img>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ marginBottom: '5px', marginTop: '55px' }}>
            Sweet! Rookout desktop app is up and
          </Text>
          <Text style={{ marginTop: 0 }}>and running in the background</Text>
        </div>
      </div>
    </div>
  )
}
