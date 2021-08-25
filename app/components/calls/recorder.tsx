import * as React from 'react'
import {createMachine, assign, send as sendUtil} from 'xstate'
import {useMachine} from '@xstate/react'
import {inspect} from '@xstate/inspect'
import {assertNonNull} from '~/utils/misc'
import {Button, LinkButton} from '../button'
import {Paragraph} from '../typography'
import {Tag} from '../tag'
import {MicrophoneIcon} from '../icons/microphone-icon'
import {SquareIcon} from '../icons/square-icon'
import {PauseIcon} from '../icons/pause-icon'
import {TriangleIcon} from '../icons/triangle-icon'

const devTools = false

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (devTools && typeof window !== 'undefined') {
  inspect({iframe: false})
}

function stopMediaRecorder(mediaRecorder: MediaRecorder) {
  if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()

  for (const track of mediaRecorder.stream.getAudioTracks()) {
    if (track.enabled) track.stop()
  }
  mediaRecorder.ondataavailable = null
}

interface RecorderContext {
  mediaRecorder: MediaRecorder | null
  audioDevices: Array<MediaDeviceInfo>
  selectedAudioDevice: MediaDeviceInfo | null
  audioBlob: Blob | null
}

const recorderMachine = createMachine<RecorderContext>(
  {
    id: 'recorder',
    context: {
      mediaRecorder: null,
      audioDevices: [],
      selectedAudioDevice: null,
      audioBlob: null,
    },
    initial: 'gettingDevices',
    states: {
      gettingDevices: {
        invoke: {
          src: 'getDevices',
          onDone: {target: 'ready', actions: 'assignAudioDevices'},
          onError: '', // TODO
        },
      },
      selecting: {
        on: {
          selection: {target: 'ready', actions: 'assignSelectedAudioDevice'},
        },
      },
      ready: {
        on: {
          changeDevice: 'selecting',
          start: 'recording',
        },
      },
      recording: {
        invoke: {src: 'mediaRecorder'},
        initial: 'playing',
        states: {
          playing: {
            on: {
              mediaRecorderCreated: {
                actions: ['assignMediaRecorder'],
              },
              pause: {
                target: 'paused',
                actions: sendUtil('pause', {to: 'mediaRecorder'}),
              },
              stop: 'stopping',
            },
          },
          paused: {
            on: {
              resume: {
                target: 'playing',
                actions: sendUtil('resume', {to: 'mediaRecorder'}),
              },
              stop: 'stopping',
            },
          },
          stopping: {
            entry: sendUtil('stop', {to: 'mediaRecorder'}),
            on: {
              chunks: {target: '#recorder.done', actions: 'assignAudioBlob'},
            },
          },
        },
      },
      done: {
        on: {
          restart: 'ready',
        },
      },
    },
  },
  {
    services: {
      getDevices: async () => {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.filter(({kind}) => kind === 'audioinput')
      },
      mediaRecorder: context => (sendBack, receive) => {
        let mediaRecorder: MediaRecorder

        async function go() {
          const chunks: Array<BlobPart> = []
          const deviceId = context.selectedAudioDevice?.deviceId
          const audio = deviceId ? {deviceId: {exact: deviceId}} : true
          const mediaStream = await window.navigator.mediaDevices.getUserMedia({
            audio,
          })
          mediaRecorder = new MediaRecorder(mediaStream)
          sendBack({type: 'mediaRecorderCreated', mediaRecorder})

          mediaRecorder.ondataavailable = event => {
            chunks.push(event.data)
            if (mediaRecorder.state === 'inactive') {
              sendBack({
                type: 'chunks',
                blob: new Blob(chunks, {
                  type: 'audio/mp3',
                }),
              })
            }
          }

          mediaRecorder.start()

          receive(event => {
            if (event.type === 'pause') {
              mediaRecorder.pause()
            } else if (event.type === 'resume') {
              mediaRecorder.resume()
            } else if (event.type === 'stop') {
              mediaRecorder.stop()
            }
          })
        }

        void go()

        return () => {
          stopMediaRecorder(mediaRecorder)
        }
      },
    },
    actions: {
      assignAudioDevices: assign({
        audioDevices: (context, event) => event.data,
      }),
      assignSelectedAudioDevice: assign({
        selectedAudioDevice: (context, event) => event.selectedAudioDevice,
      }),
      assignMediaRecorder: assign({
        mediaRecorder: (context, event) => event.mediaRecorder,
      }),
      assignAudioBlob: assign({
        audioBlob: (context, event) => event.blob,
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

  const audioURL = React.useMemo(() => {
    if (audioBlob) {
      return window.URL.createObjectURL(audioBlob)
    } else {
      return null
    }
  }, [audioBlob])

  let deviceSelection = null
  if (state.matches('gettingDevices')) {
    deviceSelection = <Paragraph>Loading devices</Paragraph>
  }

  if (state.matches('selecting')) {
    deviceSelection = (
      <div>
        <Paragraph className="mb-8">Select your device:</Paragraph>
        <ul>
          {state.context.audioDevices.length
            ? state.context.audioDevices.map(device => (
                <li key={device.deviceId}>
                  <Tag
                    onClick={() => {
                      send({
                        type: 'selection',
                        selectedAudioDevice: device,
                      })
                    }}
                    tag={device.label}
                    selected={state.context.selectedAudioDevice === device}
                  />
                </li>
              ))
            : 'No audio devices found'}
        </ul>
      </div>
    )
  }

  let audioPreview = null
  if (state.matches('done')) {
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
        <div className="mb-4">
          <audio src={audioURL} controls />
        </div>
        <div className="flex flex-wrap gap-4">
          <Button size="medium" onClick={() => onRecordingComplete(audioBlob)}>
            Accept
          </Button>
          <Button
            size="medium"
            variant="secondary"
            onClick={() => send({type: 'restart'})}
          >
            Re-record
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div>
        {state.matches('ready') ? (
          <div className="flex flex-col gap-12">
            <Paragraph>
              {`Current recording device: `}
              <LinkButton
                onClick={() => send({type: 'changeDevice'})}
                className="truncate"
                style={{maxWidth: '80vw'}}
              >
                {state.context.selectedAudioDevice?.label ?? 'default'}
              </LinkButton>
            </Paragraph>
            <Button size="medium" onClick={() => send({type: 'start'})}>
              <MicrophoneIcon />
              <span>Start recording</span>
            </Button>
          </div>
        ) : null}
        {deviceSelection}
      </div>

      {state.matches('recording') && state.context.mediaRecorder ? (
        <div className="mb-4">
          <StreamVis stream={state.context.mediaRecorder.stream} />
        </div>
      ) : null}

      {state.matches('recording.playing') ? (
        <div className="flex flex-wrap gap-4">
          <Button size="medium" onClick={() => send({type: 'stop'})}>
            <SquareIcon /> <span>Stop</span>
          </Button>
          <Button
            size="medium"
            variant="secondary"
            onClick={() => send({type: 'pause'})}
          >
            <PauseIcon /> <span>Pause</span>
          </Button>
        </div>
      ) : state.matches('recording.paused') ? (
        <div className="flex flex-wrap gap-4">
          <Button size="medium" onClick={() => send({type: 'stop'})}>
            <SquareIcon /> <span>Stop</span>
          </Button>
          <Button size="medium" onClick={() => send({type: 'resume'})}>
            <TriangleIcon /> <span>Resume</span>
          </Button>
        </div>
      ) : state.matches('recording.stopping') ? (
        <Paragraph>Processing...</Paragraph>
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
      })
    }
    reqDraw()
    return () => {
      cancelAnimationFrame(lastReq)
    }
  }, [stream])
  return <canvas className="rounded-lg" ref={canvasRef} />
}

export {CallRecorder}
