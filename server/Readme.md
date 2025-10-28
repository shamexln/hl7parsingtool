打包步骤
1. 先编译angular,然后把angular/dist/hl7parsegui目录下面所有的包括子目录browser都copy到hl7prase的public目录下面
2. package.json里面加入
   "name": "hl7parse",
   "version": "1.0.0",
   "main": "index.js",
   "scripts": {
   "test": "jest",
   "build": "pkg ."
   },
   "bin": "./index.js",
   "pkg": {
   "assets": [
3. "public/**",
   "public/browser/**",
   "node_modules/sqlite3/**/*",
   "./300.xml",
   "./port-config.json"
   ],
   "targets": [
   "node18-win-x64"
   ],
   "outputPath": "dist"
   }, 
3. 运行npm run build 打包
打包步骤
1. 先编译angular,然后把angular/dist/hl7parsegui目录下面所有的包括子目录browser都copy到hl7prase的public目录下面
2. package.json里面加入
   "name": "hl7parse",
   "version": "1.0.0",
   "main": "index.js",
   "scripts": {
   "test": "jest",
   "build": "pkg ."
   },
   "bin": "./index.js",
   "pkg": {
   "assets": [
3. "public/**",
   "public/browser/**",
   "node_modules/sqlite3/**/*",
   "./300.xml",
   "./port-config.json"
   ],
   "targets": [
   "node18-win-x64"
   ],
   "outputPath": "dist"
   }, 
3. 运行npm run build 打包


ESLint (Server) — How it works and how to run it
- Automatic checks: ESLint runs automatically before build and before start via npm lifecycle hooks.
  - prebuild -> runs eslint .
  - prestart -> runs eslint .
- Manual run: You can run the linter anytime.
  1) Install dependencies (first time only):
     npm install
  2) Lint all server code:
     npm run lint
- Build the executable (with auto‑lint):
     npm run build
- Start the server (with auto‑lint):
     npm start

Notes
- ESLint v9+ flat config is used via eslint.config.js (replaces legacy .eslintrc.* / .eslintignore).
- Base rules come from @eslint/js (eslint:recommended) plus a strict no-undef rule.
- Common Node.js globals (process, __dirname, Buffer) are declared to avoid false positives.
- Ignored folders are configured inside eslint.config.js: node_modules, dist, logs, output, public.
