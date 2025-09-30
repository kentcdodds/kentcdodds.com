"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallRecorder = CallRecorder;
var react_1 = require("@xstate/react");
var gsap_1 = require("gsap");
var React = require("react");
var xstate_1 = require("xstate");
var misc_tsx_1 = require("#app/utils/misc.tsx");
var button_tsx_1 = require("../button.tsx");
var use_interval_tsx_1 = require("../hooks/use-interval.tsx");
var icons_tsx_1 = require("../icons.tsx");
var tag_tsx_1 = require("../tag.tsx");
var typography_tsx_1 = require("../typography.tsx");
// Play around with these values to affect the audio visualisation.
// Should be able to stream the visualisation back no problem.
var MIN_BAR_HEIGHT = 2;
var MAX_BAR_HEIGHT = 100;
var SHIFT_SPEED = 4;
var SHIFT_PER_SECOND = 130;
var SHIFT_DELAY = 0.05;
var GROW_SPEED = 0.25;
var GROW_DELAY = 0;
var BAR_WIDTH = 4;
var colorsByTeam = {
    RED: ['#FF9393', '#FF4545', '#BA0808'],
    BLUE: ['#8CCAFE', '#36A4FF', '#018AFB'],
    YELLOW: ['#FFE792', '#FFD644', '#BA9308'],
    UNKNOWN: ['#C4C4C4', '#8C8C8C', '#4C4C4C'],
};
var theme = {
    minBarHeight: MIN_BAR_HEIGHT,
    maxBarHeight: MAX_BAR_HEIGHT,
    shiftSpeed: SHIFT_SPEED,
    shiftPerSecond: SHIFT_PER_SECOND,
    shiftDelay: SHIFT_DELAY,
    growSpeed: GROW_SPEED,
    growDelay: GROW_DELAY,
    barWidth: BAR_WIDTH,
};
function stopMediaRecorder(mediaRecorder) {
    if (mediaRecorder.state !== 'inactive')
        mediaRecorder.stop();
    for (var _i = 0, _a = mediaRecorder.stream.getAudioTracks(); _i < _a.length; _i++) {
        var track = _a[_i];
        if (track.enabled)
            track.stop();
    }
    mediaRecorder.ondataavailable = null;
}
var recorderMachine = (0, xstate_1.createMachine)({
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
                onDone: { target: 'ready', actions: 'assignAudioDevices' },
                onError: { target: 'error' },
            },
        },
        selecting: {
            on: {
                selection: { target: 'ready', actions: 'assignSelectedAudioDevice' },
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
            invoke: { src: 'mediaRecorder', id: 'mediaRecorder' },
            initial: 'playing',
            states: {
                playing: {
                    on: {
                        mediaRecorderCreated: {
                            actions: ['assignMediaRecorder'],
                        },
                        pause: {
                            target: 'paused',
                            actions: (0, xstate_1.send)('pause', { to: 'mediaRecorder' }),
                        },
                        stop: 'stopping',
                    },
                },
                paused: {
                    on: {
                        resume: {
                            target: 'playing',
                            actions: (0, xstate_1.send)('resume', { to: 'mediaRecorder' }),
                        },
                        stop: 'stopping',
                    },
                },
                stopping: {
                    entry: (0, xstate_1.send)('stop', { to: 'mediaRecorder' }),
                    on: {
                        chunks: { target: '#recorder.done', actions: 'assignAudioBlob' },
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
}, {
    services: {
        getDevices: function () { return __awaiter(void 0, void 0, void 0, function () {
            var devices;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, navigator.mediaDevices.enumerateDevices()];
                    case 1:
                        devices = _a.sent();
                        return [2 /*return*/, devices.filter(function (_a) {
                                var kind = _a.kind;
                                return kind === 'audioinput';
                            })];
                }
            });
        }); },
        mediaRecorder: function (context) { return function (sendBack, receive) {
            var mediaRecorder;
            function go() {
                return __awaiter(this, void 0, void 0, function () {
                    var chunks, deviceId, audio, mediaStream;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                chunks = [];
                                deviceId = (_a = context.selectedAudioDevice) === null || _a === void 0 ? void 0 : _a.deviceId;
                                audio = deviceId ? { deviceId: { exact: deviceId } } : true;
                                return [4 /*yield*/, window.navigator.mediaDevices.getUserMedia({
                                        audio: audio,
                                    })];
                            case 1:
                                mediaStream = _b.sent();
                                mediaRecorder = new MediaRecorder(mediaStream);
                                sendBack({ type: 'mediaRecorderCreated', mediaRecorder: mediaRecorder });
                                mediaRecorder.ondataavailable = function (event) {
                                    chunks.push(event.data);
                                    if (mediaRecorder.state === 'inactive') {
                                        sendBack({
                                            type: 'chunks',
                                            blob: new Blob(chunks, {
                                                type: 'audio/mp3',
                                            }),
                                        });
                                    }
                                };
                                mediaRecorder.start();
                                receive(function (event) {
                                    if (event.type === 'pause') {
                                        mediaRecorder.pause();
                                    }
                                    else if (event.type === 'resume') {
                                        mediaRecorder.resume();
                                    }
                                    else if (event.type === 'stop') {
                                        mediaRecorder.stop();
                                    }
                                });
                                return [2 /*return*/];
                        }
                    });
                });
            }
            void go();
            return function () {
                stopMediaRecorder(mediaRecorder);
            };
        }; },
    },
    actions: {
        assignAudioDevices: (0, xstate_1.assign)({
            audioDevices: function (context, event) { return event.data; },
        }),
        assignSelectedAudioDevice: (0, xstate_1.assign)({
            selectedAudioDevice: function (context, event) { return event.selectedAudioDevice; },
        }),
        assignMediaRecorder: (0, xstate_1.assign)({
            mediaRecorder: function (context, event) { return event.mediaRecorder; },
        }),
        assignAudioBlob: (0, xstate_1.assign)({
            audioBlob: function (context, event) { return event.blob; },
        }),
    },
});
function CallRecorder(_a) {
    var _b, _c;
    var onRecordingComplete = _a.onRecordingComplete, team = _a.team;
    var _d = (0, react_1.useMachine)(recorderMachine), state = _d[0], send = _d[1];
    var _e = React.useState(0), timer = _e[0], setTimer = _e[1];
    var metadataRef = React.useRef([]);
    var playbackRef = React.useRef(null);
    var audioBlob = state.context.audioBlob;
    var audioURL = React.useMemo(function () {
        if (audioBlob) {
            return window.URL.createObjectURL(audioBlob);
        }
        else {
            return null;
        }
    }, [audioBlob]);
    (0, use_interval_tsx_1.useInterval)(function () {
        setTimer(timer + 1);
    }, state.matches('recording.playing') ? 1000 : 0);
    React.useEffect(function () {
        if (state.matches('done')) {
            setTimer(0);
        }
    }, [state]);
    var deviceSelection = null;
    if (state.matches('gettingDevices')) {
        deviceSelection = <typography_tsx_1.Paragraph>Loading devices</typography_tsx_1.Paragraph>;
    }
    if (state.matches('selecting')) {
        deviceSelection = (<div>
				<typography_tsx_1.Paragraph className="mb-8">Select your device:</typography_tsx_1.Paragraph>
				<ul>
					{state.context.audioDevices.length
                ? state.context.audioDevices.map(function (device) { return (<li key={device.deviceId}>
									<tag_tsx_1.Tag onClick={function () {
                        send({
                            type: 'selection',
                            selectedAudioDevice: device,
                        });
                    }} tag={device.label} selected={state.context.selectedAudioDevice === device}/>
								</li>); })
                : 'No audio devices found'}
				</ul>
			</div>);
    }
    if (state.matches('error')) {
        deviceSelection = (<div>
				<typography_tsx_1.Paragraph className="mb-8">
					An error occurred while loading recording devices.
				</typography_tsx_1.Paragraph>
				<button_tsx_1.Button onClick={function () { return send('retry'); }}>Try again</button_tsx_1.Button>
			</div>);
    }
    var audioPreview = null;
    if (state.matches('done')) {
        (0, misc_tsx_1.assertNonNull)(audioURL, "The state machine is in \"stopped\" state but there's no audioURL. This should be impossible.");
        (0, misc_tsx_1.assertNonNull)(audioBlob, "The state machine is in \"stopped\" state but there's no audioBlob. This should be impossible.");
        audioPreview = (<div>
				<div className="mb-4">
					<audio src={audioURL} controls ref={playbackRef} preload="metadata"/>
				</div>
				<StreamVis metadata={metadataRef} replay={true} paused={state.matches('recording.paused')} playbackRef={playbackRef} team={team}/>
				<div className="flex flex-wrap gap-4">
					<button_tsx_1.Button size="medium" onClick={function () { return onRecordingComplete(audioBlob); }}>
						Accept
					</button_tsx_1.Button>
					<button_tsx_1.Button size="medium" variant="secondary" onClick={function () { return send({ type: 'restart' }); }}>
						Re-record
					</button_tsx_1.Button>
				</div>
			</div>);
    }
    return (<div>
			<div>
				{state.matches('ready') ? (<div className="flex flex-col gap-12">
						<typography_tsx_1.Paragraph>
							<span id="device-label">{"Current recording device: "}</span>
							<button_tsx_1.LinkButton onClick={function () { return send({ type: 'changeDevice' }); }} className="truncate" style={{ maxWidth: '80vw' }} aria-labelledby="device-label">
								{(_c = (_b = state.context.selectedAudioDevice) === null || _b === void 0 ? void 0 : _b.label) !== null && _c !== void 0 ? _c : 'default'}
							</button_tsx_1.LinkButton>
						</typography_tsx_1.Paragraph>
						<button_tsx_1.Button size="medium" onClick={function () { return send({ type: 'start' }); }}>
							<icons_tsx_1.MicrophoneIcon />
							<span>Start recording</span>
						</button_tsx_1.Button>
					</div>) : null}
				{deviceSelection}
			</div>

			{state.matches('recording') && state.context.mediaRecorder ? (<div className="mb-4">
					<StreamVis metadata={metadataRef} stream={state.context.mediaRecorder.stream} paused={state.matches('recording.paused')} playbackRef={playbackRef} team={team}/>
					<RecordingTime timer={timer}/>
				</div>) : null}

			{state.matches('recording.playing') ? (<div className="flex flex-wrap gap-4">
					<button_tsx_1.Button size="medium" onClick={function () { return send({ type: 'stop' }); }}>
						<icons_tsx_1.SquareIcon /> <span>Stop</span>
					</button_tsx_1.Button>
					<button_tsx_1.Button size="medium" variant="secondary" onClick={function () { return send({ type: 'pause' }); }}>
						<icons_tsx_1.PauseIcon /> <span>Pause</span>
					</button_tsx_1.Button>
				</div>) : state.matches('recording.paused') ? (<div className="flex flex-wrap gap-4">
					<button_tsx_1.Button size="medium" onClick={function () { return send({ type: 'stop' }); }}>
						<icons_tsx_1.SquareIcon /> <span>Stop</span>
					</button_tsx_1.Button>
					<button_tsx_1.Button size="medium" onClick={function () { return send({ type: 'resume' }); }}>
						<icons_tsx_1.TriangleIcon /> <span>Resume</span>
					</button_tsx_1.Button>
				</div>) : state.matches('recording.stopping') ? (<typography_tsx_1.Paragraph>Processing...</typography_tsx_1.Paragraph>) : null}

			{audioPreview}
		</div>);
}
var generateGradient = function (_a) {
    var width = _a.width, height = _a.height, context = _a.context, colors = _a.colors;
    var fillStyle = context.createLinearGradient(width / 2, 0, width / 2, height);
    // Color stop is three colors
    fillStyle.addColorStop(0, colors[2]);
    fillStyle.addColorStop(1, colors[2]);
    fillStyle.addColorStop(0.35, colors[1]);
    fillStyle.addColorStop(0.65, colors[1]);
    fillStyle.addColorStop(0.5, colors[0]);
    return fillStyle;
};
function redraw(_a) {
    var canvas = _a.canvas, nodes = _a.nodes;
    var minBarHeight = theme.minBarHeight, barWidth = theme.barWidth;
    var canvasCtx = canvas.getContext('2d');
    function draw() {
        if (!canvasCtx)
            return;
        var WIDTH = canvas.width;
        var HEIGHT = canvas.height;
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        for (var n = 0; n < nodes.length; n++) {
            var node = nodes[n];
            if (!node)
                continue;
            canvasCtx.fillRect(node.x, HEIGHT / 2 - Math.max(minBarHeight, node.size) / 2, barWidth, Math.max(minBarHeight, node.size));
        }
    }
    return draw;
}
/**
 * 1. Create a node object
 * 2. Push it to an Array
 * 3. Create an insertion point
 * 4. Add to a timeline
 */
var addToTimeline = function (_a) {
    var timeline = _a.timeline, width = _a.width, nodes = _a.nodes, onStart = _a.onStart, size = _a.size, insert = _a.insert;
    var shiftDelay = theme.shiftDelay, barWidth = theme.barWidth, growDelay = theme.growDelay, growSpeed = theme.growSpeed, shiftPerSecond = theme.shiftPerSecond;
    // Generate new node
    var newNode = {
        growth: size,
        size: 0,
        x: width,
    };
    // Add it in
    nodes.push(newNode);
    timeline.add(gsap_1.default
        .timeline()
        .to(newNode, {
        size: newNode.growth,
        delay: growDelay,
        duration: growSpeed,
    })
        .to(newNode, {
        delay: shiftDelay,
        x: "-=".concat(width + barWidth),
        duration: width / shiftPerSecond,
        ease: 'none',
        onStart: onStart,
    }, 0), insert);
};
function visualize(_a) {
    var canvas = _a.canvas, stream = _a.stream, nodes = _a.nodes, metaTrack = _a.metaTrack, timeline = _a.timeline, start = _a.start;
    var minBarHeight = theme.minBarHeight, maxBarHeight = theme.maxBarHeight, shiftDelay = theme.shiftDelay, barWidth = theme.barWidth;
    var audioCtx = new AudioContext();
    var canvasCtx = canvas.getContext('2d');
    var analyser;
    var bufferLength;
    var source;
    var add;
    var dataArray;
    var padCount = nodes.length;
    // Set the time on the animation
    timeline.time(start);
    timeline.play();
    // Reusable draw function
    function draw() {
        if (!canvasCtx)
            return;
        var WIDTH = canvas.width;
        var HEIGHT = canvas.height;
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        if (add) {
            add = false;
            var avg = 0;
            var min = 0;
            // IDEA: If perf is ever an issue, you could you hit this in blocks like
            // dataArray.length / 70 * i and only hit it like 10 times instead of however many.
            for (var i = 0; i < bufferLength; i++) {
                var value = dataArray[i];
                if (value === undefined)
                    continue;
                if (!min || value < min)
                    min = value;
                avg += value;
            }
            // Final size is the mapping of the size against the uInt8 bounds.
            var SIZE = Math.floor(gsap_1.default.utils.mapRange(0, maxBarHeight, 0, HEIGHT, Math.max(avg / bufferLength - min, minBarHeight)));
            /**
             * Tricky part here is that we need a metadata track as well as an animation
             * object track. One that only cares about sizing and one that cares about
             * animation.
             */
            addToTimeline({
                size: SIZE,
                width: WIDTH,
                nodes: nodes,
                timeline: timeline,
                insert: start + (nodes.length - padCount) * shiftDelay,
                onStart: function () { return (add = true); },
            });
            // Track the metadata by making a big Array of the sizes.
            metaTrack.current = __spreadArray(__spreadArray([], metaTrack.current, true), [SIZE], false);
        }
        for (var n = 0; n < nodes.length; n++) {
            var node = nodes[n];
            if (!node)
                continue;
            canvasCtx.fillRect(node.x, HEIGHT / 2 - Math.max(minBarHeight, node.size) / 2, barWidth, Math.max(minBarHeight, node.size));
        }
    }
    if (stream) {
        add = true;
        source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);
        return draw;
    }
}
var padTimeline = function (_a) {
    var canvas = _a.canvas, nodes = _a.nodes, timeline = _a.timeline, startPoint = _a.startPoint;
    var minBarHeight = theme.minBarHeight, shiftPerSecond = theme.shiftPerSecond, shiftDelay = theme.shiftDelay, barWidth = theme.barWidth;
    var padCount = Math.floor(canvas.width / barWidth);
    for (var p = 0; p < padCount; p++) {
        addToTimeline({
            size: minBarHeight,
            width: canvas.width,
            nodes: nodes,
            timeline: timeline,
            insert: shiftDelay * p,
            onStart: function () { },
        });
    }
    startPoint.current = timeline.totalDuration() - canvas.width / shiftPerSecond;
};
function StreamVis(_a) {
    var stream = _a.stream, _b = _a.paused, paused = _b === void 0 ? false : _b, playbackRef = _a.playbackRef, _c = _a.replay, replay = _c === void 0 ? false : _c, team = _a.team, _d = _a.metadata, metadata = _d === void 0 ? { current: [] } : _d;
    var colors = colorsByTeam[(0, misc_tsx_1.getOptionalTeam)(team)];
    var canvasRef = React.useRef(null);
    var nodesRef = React.useRef([]);
    var startRef = React.useRef(0);
    var drawRef = React.useRef(null);
    /**
     * This is a GSAP timeline that either gets used by the recorder
     * or prefilled with the metadata
     */
    var timelineRef = React.useRef(null);
    /**
     * Effect handles playback of the GSAP timeline in sync
     * with audio playback controls. Pass an audio tag ref.
     */
    React.useEffect(function () {
        var playbackControl;
        var updateTime = function () {
            var timeline = timelineRef.current;
            if (!timeline)
                return;
            if (!playbackControl)
                return;
            timeline.time(startRef.current + playbackControl.currentTime);
            if (playbackControl.seeking) {
                timeline.play();
            }
            else if (playbackControl.paused) {
                timeline.pause();
            }
            else {
                timeline.play();
            }
        };
        if (playbackRef.current) {
            playbackControl = playbackRef.current;
            playbackControl.addEventListener('play', updateTime);
            playbackControl.addEventListener('pause', updateTime);
            playbackControl.addEventListener('seeking', updateTime);
            playbackControl.addEventListener('seeked', updateTime);
        }
        return function () {
            if (playbackControl) {
                playbackControl.removeEventListener('play', updateTime);
                playbackControl.removeEventListener('pause', updateTime);
                playbackControl.removeEventListener('seeking', updateTime);
                playbackControl.removeEventListener('seeked', updateTime);
            }
        };
    }, [playbackRef]);
    /**
     * Set the canvas to the correct size
     */
    React.useEffect(function () {
        var canvas = canvasRef.current;
        if (!canvas)
            return;
        // Set the correct canvas dimensions
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        // Apply the fillStyle to the canvas
        var canvasCtx = canvas.getContext('2d');
        if (!canvasCtx)
            return;
        canvasCtx.fillStyle = generateGradient({
            width: canvas.width,
            height: canvas.height,
            context: canvasCtx,
            colors: colors,
        });
    }, [colors]);
    /**
     * Respond to media recording being paused.
     */
    React.useEffect(function () {
        var timeline = timelineRef.current;
        if (!timeline)
            return;
        if (paused) {
            timeline.pause();
        }
        else {
            timeline.play();
        }
    }, [paused]);
    React.useEffect(function () {
        var canvas = canvasRef.current;
        var nodes = nodesRef.current;
        if (!canvas)
            return;
        // pad the start of the timeline to fill out the width
        var timeline = gsap_1.default.timeline({ paused: replay });
        timelineRef.current = timeline;
        padTimeline({
            canvas: canvas,
            nodes: nodes,
            timeline: timeline,
            startPoint: startRef,
        });
    }, [replay]);
    /**
     * If the visualisation is a replay, it needs padding.
     * Need to generate the nodes from metadata and the animation.
     */
    React.useEffect(function () {
        var canvas = canvasRef.current;
        var timeline = timelineRef.current;
        if (!canvas || !replay || !timeline)
            return;
        // For every item in the metadata Array, create a node and it's animation.
        metadata.current.forEach(function (growth, index) {
            addToTimeline({
                size: growth,
                width: canvas.width,
                nodes: nodesRef.current,
                timeline: timeline,
                insert: startRef.current + theme.shiftDelay * index,
                onStart: function () { },
            });
        });
        // This sets the animation timeline forwards to the end of padding.
        timeline.time(startRef.current);
    }, [replay, metadata]);
    React.useEffect(function () {
        var canvas = canvasRef.current;
        var timeline = timelineRef.current;
        var nodes = nodesRef.current;
        if (!timeline || !canvas)
            return;
        // Only start the ticker if it isn't a replay
        if (canvasRef.current && !replay) {
            // Generate visualisation function for streaming
            drawRef.current = visualize({
                canvas: canvas,
                stream: stream,
                nodes: nodes,
                metaTrack: metadata,
                timeline: timeline,
                start: startRef.current,
            });
        }
        else if (replay && canvasRef.current) {
            drawRef.current = redraw({ canvas: canvas, nodes: nodes });
        }
        // Add draw to the ticker – Don't worry about replay because that's
        // controlled by the playback controls.
        // if (canvasRef.current && stream) gsap.ticker.add(drawRef.current)
        if (drawRef.current)
            gsap_1.default.ticker.add(drawRef.current);
        return function () {
            if (timelineRef.current)
                timelineRef.current.pause(0);
            if (drawRef.current)
                gsap_1.default.ticker.remove(drawRef.current);
        };
    }, [stream, replay, metadata]);
    return <canvas className="h-40 w-full" ref={canvasRef}/>;
}
function RecordingTime(_a) {
    var timer = _a.timer;
    var minutes = Math.floor(timer / 60);
    var seconds = timer - minutes * 60;
    var className = '';
    if (timer >= 90)
        className = 'text-yellow-500';
    if (timer >= 120)
        className = 'text-red-500';
    return (<div className={className}>
			Duration: {padTime(minutes)}:{padTime(seconds)}
		</div>);
}
function padTime(time) {
    var timeString = "".concat(time);
    return timeString.padStart(2, '0');
}
/*
eslint
  one-var: "off",
*/
