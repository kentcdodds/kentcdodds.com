import * as React from 'react'
import {createMachine, assign} from 'xstate'
import {useMachine} from '@xstate/react'
import {inspect} from '@xstate/inspect'
import {assertNonNull} from '../utils/misc'

const devTools = false

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (devTools && typeof window !== 'undefined') {
  inspect({iframe: false})
}

function stopMediaRecorder(mediaRecorder: MediaRecorder | null) {
  if (!mediaRecorder) return

  if (mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }

  for (const track of mediaRecorder.stream.getAudioTracks()) {
    if (track.enabled) {
      track.stop()
    }
  }
  mediaRecorder.ondataavailable = null
}

interface RecorderContext {
  audioDevices: Array<MediaDeviceInfo>
  selectedAudioDevice: MediaDeviceInfo | null
  mediaStream: MediaStream | null
  mediaRecorder: MediaRecorder | null
  chunks: Array<BlobPart>
  audioBlob: Blob | null
}

const recorderMachine = createMachine<RecorderContext>(
  {
    id: 'recorder',
    initial: 'gettingMediaStream',
    context: {
      audioDevices: [],
      selectedAudioDevice: null,
      mediaStream: null,
      mediaRecorder: null,
      chunks: [],
      audioBlob: null,
    },
    states: {
      gettingDevices: {
        invoke: {
          src: 'getDevices',
          // TODO: add onError
        },
        on: {
          DEVICES_GOTTEN: {
            target: 'deviceSelection',
            actions: ['setAudioDevices'],
          },
        },
      },
      deviceSelection: {
        on: {
          DEVICE_SELECTED: {
            target: 'gettingMediaStream',
            actions: ['setSelectedAudioDevice'],
          },
        },
      },
      gettingMediaStream: {
        invoke: {
          src: 'getMediaStream',
          // TODO: add onError
        },
        on: {
          MEDIA_STREAM_GOTTEN: {
            target: 'ready',
            actions: ['setMediaStream', 'setMediaRecorder'],
          },
        },
      },
      ready: {
        on: {
          START_RECORDING: {
            target: 'recording',
            actions: ['mediaRecorder.start'],
          },
          CHANGE_AUDIO_DEVICE: {
            target: 'gettingDevices',
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
            target: 'stopped',
            actions: ['chunks.push'],
          },
        },
      },
      stopped: {
        entry: ['generateAudioContext', 'stopMediaRecorder'],
        on: {
          RE_RECORD: {
            target: 'gettingMediaStream',
            actions: ['chunks.clear'],
          },
        },
      },
    },
  },
  {
    services: {
      getDevices: () => async send => {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioDevices = devices.filter(({kind}) => kind === 'audioinput')
        send({type: 'DEVICES_GOTTEN', audioDevices})
      },
      getMediaStream: context => async send => {
        const deviceId = context.selectedAudioDevice?.deviceId
        const audio = deviceId ? {deviceId: {exact: deviceId}} : true
        const mediaStream = await window.navigator.mediaDevices.getUserMedia({
          audio,
        })
        const mediaRecorder = new MediaRecorder(mediaStream)
        mediaRecorder.ondataavailable = event => {
          send({type: 'DATA_RECEIVED', data: event.data})
        }
        send({type: 'MEDIA_STREAM_GOTTEN', mediaStream, mediaRecorder})
      },
    },
    actions: {
      setAudioDevices: assign({
        audioDevices: (context, event) => event.audioDevices,
      }),
      setSelectedAudioDevice: assign({
        selectedAudioDevice: (context, event) => event.selectedAudioDevice,
      }),
      setMediaStream: assign({
        mediaStream: (context, event) => event.mediaStream,
      }),
      setMediaRecorder: assign({
        mediaRecorder: (context, event) => event.mediaRecorder,
      }),
      'chunks.push': assign({
        chunks: (context, event) => [...context.chunks, event.data],
      }),
      'chunks.clear': assign({
        chunks: _context => [],
      }),
      stopMediaRecorder(context) {
        stopMediaRecorder(context.mediaRecorder)
      },
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
        audioBlob: context =>
          new Blob(context.chunks, {
            type: 'audio/mp3',
          }),
      }),
    },
  },
)

function CallRecorder({
  onRecordingComplete,
}: {
  onRecordingComplete: (audio: Blob) => void
}) {
  const [state, send] = useMachine(recorderMachine, {devTools})
  const {audioBlob} = state.context

  // TODO: figure out how to make the state machine do this cleanup for us
  const latestStateRef = React.useRef(state)
  React.useEffect(() => {
    latestStateRef.current = state
  }, [state])
  React.useEffect(() => {
    return () => {
      stopMediaRecorder(latestStateRef.current.context.mediaRecorder)
    }
  }, [])

  const audioURL = React.useMemo(() => {
    if (audioBlob) {
      return window.URL.createObjectURL(audioBlob)
    } else {
      return null
    }
  }, [audioBlob])

  let deviceSelection = null
  if (state.matches('gettingDevices')) {
    deviceSelection = <div>Loading devices</div>
  }

  if (state.matches('deviceSelection')) {
    deviceSelection = (
      <div>
        Select your device:
        <ul>
          {state.context.audioDevices.length
            ? state.context.audioDevices.map(device => (
                <li key={device.deviceId}>
                  <button
                    onClick={() => {
                      send({
                        type: 'DEVICE_SELECTED',
                        selectedAudioDevice: device,
                      })
                    }}
                    style={{
                      fontWeight:
                        state.context.selectedAudioDevice === device
                          ? 'bold'
                          : 'normal',
                    }}
                  >
                    {device.label}
                  </button>
                </li>
              ))
            : 'No audio devices found'}
        </ul>
      </div>
    )
  }

  let audioPreview = null
  if (state.matches('stopped')) {
    assertNonNull(
      audioURL,
      `The state machine is in "stopped" state but there's no audioURL. This should be impossible.`,
    )
    assertNonNull(
      audioBlob,
      `The state machine is in "stopped" state but there's no audioBlob. This should be impossible.`,
    )
    audioPreview = (
      <div>
        <audio src={audioURL} controls />
        <button onClick={() => onRecordingComplete(audioBlob)}>Accept</button>
        <button onClick={() => send({type: 'RE_RECORD'})}>Re-record</button>
      </div>
    )
  }

  return (
    <div>
      {state.matches('ready') ? (
        <button onClick={() => send({type: 'CHANGE_AUDIO_DEVICE'})}>
          Change audio device from{' '}
          {state.context.selectedAudioDevice?.label ?? 'default'}
        </button>
      ) : null}
      {deviceSelection}
      {!state.matches('stopped') && state.context.mediaStream ? (
        <StreamVis stream={state.context.mediaStream} />
      ) : null}
      {state.matches('ready') ? (
        <button onClick={() => send({type: 'START_RECORDING'})}>Start</button>
      ) : state.matches('paused') ? (
        <button onClick={() => send({type: 'RESUME'})}>Resume</button>
      ) : state.matches('recording') ? (
        <>
          <button onClick={() => send({type: 'STOP'})}>Stop</button>
          <button onClick={() => send({type: 'PAUSE'})}>Pause</button>
        </>
      ) : state.matches('stopping') ? (
        <div>Processing...</div>
      ) : null}
      {audioPreview}
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
