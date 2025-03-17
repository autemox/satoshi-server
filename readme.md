--------------------------
How to Start a New Typescript Node Project
--------------------------
3. delete the .git folder in this project folder and start a new git project using github desktop
4. Create .env file and populate it with needed variables
5. Follow OneNote guide to 'Adding Project to AWS' under JS/TS Projects in AWS > Creating a New Project, or see below:
6. to test the app in terminal: npx ts-node -P tsconfig.json 3016-satoshi-server.ts
7. Update this readme to reflect your new project's details

--------------------------
'Adding Project to AWS'
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
