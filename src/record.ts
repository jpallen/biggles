
// Adapted from https://github.com/leon3s/node-mic-record/blob/master/index.js

// The MIT License (MIT)

// Copyright (c) 2014 Gilles De Mey

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { spawn, ChildProcess } from 'child_process';
import { Readable } from 'node:stream';

let cp: ChildProcess | null; // Recording process

export function start(userOptions: Partial<RecordOptions> = {}): Promise<Readable> {
  cp = null; // Empty out possibly dead recording process

  const defaults: RecordOptions = {
    sampleRate: 16000,
    channels: 1,
    compress: false,
    threshold: 0.5,
    thresholdStart: null,
    thresholdEnd: null,
    silence: '1.0',
    verbose: false,
    recordProgram: 'sox',
    audioType: null,
    device: null
  };

  const options:RecordOptions = Object.assign(defaults, userOptions);

  // Capture audio stream
  let cmd: string, cmdArgs: string[], cmdOptions: any, audioType: string;
  switch (options.recordProgram) {
    // On some Windows machines, sox is installed using the "sox" binary
    // instead of "rec"
    case 'sox':
      cmd = "sox";
      audioType = "wav";
      if (options.audioType) {audioType = options.audioType;};
      cmdArgs = [
        '-q',                                   // show no progress
        '-t', 'waveaudio',
        '-d',
        '-r', options.sampleRate.toString(),    // sample rate
        '-c', '1',                              // channels
        '-e', 'signed-integer',                 // sample encoding
        '-b', '16',                             // precision (bits)
        '-t', audioType,  // audio type
        '-',
        'silence', '1', '0.1', (options.thresholdStart || options.threshold + '%').toString(),
        '1', options.silence, (options.thresholdEnd || options.threshold + '%').toString()
      ];
      break;
    case 'rec':
    default:
      cmd = "rec";
      audioType = "wav";
      if (options.audioType) {audioType = options.audioType;};
      cmdArgs = [
        '-q',                     // show no progress
        '-r', options.sampleRate.toString(), // sample rate
        '-c', options.channels.toString(),   // channels
        '-e', 'signed-integer',   // sample encoding
        '-b', '16',               // precision (bits)
        '-t', audioType,              // audio type
        '-',                      // pipe
            // end on silence
        'silence', '1', '0.1', (options.thresholdStart || options.threshold + '%').toString(),
        '1', options.silence, (options.thresholdEnd || options.threshold + '%').toString()
      ];
      break;
    // On some systems (RasPi), arecord is the prefered recording binary
    case 'arecord':
      cmd = 'arecord';
      audioType = "wav";
      if (options.audioType) {audioType = options.audioType;};
      cmdArgs = [
        '-q',                     // show no progress
        '-r', options.sampleRate.toString(), // sample rate
        '-c', options.channels.toString(),   // channels
        '-t', audioType,              // audio type
        '-f', 'S16_LE',           // Sample format
        '-'                       // pipe
      ];
      if (options.device) {
        cmdArgs.unshift('-D', options.device);
      }
      break;
  }

  // Spawn audio capture command
  cmdOptions = { encoding: 'binary' };
  if (options.device) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    cmdOptions.env = Object.assign({}, process.env, { AUDIODEV: options.device });
  }
  console.log(cmd);
  console.log(cmdArgs);
  console.log(cmdOptions);
  cp = spawn(cmd, cmdArgs, cmdOptions);
  const rec = cp.stdout!;

  if (options.verbose) {
    console.log('Recording', options.channels, 'channels with sample rate',
        options.sampleRate + '...');
    console.time('End Recording');

    rec.on('data', function (data) {
      console.log('Recording %d bytes', data.length);
    });

    rec.on('end', function () {
      console.timeEnd('End Recording');
    });
  }

  return new Promise((resolve, reject) => {
    cp!.on('spawn', () => resolve(rec));
    cp!.on('error', reject);
  });
}

export function stop(): ChildProcess | false {
  if (!cp) {
    console.log('Please start a recording first');
    return false;
  }

  cp.kill(); // Exit the spawned process, exit gracefully
  return cp;
}

interface RecordOptions {
  sampleRate: number
  channels: number
  compress: boolean
  threshold: number
  thresholdStart: number | null
  thresholdEnd: number | null
  silence: string
  verbose: boolean
  recordProgram: 'sox' | 'rec' | 'arecord'
  audioType: string | null
  device: string | null
}