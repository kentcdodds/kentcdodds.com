import * as React from 'react'

function TheSpectrumOfAbstraction() {
  return (
    <div style={{width: '100%', marginTop: 10, marginBottom: 40}}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '1.5em',
          textAlign: 'center',
          lineHeight: 1.2,
          marginBottom: 4,
        }}
      >
        <div style={{color: 'rgb(94, 49, 220)'}}>
          <strong style={{display: 'block'}}>ANA</strong>
          <small style={{display: 'block', fontSize: '0.5em'}}>
            (Absolutely No Abstraction)
          </small>
        </div>
        <div style={{color: 'rgb(71,67,220)'}}>
          <strong style={{display: 'block'}}>AHA</strong>
          <small style={{display: 'block', fontSize: '0.5em'}}>
            (Avoid Hasty Abstraction)
          </small>
        </div>
        <div style={{color: 'rgb(49, 85, 220)'}}>
          <strong style={{display: 'block'}}>DRY</strong>
          <small
            style={{display: 'block', fontSize: '0.5em'}}
          >{`(Don't Repeat Yourself)`}</small>
        </div>
      </div>
      <div
        style={{
          width: '100%',
          height: 20,
          backgroundImage:
            'linear-gradient(-213deg, rgb(94, 49, 220) 0%, rgb(49, 85, 220) 100%)',
        }}
      />
      <div
        style={{
          marginTop: 10,
          color: 'rgb(71,67,220)',
          background:
            'linear-gradient(-213deg, rgb(94, 49, 220) 0%, rgb(49, 85, 220) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '1.8em',
        }}
      >
        <strong>T</strong>
        <strong>h</strong>
        <strong>e</strong>
        <strong />
        <strong>S</strong>
        <strong>p</strong>
        <strong>e</strong>
        <strong>c</strong>
        <strong>t</strong>
        <strong>r</strong>
        <strong>u</strong>
        <strong>m</strong>
        <strong />
        <strong>o</strong>
        <strong>f</strong>
        <strong />
        <strong>A</strong>
        <strong>b</strong>
        <strong>s</strong>
        <strong>t</strong>
        <strong>r</strong>
        <strong>a</strong>
        <strong>c</strong>
        <strong>t</strong>
        <strong>i</strong>
        <strong>o</strong>
        <strong>n</strong>
      </div>
    </div>
  )
}

export default TheSpectrumOfAbstraction
