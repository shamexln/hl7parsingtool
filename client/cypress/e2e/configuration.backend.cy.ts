describe('Configuration Page (Backend) E2E', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.loginWithBackend();
  });

  it('loads configuration from backend and shows current ports', () => {
    cy.visit('/config');

    // Page container should render
    cy.get('.network-config .config-section').should('exist');

    // HTTP server card (first) should show a numeric port in view mode
    cy.get('.config-card').first().within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value')
        .invoke('text')
        .then((t) => {
          const txt = (t || '').toString().trim();
          expect(/^[0-9]+$/.test(txt)).to.be.true;
        });
      // Enter and exit edit mode without saving (do not mutate backend)
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#httpPort').should('exist');
      cy.get('button.cancel-button').click();
      cy.get('.edit-mode').should('not.exist');
    });

    // HL7 receiver card (second) should show a numeric port
    cy.get('.config-card').eq(1).within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value')
        .invoke('text')
        .then((t) => {
          const txt = (t || '').toString().trim();
          expect(/^[0-9]+$/.test(txt)).to.be.true;
        });
      // Enter and exit edit mode without saving
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#port').should('exist');
      cy.get('button.cancel-button').click();
      cy.get('.edit-mode').should('not.exist');
    });
  });

  it('updates HTTP and TCP ports and persists after navigation (real backend)', () => {
    const newHttp = 8083;
    const newTcp = 4589;

    cy.visit('/config');

    // Update HTTP port on first card
    cy.get('.config-card').first().as('httpCard');
    cy.get('@httpCard').within(() => {
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#httpPort').clear().type(String(newHttp));
      cy.get('button.save-button').click();
    });

    // After save, card should exit edit mode and show new value
    cy.get('@httpCard').within(() => {
      cy.get('.edit-mode').should('not.exist');
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', String(newHttp));
    });

    // Update TCP port on second card
    cy.get('.config-card').eq(1).as('tcpCard');
    cy.get('@tcpCard').within(() => {
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#port').clear().type(String(newTcp));
      cy.get('button.save-button').click();
    });

    cy.get('@tcpCard').within(() => {
      cy.get('.edit-mode').should('not.exist');
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', String(newTcp));
    });

    // Navigate away and back
    cy.visit('/management');
    cy.get('#passwordCycle').should('exist');
    cy.visit('/config');

    // Verify persisted values from backend
    cy.get('.config-card').first().within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', String(newHttp));
    });
    cy.get('.config-card').eq(1).within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', String(newTcp));
    });
  });
});
