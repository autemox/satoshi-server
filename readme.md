# About

This project utilizes PixelLab and RetroDiffusion API to generate spritesheets.  It utilizes 3 primary classes:

**RetroDiffusion** API creates a walking spritesheet based on a prompt.

**PixelLab** API generates poses for the spritesheet using Aseprite skeleton .json files for pose guidance.

Routes.ts serves a homepage at HTTP_PORT (e.g. localhost:3016) and API for Unity client/game (e.g. /api/game-init).

# Use with Satoshi-Client

The goal of this project is to act as an http server that works with the project 'satoshi-client' to create and load ai generated spritesheets into a multiplayer game environment.  The multiplayer environment is not found in this project because it written in C# via netcode for unity.  This project only serves http files and does API calls to retro-diffusion.

# How to set up

Once you set up your .ENV API key, run the unity client found on the satoshi-client project or run tests through localhost:3016 or Main.ts constructor().





--------------------------
To-Do: Finish Setting up to AWS
--------------------------

1. SSH: Create project folders and set up to receive gitpush command

ssh aws
mkdir satoshi-server
mkdir satoshi-server.git                  // bare directory isolates version control from live environment
cd satoshi-server.git
git init --bare

nano hooks/post-receive               // this is how the repo will deploy files to website

    // copy and paste the below for TS projects (JS will need a different third line):

    #!/bin/sh
    GIT_WORK_TREE=/home/ubuntu/satoshi-server git checkout -f main
    pm2 restart /home/ubuntu/satoshi-server/3016-satoshi-server.ts --interpreter="ts-node"
    
chmod +x hooks/post-receive           // makes hook executable

2. TERMINAL: Set up 'gitpush' command on local computer

How to set up 'git pushall' from terminal:
git remote add lightsail ssh://ubuntu@44.239.156.31/home/ubuntu/satoshi-server.git 
git config --global core.sshCommand "ssh -i ~/.ssh/botswana_lightsail_keypair.pem"
git remote add github https://github.com/autemox/satoshi-server.git  
git config --global alias.pushall '!git push github main && git push lightsail main && codemapper .'
git pushall

3. Transfer over .env Variables

Typically I use lysle.net:1000 to transfer them via virtualmin file manager

4. SSH: Inform pm2 about your new project

cd satoshi-server                                            // from ubuntu folder
npm install
pm2 start 3016-satoshi-server.ts --interpreter="ts-node"     // for ts
pm2 save
pm2 list                                                 // make sure it successfully is running

