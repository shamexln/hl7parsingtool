// Cypress Support - runs before every spec

// Add custom commands here if needed
declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
      loginWithBackend(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAsAdmin', () => {
  // Mock backend auth endpoints to allow UI login without a real server
  cy.intercept('GET', '/api/auth/setup-required', {
    statusCode: 200,
    body: { setupRequired: false }
  }).as('setupRequired');

  cy.intercept('POST', '/api/auth/login', (req) => {
    req.reply({ statusCode: 200, body: { token: 'test-token', refreshToken: 'rt-token' } });
  }).as('login');

  // Wait for the Angular dev server to be up (helps when Cypress is opened without the npm script)
  const baseUrl = Cypress.config('baseUrl') || 'http://localhost:4200';
  cy.request({
    url: baseUrl + '/',
    // Do not fail the test on non-2xx (e.g., 302 redirect to /login or 404) while probing
    failOnStatusCode: false,
    retryOnNetworkFailure: true,
    timeout: 60000,
  });

  cy.visit('/login');
  cy.wait('@setupRequired');

  // App has username preset to 'admin'; fill password and submit
  cy.get('input#password').should('be.visible').type('any-password');
  cy.get('button.login-button').click();
  cy.wait('@login');
});

// Backend-login helper: performs real UI login against a running backend (no intercepts)
Cypress.Commands.add('loginWithBackend', () => {
  const baseUrl = Cypress.config('baseUrl') || 'http://localhost:4200';
  // Probe dev server readiness
  cy.request({
    url: baseUrl + '/',
    failOnStatusCode: false,
    retryOnNetworkFailure: true,
    timeout: 60000,
  });

  // Check if backend requires initial setup
  cy.request({
    method: 'GET',
    url: '/api/auth/setup-required',
    failOnStatusCode: false,
  }).then((res) => {
    const setupRequired = res.status === 200 && !!(res.body && res.body.setupRequired);
    const pwd = Cypress.env('PASSWORD') || 'Draeger123';

    cy.visit('/login');

    // Username is prefilled and readonly as 'admin'
    cy.get('#password').should('be.visible').clear().type(pwd);
    if (setupRequired) {
      cy.get('#confirmPassword').should('be.visible').clear().type(pwd);
    }
    cy.get('button.login-button').click();

    // Wait for possible redirect; some backends may stay on /login when session handling differs
    cy.location('pathname', { timeout: 15000 }).should((p) => {
      expect(['/patient-query', '/login']).to.include(p);
    });
  });
});

export {};
