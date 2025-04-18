# About

This project utilizes PixelLab and RetroDiffusion API to generate spritesheets.  It utilizes 3 primary classes:

**RetroDiffusion** API creates a walking spritesheet based on a prompt.

**PixelLab** API generates poses for the spritesheet using Aseprite skeleton .json files for pose guidance.

Routes.ts serves a homepage at HTTP_PORT (e.g. localhost:3016) and API for Unity client/game (e.g. /api/game-init).

# Use with Satoshi-Client

The goal of this project is to act as an http server that works with the project 'satoshi-client' to create and load ai generated spritesheets into a multiplayer game environment.  The multiplayer environment is not found in this project because it written in C# via netcode for unity.  This project only serves http files and does API calls to retro-diffusion.

# How to set up

Once you set up your .ENV API key, run the unity client found on the satoshi-client project or run tests through localhost:3016 or Main.ts constructor().

# How to add new Poses

Each pose needs 4 .json files placed in public/skeletons.  To generate these .json, use Aseprite + PixelLab extension.  There is a .aseprite file to work off of in public/skeletons with a default (standing) skeleton.  

Tips:
- CTRL+SPACE+E modifies the skeleton
- The trial version of Aseprite does not support the PixelLab extension
- LLMs are good at small adjustments to existing .json files:  Do mention that its 64x64 format if you want to ask the LLM to 'move the left hand one pixel down', because the .json are in a normalized, %-based, format
- Main.ts' determinePoses() function will automatically detect new poses once 4 .json files exist for that pose