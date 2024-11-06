import { Injectable } from '@angular/core';
import * as RecordRTC from 'recordrtc';
import moment from 'moment';
import { Observable, Subject } from 'rxjs';

interface RecordedAudioOutput {
  blob: Blob;
  title: string;
}

@Injectable()
export class AudioRecordingService {
  private stream: any;
  private recorder: RecordRTC.StereoAudioRecorder | null = null;
  private interval!: any;
  private startTime: moment.Moment | null = null;
  private _recorded = new Subject<RecordedAudioOutput>();
  private _recordingTime = new Subject<{
    timeString: string;
    durationSeconds: number;
  }>();
  private _recordingFailed = new Subject<string>();

  getRecordedBlob(): Observable<RecordedAudioOutput> {
    return this._recorded.asObservable();
  }

  getRecordedTime(): Observable<{
    timeString: string;
    durationSeconds: number;
  }> {
    return this._recordingTime.asObservable();
  }

  recordingFailed(): Observable<string> {
    return this._recordingFailed.asObservable();
  }

  startRecording() {
    if (this.recorder) {
      return;
    }

    this._recordingTime.next({ timeString: '00:00', durationSeconds: 0 });
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        this.stream = s;
        this.record();
      })
      .catch((error) => {
        this._recordingFailed.next('');
      });
  }

  abortRecording() {
    this.stopMedia();
  }

  private record() {
    this.recorder = new RecordRTC.StereoAudioRecorder(this.stream, {
      type: 'audio',
      mimeType: 'audio/webm',
    });

    this.recorder.record();
    this.startTime = moment();
    this.interval = setInterval(() => {
      const currentTime = moment();
      const diffTime = moment.duration(currentTime.diff(this.startTime));
      const time =
        this.toString(diffTime.minutes()) +
        ':' +
        this.toString(diffTime.seconds());
      this._recordingTime.next({
        timeString: time,
        durationSeconds: diffTime.asSeconds(),
      });
    }, 1000);
  }

  private toString(value: number) {
    let val: string = value.toString();
    if (!value) val = '00';
    if (value < 10) val = '0' + value;
    return val;
  }

  stopRecording = async () => {
    let self = this;
    if (this.recorder == null) return;
    return new Promise((resolve, reject) => {
      if (self.recorder != null) {
        self.recorder.stop((blob: any) => {
          if (self.startTime) {
            const mp3Name = encodeURIComponent(
              'audio_' + new Date().getTime() + '.mp3'
            );
            self.stopMedia();
            self._recorded.next({ blob: blob, title: mp3Name });
            resolve(true);
          } else {
            reject(false);
          }
        });
      }
    });
  };

  private stopMedia() {
    if (this.recorder) {
      this.recorder = null;
      clearInterval(this.interval);
      this.startTime = null;
      if (this.stream) {
        this.stream.getAudioTracks().forEach((track: any) => track.stop());
        this.stream = null;
      }
    }
  }
}
