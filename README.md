<h1><img src="assets/biggles-logo-128.png" />Biggles</h1>
<h2>The code assistant you can talk to</h2>

[Install in VSCode](https://marketplace.visualstudio.com/items?itemName=Biggles.biggles)

Biggles is a coding assistant for VSCode that you can talk to tell it how to change your code.

Use CMD/CTRL+M to activate Biggles then just say what code you want to add or the changes you want to make.

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

#### Installing on Windows

- [Download and Install Sox](https://sourceforge.net/projects/sox/)
- Find the Sox Executable, probably here: C:\Program Files (x86)\sox-*
- Add this path to your environment on windows:
    - "Edit the system environment variables" -> "Environment Variables" -> "Path" -> Edit -> New -> Paste the path
- Restart VSCode

