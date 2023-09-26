# Biggles

## The code assistant you can talk to

Biggles is a coding assistant for VSCode that you can talk to tell it how to change your code.

Usage: Select some code to modify, or put your cursor where you want to insert new code. Press `ctrl+m` / `cmd+m` and then describe the changes you want.

Biggles has two modes: **Insertion** and **Modification**. If you don't have any code selected, Biggles with insert code at the current cursor position. If you have code selected, Biggles will modify the selected code.

You can also press `ctrl+alt+m` / `cmd+alt+m` and to describe your changes via text.

[Install in VSCode](https://marketplace.visualstudio.com/items?itemName=Biggles.biggles)

## Demo Video

[![Biggles Demo Video](https://img.youtube.com/vi/6NSplhZ0DlY/0.jpg)](https://www.youtube.com/watch?v=6NSplhZ0DlY)

## Installation

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

## Configuration

Biggles uses the OpenAI Whisper and GPT4 API by default. You will need to provide your API key for Biggles to use in via the `biggles.openAI.apiKey` setting.

You can choose the version of GPT to use via the `biggles.openAI.model` setting.

You can optionall set you our OpenAI organization id via `biggles.openAI.organizationId` setting.
