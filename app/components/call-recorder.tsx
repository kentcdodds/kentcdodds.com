import * as React from 'react'
import {createMachine, assign} from 'xstate'
import {useMachine} from '@xstate/react'

interface RecorderContext {
  mediaStream?: MediaStream
  mediaRecorder?: MediaRecorder
  chunks: Array<BlobPart>
  audioURL?: string
}

const recorderMachine = createMachine<RecorderContext>(
  {
    id: 'recorder',
    initial: 'startup',
    context: {
      mediaStream: undefined,
      mediaRecorder: undefined,
      chunks: [],
      audioURL: undefined,
    },
    states: {
      startup: {
        on: {
          READY: {
            target: 'ready',
            actions: assign({
              mediaStream: (context, event) => event.mediaStream,
              mediaRecorder: (context, event) => event.mediaRecorder,
            }),
          },
        },
      },
      ready: {
        initial: 'idle',
        invoke: {
          src: 'mediaRecorder.consumeData',
        },
        states: {
          idle: {
            on: {
              START: {
                target: 'recording',
                actions: ['mediaRecorder.start'],
              },
            },
          },
          recording: {
            on: {
              PAUSE: {
                target: 'paused',
                actions: ['mediaRecorder.pause'],
              },
              STOP: {
                target: 'stopping',
                actions: ['mediaRecorder.stop'],
              },
              DATA_RECEIVED: {
                actions: ['chunks.push'],
              },
            },
          },
          paused: {
            on: {
              RESUME: {
                target: 'recording',
                actions: ['mediaRecorder.resume'],
              },
              STOP: {
                target: 'stopping',
                actions: ['mediaRecorder.stop'],
              },
            },
          },
          stopping: {
            on: {
              DATA_RECEIVED: {
                target: '#stopped',
                actions: ['chunks.push'],
              },
            },
          },
        },
      },
      stopped: {
        id: 'stopped',
        entry: ['generateAudioContext'],
      },
    },
  },
  {
    services: {
      'mediaRecorder.consumeData': context => send => {
        if (!context.mediaRecorder) return
        context.mediaRecorder.ondataavailable = event => {
          send({type: 'DATA_RECEIVED', data: event.data})
        }
      },
    },
    actions: {
      'chunks.push': assign({
        chunks: (context, event) => [...context.chunks, event.data],
      }),
      'mediaRecorder.start'(context) {
        context.mediaRecorder?.start()
      },
      'mediaRecorder.pause'(context) {
        context.mediaRecorder?.pause()
      },
      'mediaRecorder.resume'(context) {
        context.mediaRecorder?.resume()
      },
      'mediaRecorder.stop'(context) {
        context.mediaRecorder?.stop()
      },
      generateAudioContext: assign({
        audioURL(context) {
          const blob = new Blob(context.chunks, {
            type: 'audio/mp3',
          })
          return window.URL.createObjectURL(blob)
        },
      }),
    },
  },
)

function CallRecorder({
  onRecordingComplete,
}: {
  onRecordingComplete: (audio: Blob) => void
}) {
  const [state, send] = useMachine(recorderMachine)

  React.useEffect(() => {
    window.navigator.mediaDevices.getUserMedia({audio: true}).then(
      mediaStream => {
        send('READY', {
          mediaStream,
          mediaRecorder: new MediaRecorder(mediaStream),
        })
      },
      error => {
        console.log('error getting the media device', error)
      },
    )
  }, [send])

  React.useEffect(() => {
    if (state.matches('stopped')) {
      onRecordingComplete(
        new Blob(state.context.chunks, {
          type: 'audio/mp3',
        }),
      )
    }
  }, [onRecordingComplete, state])

  return (
    <div>
      {state.matches('ready') && state.context.mediaStream ? (
        <StreamVis stream={state.context.mediaStream} />
      ) : state.context.mediaStream ? null : (
        'waiting for stream'
      )}
      {state.matches('startup') ? (
        <div>loading...</div>
      ) : state.matches('ready.idle') ? (
        <button onClick={() => send('START')}>Start</button>
      ) : state.matches('ready.paused') ? (
        <button onClick={() => send('RESUME')}>Resume</button>
      ) : state.matches('ready.recording') ? (
        <>
          <button onClick={() => send('STOP')}>Stop</button>
          <button onClick={() => send('PAUSE')}>Pause</button>
        </>
      ) : state.matches('stopping') ? (
        <div>Processing...</div>
      ) : state.matches('stopped') ? (
        <audio src={state.context.audioURL} controls />
      ) : (
        `unhandled state: ${JSON.stringify(state.value)}`
      )}
    </div>
  )
}

function visualize(canvas: HTMLCanvasElement, stream: MediaStream) {
  const audioCtx = new AudioContext()
  const canvasCtx = canvas.getContext('2d')

  const source = audioCtx.createMediaStreamSource(stream)

  const analyser = audioCtx.createAnalyser()
  analyser.fftSize = 2048
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  source.connect(analyser)

  function draw() {
    if (!canvasCtx) return
    const WIDTH = canvas.width
    const HEIGHT = canvas.height

    analyser.getByteTimeDomainData(dataArray)

    canvasCtx.fillStyle = 'rgb(180, 180, 180)'
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

    canvasCtx.lineWidth = 2
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)'

    canvasCtx.beginPath()

    const sliceWidth = (WIDTH * 1.0) / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = (dataArray[i] ?? 0) / 128.0
      const y = (v * HEIGHT) / 2

      if (i === 0) {
        canvasCtx.moveTo(x, y)
      } else {
        canvasCtx.lineTo(x, y)
      }

      x += sliceWidth
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2)
    canvasCtx.stroke()
  }

  return draw
}

function StreamVis({stream}: {stream: MediaStream}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    if (!canvasRef.current) return () => {}
    const draw = visualize(canvasRef.current, stream)
    let lastReq: number
    function reqDraw() {
      lastReq = requestAnimationFrame(() => {
        draw()
        reqDraw()
        // TODO: this happens too frequently...
      })
    }
    reqDraw()
    return () => {
      cancelAnimationFrame(lastReq)
    }
  }, [stream])
  return <canvas ref={canvasRef} />
}

export {CallRecorder}
