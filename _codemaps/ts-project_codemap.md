# ts-project

> CodeMap Source: Local directory: `/Users/lysle/Workspace/ts-project`

This markdown document provides a comprehensive overview of the directory structure and file contents. It aims to give viewers (human or AI) a complete view of the codebase in a single file for easy analysis.

## Document Table of Contents

The table of contents below is for navigational convenience and reflects this document's structure, not the actual file structure of the repository.

<!-- TOC -->

- [ts-project](#ts-project)
  - [Document Table of Contents](#document-table-of-contents)
  - [Repo File Tree](#repo-file-tree)
  - [Repo File Contents](#repo-file-contents)
    - [.gitignore](#gitignore)
    - [.gitattributes](#gitattributes)
    - [.sampleenv](#sampleenv)
    - [.vscode/launch.json](#vscodelaunchjson)
    - [3000-ts-project.ts](#3000-ts-projectts)
    - [ecosystem.config.js](#ecosystemconfigjs)
    - [package-lock.json](#package-lockjson)
    - [package.json](#packagejson)
    - [public/images/snoopr.gif](#publicimagessnooprgif)
    - [readme.md](#readmemd)
    - [src/ExampleClass.ts](#srcexampleclassts)
    - [src/HttpServer.ts](#srchttpserverts)
    - [src/Main.ts](#srcmaints)
    - [src/routes/index.ts](#srcroutesindexts)
    - [tsconfig.json](#tsconfigjson)
    - [views/index.ejs](#viewsindexejs)

<!-- /TOC -->

## Repo File Tree

This file tree represents the actual structure of the repository. It's crucial for understanding the organization of the codebase.

```tree
.
├── .vscode/
│   └── launch.json
├── _codemaps/
├── node_modules/
├── public/
│   ├── images/
│   │   └── snoopr.gif
├── src/
│   ├── routes/
│   │   └── index.ts
│   ├── ExampleClass.ts
│   ├── HttpServer.ts
│   └── Main.ts
├── views/
│   └── index.ejs
├── .gitattributes
├── .gitignore
├── .sampleenv
├── 3000-ts-project.ts
├── ecosystem.config.js
├── package-lock.json
├── package.json
├── readme.md
└── tsconfig.json

8 directories, 16 files
```

## Repo File Contents

The following sections present the content of each file in the repository. Large and binary files are acknowledged but their contents are not displayed.

### .sampleenv

```txt
PORT=3000
ADMIN_PASSWORD=
```

### 3000-ts-project.ts

```typescript
[Large or binary file detected. File Type: video/mp2t, Size: 226 bytes]
```

### readme.md

````markdown
To start a new node.ts project:
1. Find and replace all 3000 with your port, all ts-project with your ts-project
2. Change the folder ts-project and 3000-ts-project.ts to the name of your project
3. Make sure package.json and launch.json and ecosystem.config.js were changed to point to the new .ts file from (2)
4. run in terminal: npx ts-node -P tsconfig.json 3000-ts-project.ts
5. delete the .git folder in this project folder so that you can start a new git project instead of overriding ts-project
6. Update this readme to reflect your new project's details
7. Create .env file and populate it with needed variables
8. Follow OneNote guide to 'Adding Project to AWS' under JS/TS Projects in AWS > Creating a New Project, or see below:

--------------------------
'Adding Project to AWS'
--------------------------

1. SSH: Create project folders and set up to receive gitpush command

mkdir ts-project
mkdir ts-project.git                  // bare directory isolates version control from live environment
cd ts-project.git
git init --bare

nano hooks/post-receive               // this is how the repo will deploy files to website

    // copy and paste the below for TS projects (JS will need a different third line):

    #!/bin/sh
    GIT_WORK_TREE=/home/ubuntu/ts-project git checkout -f main
    pm2 restart /home/ubuntu/ts-project/3000-ts-project.ts --interpreter="ts-node"
    
chmod +x hooks/post-receive           // makes hook executable

2. TERMINAL: Set up 'gitpush' command on local computer

How to set up 'git pushall' from terminal:
git remote add lightsail ssh://ubuntu@44.239.156.31/home/ubuntu/news-aggregator.git 
git config --global core.sshCommand "ssh -i ~/.ssh/botswana_lightsail_keypair.pem"
git remote add github https://github.com/autemox/news-aggregator.git  
git config --global alias.pushall '!git push github main && git push lightsail main && codemapper .'
git pushall

3. Transfer over .env Variables

Typically I use lysle.net:1000 to transfer them via virtualmin file manager

4. SSH: Inform pm2 about your new project

cd ts-project                                            // from ubuntu folder
npm install
pm2 start 3000-ts-project.ts --interpreter="ts-node"     // for ts
pm2 save
pm2 list                                                 // make sure it successfully is running
````

### .gitignore

```ini
.env
node_modules/
*.bak
_codemaps/
.DS_Store
src/ssl/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# Snowpack dependency directory (https://snowpack.dev/)
web_modules/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and not Next.js
# https://nextjs.org/blog/next-9-1#public-directory-support
# public

# vuepress build output
.vuepress/dist

# vuepress v2.x temp and cache directory
.temp
.cache

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*
```

### package-lock.json

```json
[Large or binary file detected. File Type: application/json, Size: 45448 bytes]
```

### package.json

```json
[Large or binary file detected. File Type: application/json, Size: 616 bytes]
```

### .gitattributes

```txt
# Auto detect text files and perform LF normalization
* text=auto
```

### tsconfig.json

```json
[Large or binary file detected. File Type: application/json, Size: 12288 bytes]
```

### ecosystem.config.js

```javascript
//
// The ecosystem.config.js file is used by PM2 to define the deployment settings for your application. 
// When deploying to AWS, the file is configured to set the NODE_ENV variable to 'production', ensuring 
// the application runs in production mode. For local development, the ecosystem.config.js file is not 
// used, and the NODE_ENV variable can be set to 'development' using other methods like .env files or 
// VS Code launch configurations, allowing the application to run in development mode on localhost.
//

module.exports = {
    apps: [
      {
        name: 'ts-project',
        script: '3000-ts-project.ts',
        env: {
          NODE_ENV: 'production',
        },
      },
    ],
  };
```

### public/images/snoopr.gif

```txt
[Large or binary file detected. File Type: image/gif, Size: 910 bytes]
```

### .vscode/launch.json

```json
[Large or binary file detected. File Type: application/json, Size: 593 bytes]
```

### views/index.ejs

```txt
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ts-project</title>

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light py-5">
    <div class="container">
        <div class="bg-white p-4 rounded shadow-sm">
            <div class="d-flex justify-content-center align-items-center mb-4">
                <h2 class="mb-0">New Project</h2>
            </div>

            <img src="/images/snoopr.gif" alt="Snoopr" class="float-start">
            <p>This is a sample page for a new project called ts-project.  <%= viewData.content %></p>
        </div>
    </div>

    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
```

### src/Main.ts

```typescript
[Large or binary file detected. File Type: video/mp2t, Size: 428 bytes]
```

### src/HttpServer.ts

```typescript
[Large or binary file detected. File Type: video/mp2t, Size: 1715 bytes]
```

### src/ExampleClass.ts

```typescript
[Large or binary file detected. File Type: video/mp2t, Size: 332 bytes]
```

### src/routes/index.ts

```typescript
[Large or binary file detected. File Type: video/mp2t, Size: 265 bytes]
```

> This concludes the repository's file contents. Please review thoroughly for a comprehensive understanding of the codebase.
