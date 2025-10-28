describe('Management Page (Backend) E2E', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.loginWithBackend();
  });

  it('loads management page with real backend and shows controls', () => {
    cy.visit('/management');

    // Page container
    cy.get('.network-config .config-section').should('exist');

    // Auto Logoff controls render
    cy.get('#autoLogoffSelect').should('exist');
    cy.get('odx-select').should('exist');

    // Password cycle select exists
    cy.get('#passwordCycle').should('exist');

    // Change password fields exist
    cy.get('#oldPassword').should('exist');
    cy.get('#newPassword').should('exist');
    cy.get('#confirmPassword').should('exist');
  });

  it('saves password cycle and persists after navigation (real backend)', () => {
    const cycle = '1m';

    cy.visit('/management');

    // Change cycle in select and save
    cy.get('#passwordCycle').should('exist').select(cycle);
    // Click the save/confirm button in the Password Cycle card
    cy.contains('button', /confirm/i).click({ force: true });

    // Optional: wait for any UI success message to appear
    cy.get('.hint').contains(/saved|success/i, { matchCase: false }).should('exist');

    // Navigate away and back
    cy.visit('/config');
    cy.get('.network-config .config-section').should('exist');
    cy.visit('/management');

    // Verify the selected value persisted (loaded from backend)
    cy.get('#passwordCycle').should('have.value', cycle);
  });
});
