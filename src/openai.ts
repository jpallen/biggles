/* eslint-disable @typescript-eslint/naming-convention */
import OpenAI from "openai";
import * as vscode from 'vscode';
import * as rec from './record';
import FormData from 'form-data';
import * as https from 'https';
import { Readable } from 'node:stream';

export const getOpenAIClient = async () => {
	const { apiKey, organization, model } = getConfig();
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
	const model = config.get('openAI.model') as string | undefined;
	console.debug('initialised', { apiKey, organization });
	return { apiKey, organization, model };
};

export const adjustCode = async (openai: OpenAI, instruction: string, code: string) => {
	const { apiKey, organization, model } = getConfig();
	const language = vscode.window.activeTextEditor?.document.languageId;
	console.debug('Detected language (adjustCode):', language);

	return vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: instruction
	}, async () => {
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
			model: model || "gpt-4",
		});

		const content = completion.choices[0]?.message.content;
		return content;
	});
};

export const createCode = async (openai: OpenAI, instruction: string, textBeforeCursor: string, textAfterCursor: string) => {
	const language = vscode.window.activeTextEditor?.document.languageId;
	console.debug('Detected language (createCode):', language);

	return vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: instruction
	}, async () => {
		const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{
				role: "system",
				content: `You are a coding assistent for the ${language} programming language. The user prompt will the code before the cursor in <before> tags, the code after the cursor in <after> tags and a description of the new code to insert in <instruction> tags. The output will be code to insert between the before and after code which does what the user description says with no instroduction or explanation. `
			},
			{
				role: "user",
				content: `<instruction>${instruction}</instruction>\n<before>${textBeforeCursor}</before>\n<after>${textAfterCursor}</after>`
			}
		];
		const completion = await openai.chat.completions.create({
			messages: messages,
			model: "gpt-4",
		});

		const content = completion.choices[0]?.message.content;
		return content;
	});
};

export const captureAudio = async () => {
	const { apiKey, organization } = getConfig();

	let stream: Readable;
	try {
		stream = await rec.start();
	} catch (error) {
		if ((error as any).code === 'ENOENT') {
			const result = await vscode.window.showErrorMessage('Failed to start recording: SoX not found', { modal: true }, 'Install SoX');
			if (result === 'Install SoX') {
				vscode.env.openExternal(vscode.Uri.parse('https://github.com/jpallen/biggles#sox'));
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

	// TODO: Handle OpenAI error and cancel recording
	return new Promise<string>((resolveRequest, reject) => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Talk to me...",
			cancellable: true
		}, (progress, token) => {
			let cancelled = false;
			token.onCancellationRequested(() => {
				rec.stop();
				cancelled = true;
				console.log("User cancelled the recording");
			});

			return new Promise<void>(resolveProgress => {
				const req = https.request(options, (res) => {
					let body = '';

					res.on('data', (chunk) => {
						body += chunk;
					});

					res.on('end', () => {
						resolveProgress();
						if (cancelled) {
							reject(new Error('user cancelled'));
						}
						try {
							const parsedBody = JSON.parse(body);
							if (parsedBody.text) {
								resolveRequest(parsedBody.text as string);
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
		});
	});
};