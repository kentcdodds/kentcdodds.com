import {useMachine} from '@xstate/react'
import gsap from 'gsap'
import * as React from 'react'
import {assign, createMachine, send as sendUtil} from 'xstate'
import type {OptionalTeam} from '~/types'
import {assertNonNull, getOptionalTeam} from '~/utils/misc'
import {Button, LinkButton} from '../button'
import {useInterval} from '../hooks/use-interval'
import {MicrophoneIcon, PauseIcon, SquareIcon, TriangleIcon} from '../icons'
import {Tag} from '../tag'
import {Paragraph} from '../typography'

// Play around with these values to affect the audio visualisation.
// Should be able to stream the visualisation back no problem.
const MIN_BAR_HEIGHT = 2
const MAX_BAR_HEIGHT = 100
const SHIFT_SPEED = 4
const SHIFT_PER_SECOND = 130
const SHIFT_DELAY = 0.05
const GROW_SPEED = 0.25
const GROW_DELAY = 0
const BAR_WIDTH = 4
const colorsByTeam: Record<OptionalTeam, [string, string, string]> = {
  RED: ['#FF9393', '#FF4545', '#BA0808'],
  BLUE: ['#8CCAFE', '#36A4FF', '#018AFB'],
  YELLOW: ['#FFE792', '#FFD644', '#BA9308'],
  UNKNOWN: ['#C4C4C4', '#8C8C8C', '#4C4C4C'],
}

const theme = {
  minBarHeight: MIN_BAR_HEIGHT,
  maxBarHeight: MAX_BAR_HEIGHT,
  shiftSpeed: SHIFT_SPEED,
  shiftPerSecond: SHIFT_PER_SECOND,
  shiftDelay: SHIFT_DELAY,
  growSpeed: GROW_SPEED,
  growDelay: GROW_DELAY,
  barWidth: BAR_WIDTH,
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
    predictableActionArguments: true,
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
          onError: {target: 'error'},
        },
      },
      selecting: {
        on: {
          selection: {target: 'ready', actions: 'assignSelectedAudioDevice'},
        },
      },
      error: {
        on: {
          retry: 'gettingDevices',
        },
      },
      ready: {
        on: {
          changeDevice: 'selecting',
          start: 'recording',
        },
      },
      recording: {
        invoke: {src: 'mediaRecorder', id: 'mediaRecorder'},
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
  team,
}: {
  onRecordingComplete: (audio: Blob) => void
  team: string
}) {
  const [state, send] = useMachine(recorderMachine)
  const [timer, setTimer] = React.useState<number>(0)
  const metadataRef = React.useRef<Array<number>>([])
  const playbackRef = React.useRef<HTMLAudioElement | null>(null)
  const {audioBlob} = state.context

  const audioURL = React.useMemo(() => {
    if (audioBlob) {
      return window.URL.createObjectURL(audioBlob)
    } else {
      return null
    }
  }, [audioBlob])

  useInterval(
    () => {
      setTimer(timer + 1)
    },
    state.matches('recording.playing') ? 1000 : 0,
  )

  React.useEffect(() => {
    if (state.matches('done')) {
      setTimer(0)
    }
  }, [state])

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

  if (state.matches('error')) {
    deviceSelection = (
      <div>
        <Paragraph className="mb-8">
          An error occurred while loading recording devices.
        </Paragraph>
        <Button onClick={() => send('retry')}>Try again</Button>
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
          <audio src={audioURL} controls ref={playbackRef} preload="metadata" />
        </div>
        <StreamVis
          metadata={metadataRef}
          replay={true}
          paused={state.matches('recording.paused')}
          playbackRef={playbackRef}
          team={team}
        />
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
              <span id="device-label">{`Current recording device: `}</span>
              <LinkButton
                onClick={() => send({type: 'changeDevice'})}
                className="truncate"
                style={{maxWidth: '80vw'}}
                aria-labelledby="device-label"
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
          <StreamVis
            metadata={metadataRef}
            stream={state.context.mediaRecorder.stream}
            paused={state.matches('recording.paused')}
            playbackRef={playbackRef}
            team={team}
          />
          <RecordingTime timer={timer} />
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

const generateGradient = ({
  width,
  height,
  context,
  colors,
}: {
  width: number
  height: number
  context: CanvasRenderingContext2D
  colors: [string, string, string]
}) => {
  const fillStyle = context.createLinearGradient(
    width / 2,
    0,
    width / 2,
    height,
  )
  // Color stop is three colors
  fillStyle.addColorStop(0, colors[2])
  fillStyle.addColorStop(1, colors[2])
  fillStyle.addColorStop(0.35, colors[1])
  fillStyle.addColorStop(0.65, colors[1])
  fillStyle.addColorStop(0.5, colors[0])
  return fillStyle
}

function redraw({
  canvas,
  nodes,
}: {
  canvas: HTMLCanvasElement
  nodes: Array<{
    growth: number
    size: number
    x: number
  }>
}) {
  const {minBarHeight, barWidth} = theme

  const canvasCtx = canvas.getContext('2d')

  function draw() {
    if (!canvasCtx) return
    const WIDTH = canvas.width
    const HEIGHT = canvas.height

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)
    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n]
      if (!node) continue

      canvasCtx.fillRect(
        node.x,
        HEIGHT / 2 - Math.max(minBarHeight, node.size) / 2,
        barWidth,
        Math.max(minBarHeight, node.size),
      )
    }
  }

  return draw
}

/**
 * 1. Create a node object
 * 2. Push it to an Array
 * 3. Create an insertion point
 * 4. Add to a timeline
 */

const addToTimeline = ({
  timeline,
  width,
  nodes,
  onStart,
  size,
  insert,
}: {
  timeline: gsap.core.Timeline
  width: number
  nodes: Array<{
    growth: number
    size: number
    x: number
  }>
  onStart: () => void
  size: number
  insert: number
}) => {
  const {shiftDelay, barWidth, growDelay, growSpeed, shiftPerSecond} = theme

  // Generate new node
  const newNode = {
    growth: size,
    size: 0,
    x: width,
  }

  // Add it in
  nodes.push(newNode)

  timeline.add(
    gsap
      .timeline()
      .to(newNode, {
        size: newNode.growth,
        delay: growDelay,
        duration: growSpeed,
      })
      .to(
        newNode,
        {
          delay: shiftDelay,
          x: `-=${width + barWidth}`,
          duration: width / shiftPerSecond,
          ease: 'none',
          onStart,
        },
        0,
      ),
    insert,
  )
}

function visualize({
  canvas,
  stream,
  nodes,
  metaTrack,
  timeline,
  start,
}: {
  canvas: HTMLCanvasElement
  stream?: MediaStream
  nodes: Array<{
    growth: number
    size: number
    x: number
  }>
  metaTrack: {current: Array<number>}
  timeline: gsap.core.Timeline
  start: number
}) {
  const {minBarHeight, maxBarHeight, shiftDelay, barWidth} = theme

  const audioCtx = new AudioContext()
  const canvasCtx = canvas.getContext('2d')
  let analyser: AnalyserNode
  let bufferLength: number
  let source: MediaStreamAudioSourceNode
  let add: boolean
  let dataArray: Uint8Array
  const padCount = nodes.length

  // Set the time on the animation
  timeline.time(start)
  timeline.play()

  // Reusable draw function
  function draw() {
    if (!canvasCtx) return
    const WIDTH = canvas.width
    const HEIGHT = canvas.height

    analyser.getByteTimeDomainData(dataArray)

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)

    if (add) {
      add = false
      let avg = 0
      let min = 0
      // IDEA: If perf is ever an issue, you could you hit this in blocks like
      // dataArray.length / 70 * i and only hit it like 10 times instead of however many.
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i]
        if (value === undefined) continue

        if (!min || value < min) min = value
        avg += value
      }
      // Final size is the mapping of the size against the uInt8 bounds.
      const SIZE = Math.floor(
        gsap.utils.mapRange(
          0,
          maxBarHeight,
          0,
          HEIGHT,
          Math.max(avg / bufferLength - min, minBarHeight),
        ),
      )
      /**
       * Tricky part here is that we need a metadata track as well as an animation
       * object track. One that only cares about sizing and one that cares about
       * animation.
       */
      addToTimeline({
        size: SIZE,
        width: WIDTH,
        nodes,
        timeline,
        insert: start + (nodes.length - padCount) * shiftDelay,
        onStart: () => (add = true),
      })

      // Track the metadata by making a big Array of the sizes.
      metaTrack.current = [...metaTrack.current, SIZE]
    }
    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n]
      if (!node) continue
      canvasCtx.fillRect(
        node.x,
        HEIGHT / 2 - Math.max(minBarHeight, node.size) / 2,
        barWidth,
        Math.max(minBarHeight, node.size),
      )
    }
  }

  if (stream) {
    add = true
    source = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)
    source.connect(analyser)
    return draw
  }
}

const padTimeline = ({
  canvas,
  nodes,
  timeline,
  startPoint,
}: {
  canvas: HTMLCanvasElement
  nodes: Array<{
    growth: number
    size: number
    x: number
    // animation is a gsap timeline instance
  }>
  timeline: gsap.core.Timeline
  startPoint: React.MutableRefObject<number>
}) => {
  const {minBarHeight, shiftPerSecond, shiftDelay, barWidth} = theme

  const padCount = Math.floor(canvas.width / barWidth)

  for (let p = 0; p < padCount; p++) {
    addToTimeline({
      size: minBarHeight,
      width: canvas.width,
      nodes,
      timeline,
      insert: shiftDelay * p,
      onStart: () => {},
    })
  }

  startPoint.current = timeline.totalDuration() - canvas.width / shiftPerSecond
}

function StreamVis({
  stream,
  paused = false,
  playbackRef,
  replay = false,
  team,
  metadata = {current: []},
}: {
  stream?: MediaStream
  paused?: boolean
  playbackRef: React.MutableRefObject<HTMLAudioElement | null>
  replay?: boolean
  metadata: React.MutableRefObject<Array<number>>
  team: string
}) {
  const colors = colorsByTeam[getOptionalTeam(team)]
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const nodesRef = React.useRef<
    Array<{
      growth: number
      size: number
      x: number
    }>
  >([])
  const startRef = React.useRef<number>(0)
  const drawRef = React.useRef<ReturnType<typeof visualize>>()

  /**
   * This is a GSAP timeline that either gets used by the recorder
   * or prefilled with the metadata
   */
  const timelineRef = React.useRef<gsap.core.Timeline>()

  /**
   * Effect handles playback of the GSAP timeline in sync
   * with audio playback controls. Pass an audio tag ref.
   */
  React.useEffect(() => {
    let playbackControl: HTMLAudioElement | undefined

    const updateTime = () => {
      const timeline = timelineRef.current
      if (!timeline) return
      if (!playbackControl) return

      timeline.time(startRef.current + playbackControl.currentTime)
      if (playbackControl.seeking) {
        timeline.play()
      } else if (playbackControl.paused) {
        timeline.pause()
      } else {
        timeline.play()
      }
    }
    if (playbackRef.current) {
      playbackControl = playbackRef.current
      playbackControl.addEventListener('play', updateTime)
      playbackControl.addEventListener('pause', updateTime)
      playbackControl.addEventListener('seeking', updateTime)
      playbackControl.addEventListener('seeked', updateTime)
    }
    return () => {
      if (playbackControl) {
        playbackControl.removeEventListener('play', updateTime)
        playbackControl.removeEventListener('pause', updateTime)
        playbackControl.removeEventListener('seeking', updateTime)
        playbackControl.removeEventListener('seeked', updateTime)
      }
    }
  }, [playbackRef])

  /**
   * Set the canvas to the correct size
   */
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set the correct canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Apply the fillStyle to the canvas
    const canvasCtx = canvas.getContext('2d')
    if (!canvasCtx) return

    canvasCtx.fillStyle = generateGradient({
      width: canvas.width,
      height: canvas.height,
      context: canvasCtx,
      colors,
    })
  }, [colors])

  /**
   * Respond to media recording being paused.
   */
  React.useEffect(() => {
    const timeline = timelineRef.current
    if (!timeline) return
    if (paused) {
      timeline.pause()
    } else {
      timeline.play()
    }
  }, [paused])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const nodes = nodesRef.current
    if (!canvas) return

    // pad the start of the timeline to fill out the width
    const timeline = gsap.timeline({paused: replay})
    timelineRef.current = timeline
    padTimeline({
      canvas,
      nodes,
      timeline,
      startPoint: startRef,
    })
  }, [replay])

  /**
   * If the visualisation is a replay, it needs padding.
   * Need to generate the nodes from metadata and the animation.
   */
  React.useEffect(() => {
    const canvas = canvasRef.current
    const timeline = timelineRef.current
    if (!canvas || !replay || !timeline) return

    // For every item in the metadata Array, create a node and it's animation.

    metadata.current.forEach((growth, index) => {
      addToTimeline({
        size: growth,
        width: canvas.width,
        nodes: nodesRef.current,
        timeline,
        insert: startRef.current + theme.shiftDelay * index,
        onStart: () => {},
      })
    })
    // This sets the animation timeline forwards to the end of padding.
    timeline.time(startRef.current)
  }, [replay, metadata])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const timeline = timelineRef.current
    const nodes = nodesRef.current
    if (!timeline || !canvas) return

    // Only start the ticker if it isn't a replay
    if (canvasRef.current && !replay) {
      // Generate visualisation function for streaming
      drawRef.current = visualize({
        canvas,
        stream,
        nodes,
        metaTrack: metadata,
        timeline,
        start: startRef.current,
      })
    } else if (replay && canvasRef.current) {
      drawRef.current = redraw({canvas, nodes})
    }

    // Add draw to the ticker – Don't worry about replay because that's
    // controlled by the playback controls.
    // if (canvasRef.current && stream) gsap.ticker.add(drawRef.current)
    if (drawRef.current) gsap.ticker.add(drawRef.current)

    return () => {
      if (timelineRef.current) timelineRef.current.pause(0)
      if (drawRef.current) gsap.ticker.remove(drawRef.current)
    }
  }, [stream, replay, metadata])

  return <canvas className="h-40 w-full" ref={canvasRef} />
}

function RecordingTime({timer}: {timer: number}) {
  const minutes = Math.floor(timer / 60)
  const seconds = timer - minutes * 60

  let className = ''
  if (timer >= 90) className = 'text-yellow-500'
  if (timer >= 120) className = 'text-red-500'

  return (
    <div className={className}>
      Duration: {padTime(minutes)}:{padTime(seconds)}
    </div>
  )
}

function padTime(time: number) {
  const timeString = `${time}`
  return timeString.padStart(2, '0')
}

export {CallRecorder}

/*
eslint
  one-var: "off",
*/
