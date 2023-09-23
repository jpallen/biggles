import OpenAI from "openai";
import * as vscode from 'vscode';

export const getOpenAIClient = async () => {
	const config = vscode.workspace.getConfiguration('biggles');
	const apiKey = config.get('openAI.apiKey') as string | undefined;
	const organization = config.get('openAI.organization') as string | undefined;
	console.log('initialised', {apiKey, organization});

	if (typeof apiKey !== 'string' || apiKey.length === 0) {
		const result = await vscode.window.showErrorMessage('No OpenAI API key found. Please add one to your settings.', 'Open Settings');
		if (result === 'Open Settings') {
			await vscode.commands.executeCommand('workbench.action.openSettings', 'biggles');
		}
		return;
	}

	return new OpenAI({ apiKey, organization });
};

export const adjustCode = async (openai: OpenAI, instruction: string, code: string) => {
  const language = vscode.window.activeTextEditor?.document.languageId;

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
		model: "gpt-3.5-turbo",
	});

	const content = completion.choices[0]?.message.content;
	return content;
};

export const createCode = async (openai: OpenAI, instruction: string) => {
  const language = vscode.window.activeTextEditor?.document.languageId;

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