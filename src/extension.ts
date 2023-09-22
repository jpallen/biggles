import * as vscode from 'vscode';
import OpenAI from "openai";



export async function activate(context: vscode.ExtensionContext) {

	const openai = new OpenAI({ apiKey: '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' });

	let disposable = vscode.commands.registerCommand('biggles.text',async () => {

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const selectedRange = getSelectedRange(editor);

		if (selectedRange) {
			await promptToEditCode(openai, editor, selectedRange);
		} else {
			await promptToInsertCode(openai, editor);
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

const promptToEditCode = async (openai: OpenAI, editor: vscode.TextEditor, selectedRange: vscode.Range) => {
	const instruction = await vscode.window.showInputBox({
		placeHolder: "Reticulate the splines...",
		prompt: "What should Biggles do?",
	});
	if (!instruction) {
		console.log('No instruction given, aborting');
		return;
	}
	console.log(`Instruction: ${instruction}`);

	const leadingWhitespace = getIndentationOfCurrentLine(editor);
	const selectedText = editor.document.getText(selectedRange);
	const code = removeWhitespace(selectedText, leadingWhitespace);

	console.log(`Code: ${code}`);

	const status = vscode.window.setStatusBarMessage("Thinking...");
	const adjustedCode = await adjustCode(openai, instruction, code);
	status.dispose();

	if (!adjustedCode) {
		vscode.window.showErrorMessage("An error occurred. Please try again.");
		return;
	}

	const indentInitialLine = selectedText.startsWith(leadingWhitespace);
	const indentedCode = applyWhitespace(adjustedCode, leadingWhitespace, indentInitialLine);
	console.log(indentedCode);

	editor.edit(editBuilder => {
		editBuilder.replace(selectedRange, indentedCode);
	});
};

const promptToInsertCode = async (openai: OpenAI, editor: vscode.TextEditor) => {
	const instruction = await vscode.window.showInputBox({
		placeHolder: "Write some code...",
		prompt: "What code should be inserted?",
	});
	if (!instruction) {
		console.log('No instruction given, aborting');
		return;
	}
	console.log(`Code: ${instruction}`);

	const status = vscode.window.setStatusBarMessage("Thinking...");
	const code = await createCode(openai, instruction);
	status.dispose();

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

	console.log(`Leading whitespace: "${leadingWhitespace}"`);
		
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

const adjustCode = async (openai: OpenAI, instruction: string, code: string) => {
	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: "system",
				content: "You are a coding assistent. The user prompt will be an instruction and a snippet of code to adjust. The output will be the adjusted code with no introduction or prefix."
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

const createCode = async (openai: OpenAI, instruction: string) => {
	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: "system",
				content: "You are a coding assistent. The user prompt will be an instruction. The output will be some code which does what the instruction says."
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