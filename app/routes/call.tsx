import * as React from 'react'
import {CallRecorder} from '../components/call-recorder'

export default function CallInPodcastScreen() {
  const [audio, setAudio] = React.useState<Blob | null>(null)
  return (
    <div>
      <h1>Welcome to the Call Kent Podcast</h1>
      <hr />
      {audio ? (
        <SubmitRecordingForm audio={audio} />
      ) : (
        <CallRecorder onRecordingComplete={recording => setAudio(recording)} />
      )}
    </div>
  )
}

function SubmitRecordingForm({audio}: {audio: Blob}) {
  const audioURL = window.URL.createObjectURL(audio)
  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio src={audioURL} controls />
      <form method="post">
        <button type="submit">Submit Recording</button>
      </form>
    </div>
  )
}
