describe('Management Page E2E', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.loginAsAdmin();
  });

  it('loads management and shows Auto Logoff controls', () => {
    cy.visit('/management');

    // Page container
    cy.get('.network-config .config-section').should('exist');

    // Auto logoff select and optional minutes input
    cy.get('#autoLogoffSelect').should('exist');
    cy.get('#autoLogoffSelect').click({ force: true });
    // Options are custom element children; just verify dropdown exists by checking the element
    cy.get('odx-select').should('exist');
  });

  it('shows password cycle and change password sections', () => {
    cy.visit('/management');

    // Password cycle select exists
    cy.get('#passwordCycle').should('exist');

    // Change password fields exist
    cy.get('#oldPassword').should('exist');
    cy.get('#newPassword').should('exist');
    cy.get('#confirmPassword').should('exist');
  });
});
