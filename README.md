<div style="text-align: center">
  <img src="assets/biggles-logo-128.png" />
  <h1>Biggles</h1>
  <h2>The code assistant you can talk to</h2>
  <a href="https://marketplace.visualstudio.com/items?itemName=Biggles.biggles">Install in VSCode</a>
</div>

Biggles is a coding assistant for VSCode that you can talk to tell it how to change your code, or what code to change.

Use CMD/CTRL+M to activate Biggles then just say what code you want to add or changes you want to make.

Biggles has two modes: **Insertion** and **Modification**. If you don't have any code selected, Biggles with insert code at the current cursor position. If you have code selected, Biggles will modify the selected code.

## Demo Video

[![Biggles Demo Video](https://img.youtube.com/vi/6NSplhZ0DlY/0.jpg)](https://www.youtube.com/watch?v=6NSplhZ0DlY)

## Installation

### OpenAI

Biggles uses the OpenAI Whisper and GPT4 APIs. You will need to provide your API key for Biggles to use.

### SoX

Biggles uses the SoX library for recording audio. You will probably need to install this.

#### Installing on a Max

```bash
$ brew install sox
```

#### Installing on Linux

```bash
$ sudo apt-get install sox libsox-fmt-all
```

#### Installing on Window

[Download from SourceForge](https://sourceforge.net/projects/sox/)

