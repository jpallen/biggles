
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
import * as vscode from 'vscode';

let cp: ChildProcess | null; // Recording process

const getConfig = () => { 
	const config = vscode.workspace.getConfiguration('biggles');
	const os = config.get('system.os') as string | undefined;
	console.debug('initialised', {os});
  return {os};
};

export function start(userOptions: Partial<RecordOptions> = {}): Promise<Readable> {
  cp = null; // Empty out possibly dead recording process

  const {os} = getConfig();

  const defaults: RecordOptions = {
    sampleRate: 16000,
    channels: 1,
    compress: false,
    threshold: 0.5,
    thresholdStart: null,
    thresholdEnd: null,
    silence: '1.0',
    verbose: false,
    audioType: null,
    device: null
  };

  const options: RecordOptions = Object.assign(defaults, userOptions);

  const cmd = "sox";
  let audioType = "wav";
  if (options.audioType) { audioType = options.audioType; };

  var cmdArgs;

  if (os === "win") {
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
  } else {
    cmdArgs = [
      '-d',
      '-t', audioType,          // audio type
      '-q',                     // show no progress
      '-r', options.sampleRate.toString(), // sample rate
      '-c', options.channels.toString(),   // channels
      '-e', 'signed-integer',   // sample encoding
      '-b', '16',               // precision (bits)
      '-',                      // pipe
      // end on silence
      'silence', '1', '0.1', (options.thresholdStart || options.threshold + '%').toString(),
      '1', options.silence, (options.thresholdEnd || options.threshold + '%').toString()
    ];
  }

  // Spawn audio capture command
  const cmdOptions: Record<string, any> = { encoding: 'binary' };
  if (options.device) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    cmdOptions.env = Object.assign({}, process.env, { AUDIODEV: options.device });
  }

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
  audioType: string | null
  device: string | null
}
