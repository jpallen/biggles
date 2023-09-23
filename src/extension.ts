import * as vscode from 'vscode';
import OpenAI from "openai";
import { adjustCode, createCode, getOpenAIClient, transcribeAudio } from './openai';

export async function activate(context: vscode.ExtensionContext) {
	const text = vscode.commands.registerCommand('biggles.text', () => biggles({voice: false}));
	context.subscriptions.push(text);

	const voice = vscode.commands.registerCommand('biggles.voice', () => biggles({voice: true}));
	context.subscriptions.push(voice);
}

// This method is called when your extension is deactivated
export function deactivate() {}

type BigglesOptions = {
	voice: boolean
};

const biggles = async (options: BigglesOptions) => {
	const openai = await getOpenAIClient();
	if (!openai) { return; }

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const selectedRange = getSelectedRange(editor);

	if (selectedRange) {
		await promptToEditCode(openai, editor, selectedRange, options);
	} else {
		await promptToInsertCode(openai, editor, options);
	}
};

const promptToEditCode = async (openai: OpenAI, editor: vscode.TextEditor, selectedRange: vscode.Range, { voice }: BigglesOptions) => {
	let instruction: string;
	if (voice) {
		instruction = await transcribeAudio();
	} else {
		const input = await vscode.window.showInputBox({
			placeHolder: "Modifications to selected code...",
			prompt: "Describe the modifications to the selected code",
		});
		if (!input) {
			console.debug('No instruction given, aborting');
			return;
		}
		instruction = input;
	}
	console.debug(`Instruction: ${instruction}`);

	const leadingWhitespace = getIndentationOfCurrentLine(editor);
	const selectedText = editor.document.getText(selectedRange);
	const code = removeWhitespace(selectedText, leadingWhitespace);

	console.debug(`Code: ${code}`);

	const status = vscode.window.setStatusBarMessage("Thinking...");
	const adjustedCode = await adjustCode(openai, instruction, code);
	status.dispose();

	if (!adjustedCode) {
		vscode.window.showErrorMessage("An error occurred. Please try again.");
		return;
	}

	const indentInitialLine = selectedText.startsWith(leadingWhitespace);
	const indentedCode = applyWhitespace(adjustedCode, leadingWhitespace, indentInitialLine);
	console.debug(indentedCode);

	editor.edit(editBuilder => {
		editBuilder.replace(selectedRange, indentedCode);
	});
};

const promptToInsertCode = async (openai: OpenAI, editor: vscode.TextEditor, { voice }: BigglesOptions) => {
	let instruction: string;
	if (voice) {
		instruction = await transcribeAudio();
	} else {
		const input = await vscode.window.showInputBox({
			placeHolder: "Description of code to insert...",
			prompt: "Describe the code you would like to insert",
		});
		if (!input) {
			console.debug('No instruction given, aborting');
			return;
		}
		instruction = input;
	}
	console.debug(`Instruction: ${instruction}`);

	const status = vscode.window.setStatusBarMessage("Thinking...");
	const code = await createCode(openai, instruction);
	status.dispose();

	console.debug(`Code: ${code}`);

	editor.edit(editBuilder => {
		editBuilder.insert(editor.selection.active, instruction);
	});
};

const getSelectedRange = (editor: vscode.TextEditor) => {
	const selection = editor.selection;
	return new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
};

const getIndentationOfCurrentLine = (editor: vscode.TextEditor) => {
	const document = editor.document;
	const selection = editor.selection;

	const currentLine = selection.start.line;
	const currentLineText = document.lineAt(currentLine).text;
	const whitespaceLength = currentLineText.length - currentLineText.trimStart().length;
	const leadingWhitespace = currentLineText.slice(0, whitespaceLength);

	console.debug(`Leading whitespace: "${leadingWhitespace}"`);
		
	return leadingWhitespace;
};

const applyWhitespace = (text: string, leadingWhitespace: string, indentInitialLine: boolean) => {
  const lines = text.split('\n');
  const adjustedLines = lines.map((line, index) => {
    if (index === 0 && !indentInitialLine) {
      return line;
    }
    return leadingWhitespace + line;
  });
  return adjustedLines.join('\n');
};

const removeWhitespace = (text: string, leadingWhitespace: string) => {
  const lines = text.split('\n');
  const adjustedLines = lines.map((line, index) => {
		if (line.startsWith(leadingWhitespace)) {
			return line.slice(leadingWhitespace.length);
		} else {
			return line;
		}
  });
  return adjustedLines.join('\n');
};
