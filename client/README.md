# hl7parsegui

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```
To start a local development server with proxy port, run:
```bash
 ng serve -c development --proxy-config proxy.conf.json  
```


Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

To build the project to release:

```bash
ng build --configuration production
```


This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

This project uses Cypress for e2e tests.

1. In one terminal, start the dev server:

```bash
ng serve
```

2. In another terminal, run Cypress in interactive mode:

```bash
npm run e2e:open
```

Or run headless in CI:

```bash
npm run e2e
```

Notes:
- You do NOT need to start the dev server manually anymore. The e2e scripts auto-start `ng serve` and wait for http://localhost:4200 to become available.
- Opening Cypress directly (e.g., via IDE or `npx cypress open`) is also supported now: Cypress will auto-start `ng serve` if nothing is listening on http://localhost:4200, then wait until it is reachable before a run. Set `CYPRESS_START_SERVER=false` to disable this behavior.
- No real backend is required. Cypress stubs the necessary API endpoints during tests.
- Mocked endpoints:
  - GET /api/auth/setup-required
  - POST /api/auth/login
  - GET /api/port-config
  - POST /api/port-config
- Base URL is http://localhost:4200.

If port 4200 is busy, you can override at runtime:

```bash
npx start-server-and-test "ng serve --port 4300" http://localhost:4300 "cypress open"
```

Or adjust `baseUrl` via Cypress CLI:

```bash
npx start-server-and-test "ng serve --port 4300" http://localhost:4300 "cypress run --config baseUrl=http://localhost:4300"
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.


## How to Test

This project includes two types of tests:

- Unit tests (Karma + Jasmine)
- End-to-end tests (Cypress)

Before you start, make sure dependencies are installed in the client directory:

```bash
npm install
```

### 1) Run unit tests

```bash
ng test
```

Note: Unit tests run in a browser via Karma.

### 2) Run end-to-end tests (Cypress)

You do NOT need to start the Angular dev server manually; the scripts will start it and wait for http://localhost:4200.

- Interactive mode (recommended for local debugging):

```bash
npm run e2e:open
```

- Headless mode (suitable for CI):

```bash
npm run e2e
```

Notes:
- No real backend is required for E2E tests. Cypress stubs the necessary API endpoints.
- Mocked endpoints:
  - GET /api/auth/setup-required
  - POST /api/auth/login
  - GET /api/port-config
  - POST /api/port-config
- Base URL: http://localhost:4200.

### Troubleshooting
- Port is in use: change the Angular dev server port or stop the process occupying that port.
- Page won’t load or API errors: make sure you started the app with `ng serve` and can access http://localhost:4200 in your browser.
- Cypress cannot find elements: ensure the page has finished rendering, or run in interactive mode to observe selectors and timing.

## FAQ

- Do these tests require a real backend?
  - No. Cypress intercepts and mocks the required endpoints so the tests run without any backend.
  - Mocked endpoints:
    - GET /api/auth/setup-required
    - POST /api/auth/login
    - GET /api/port-config
    - POST /api/port-config
  - You only need the Angular dev server running locally via `ng serve`.


## Run E2E against a real backend

These tests are designed to run with the backend server started and reachable via the Angular dev server proxy (see proxy.conf.json). They do NOT mock API endpoints.

Prerequisites:
- Start your backend locally and ensure Angular can reach it through /api (http://localhost:4200/api/* when using ng serve with the provided proxy).
- Install client dependencies: npm install

Recommended way (auto-starts Angular dev server):
- Interactive: npm run e2e:backend:open
- Headless: npm run e2e:backend

What these scripts do:
- Start Angular dev server with proxy (port 4200)
- Run only the backend-specific specs: cypress/e2e/*.backend.cy.ts

Credentials:
- The backend login uses username admin and a password provided via Cypress environment variable.
- Set the password before running (PowerShell example):
  - $env:CYPRESS_PASSWORD = "your-admin-password"
- If not provided, the tests default to admin123! for first-login or normal login flows.

Notes:
- The backend specs avoid saving changes to persistent settings (they enter edit mode and then cancel) to prevent altering server state.
- Existing mocked E2E specs continue to work independently (npm run e2e / e2e:open).


## Auth in E2E: Do I need a token for cy.visit('/config')?

Short answer: You must be authenticated to access /config in the app, but the Cypress specs handle this for you before calling cy.visit('/config').

- The route /config is protected by an auth guard. If you are not logged in, the app redirects to /login.
- Mocked E2E mode (npm run e2e / e2e:open):
  - The tests call cy.loginAsAdmin() in beforeEach(). This stubs the auth endpoints and performs a UI login. The app considers the user logged in, so cy.visit('/config') works.
  - The Authorization header (with a fake token) is attached automatically by the app’s HTTP interceptor when needed.
- Real backend E2E mode (npm run e2e:backend / e2e:backend:open):
  - The tests call cy.loginWithBackend() in beforeEach() to perform a real UI login against your backend. After that, cy.visit('/config') works because the session is authenticated.
- If you skip the login step and directly run cy.visit('/config'), the guard will block access and you’ll be redirected to /login.

Notes:
- cy.visit('/config') itself doesn’t “carry a token”. It simply loads the app route. Authentication is established beforehand via the login helpers, and any API calls the page makes will include credentials via the app’s HTTP interceptor/session.
- If your backend uses cookie-based sessions, ensure your login succeeds in the UI before navigating to protected routes. The provided cy.loginWithBackend() handles the normal and first-login flows.
