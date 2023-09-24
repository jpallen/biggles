/* eslint-disable @typescript-eslint/naming-convention */
import OpenAI from "openai";
import * as vscode from 'vscode';
import * as rec from './record';
import FormData from 'form-data';
import * as https from 'https';
import { Readable } from 'node:stream';

export const getOpenAIClient = async () => {
  const {apiKey, organization} = getConfig();
	if (typeof apiKey !== 'string' || apiKey.length === 0) {
		const result = await vscode.window.showErrorMessage('No OpenAI API key found. Please add one to your settings.', 'Open Settings');
		if (result === 'Open Settings') {
			await vscode.commands.executeCommand('workbench.action.openSettings', 'biggles');
		}
		return;
	}

	return new OpenAI({ apiKey, organization });
};

const getConfig = () => { 
	const config = vscode.workspace.getConfiguration('biggles');
	const apiKey = config.get('openAI.apiKey') as string | undefined;
	const organization = config.get('openAI.organization') as string | undefined;
	console.debug('initialised', {apiKey, organization});
  return {apiKey, organization};
};

export const adjustCode = async (openai: OpenAI, instruction: string, code: string) => {
  const language = vscode.window.activeTextEditor?.document.languageId;
	console.debug('Detected language:', language);

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: "system",
				content: `You are a coding assistent for the ${language} programming language. The user prompt will be an instruction and a snippet of code to adjust. The output will be the adjusted code with no introduction or prefix.`
			},
			{
				role: "user",
				content: `Instruction: ${instruction}\nCode:\n${code}`
			}
		],
		model: "gpt-4",
	});

	const content = completion.choices[0]?.message.content;
	return content;
};

export const createCode = async (openai: OpenAI, instruction: string) => {
  const language = vscode.window.activeTextEditor?.document.languageId;
	console.debug('Detected language:', language);

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: "system",
				content: `You are a coding assistent for the ${language} programming language. The user prompt will be an instruction. The output will be some code which does what the instruction says.`
			},
			{
				role: "user",
				content: instruction
			}
		],
		model: "gpt-3.5-turbo",
	});

	const content = completion.choices[0]?.message.content;
	return content;
};

export const captureAudio = async () => {
  const {apiKey, organization} = getConfig();

  let stream: Readable;
  try {
    stream = await rec.start({ recordProgram: 'rec' });
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      const result = await vscode.window.showErrorMessage('Failed to start recording: SoX not found', { modal: true }, 'Install SoX');
      if (result === 'Install SoX') {
        // TODO: Links to other than just Mac
        vscode.env.openExternal(vscode.Uri.parse('https://formulae.brew.sh/formula/sox'));
      }
      return;
    } else {
      throw error;
    }
  }

  const formData = new FormData();
  formData.append('model', 'whisper-1');
  const boundary = formData.getBoundary();
  formData.append('file', stream, { contentType: 'audio/wav', filename: 'audio.wav' });

	const headers: Record<string, string> = {
		'Authorization': `Bearer ${apiKey}`,
		'Content-Type': `multipart/form-data; boundary=${boundary}`,
	};

	if (organization) {
		headers['OpenAI-Organization'] = organization;
	}

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/audio/transcriptions',
    method: 'POST',
    headers
  };

	return new Promise<string>((resolve, reject) => {
		const req = https.request(options, (res) => {
			let body = '';
	
			res.on('data', (chunk) => {
				body += chunk;
			});
	
			res.on('end', () => {
				try {
					const parsedBody = JSON.parse(body);
					if (parsedBody.text) {
						resolve(parsedBody.text as string);
					} else {
						reject(new Error('Text field does not exist in the response.'));
					}
				} catch (error) {
					reject(error);
				}
			});
	
			res.on('error', reject);
		});
	
		formData.pipe(req);
	
		req.on('error', reject);
	});
};