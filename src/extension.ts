import * as vscode from 'vscode';
import OpenAI from "openai";
import { adjustCode, createCode, getOpenAIClient, captureAudio } from './openai';

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

	console.log('Selected range:', selectedRange.isEmpty);

	if (selectedRange && !selectedRange.isEmpty) {
		await promptToEditCode(openai, editor, selectedRange, options);
	} else {
		await promptToInsertCode(openai, editor, options);
	}
};

const promptToEditCode = async (openai: OpenAI, editor: vscode.TextEditor, selectedRange: vscode.Range, { voice }: BigglesOptions) => {
	const instruction = await getInstruction(voice, "Modifications to selected code...", "Describe the modifications to the selected code");
	if (!instruction) {
		console.debug('No instruction given, aborting');
		return;
	}

	const leadingWhitespace = getIndentationOfCurrentLine(editor);
	const selectedText = editor.document.getText(selectedRange);
	const code = removeWhitespace(selectedText, leadingWhitespace);

	console.debug(`Code: ${code}`);

	const adjustedCode = await adjustCode(openai, instruction, code);

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
	const instruction = await getInstruction(voice, "Description of code to insert...", "Describe the code you would like to insert");
	if (!instruction) {
		console.debug('No instruction given, aborting');
		return;
	}
	
	let doc = editor.document;
	let pos = editor.selection.active;
	let textToCursor = doc.getText(new vscode.Range(new vscode.Position(0, 0), pos));
	let textAfterCursor = doc.getText(new vscode.Range(pos, new vscode.Position(doc.lineCount + 1, 0)));

	const code = await createCode(openai, instruction, textToCursor, textAfterCursor);

	if (!code) {
		vscode.window.showErrorMessage("An error occurred. Please try again.");
		return;
	}

	console.debug(`Code: ${code}`);

	const leadingWhitespace = getIndentationOfCurrentLine(editor);
	const indentedCode = applyWhitespace(code, leadingWhitespace, false);
	console.debug(indentedCode);

	editor.edit(editBuilder => {
		editBuilder.insert(editor.selection.active, indentedCode);
	});
};

const getInstruction = async (voice: boolean, prompt: string, placeHolder: string) => {
	let instruction: string | undefined;
	if (voice) {
		instruction = await captureAudio();
	} else {
		instruction = await vscode.window.showInputBox({
			placeHolder: "Description of code to insert...",
			prompt: "Describe the code you would like to insert",
		});
	}
	console.debug(`Instruction: ${instruction}`);
	return instruction;
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
