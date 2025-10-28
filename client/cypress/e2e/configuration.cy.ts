describe('Configuration Page E2E', () => {
  beforeEach(() => {
    // ensure fresh state and login
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.loginAsAdmin();
  });

  it('validates HTTP port inputs and saves correctly', () => {
    // Stub initial config and capture save calls
    cy.intercept('GET', '/api/port-config', {
      statusCode: 200,
      body: { success: true, config: { tcpPort: 3359, httpPort: 8978 } }
    }).as('getPortConfig');

    const saveHttp = cy.intercept('POST', '/api/port-config', (req) => {
      // Only reply success when httpPort is valid number
      const body = req.body || {};
      if (typeof body.httpPort === 'number') {
        req.reply({ statusCode: 200, body: { success: true } });
      } else {
        req.reply({ statusCode: 400, body: { success: false, message: 'Bad Request' } });
      }
    }).as('saveHttp');

    cy.visit('/config');
    cy.wait('@getPortConfig');

    // Page container should render
    cy.get('.network-config .config-section').should('exist');

    // HTTP server card is the first
    cy.get('.config-card').first().as('httpCard');

    // Enter edit mode
    cy.get('@httpCard').within(() => {
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#httpServerAddress').should('be.disabled');
      cy.get('#httpPort').as('httpPort');

      // 1) empty -> click save -> error message appears and no POST sent
      cy.get('@httpPort').clear();
      cy.get('button.save-button').click();
      cy.get('.hint').should('be.visible').and('contain.text', 'port'); // translation shows an error text

      // 2) non-numeric -> error
      cy.get('@httpPort').clear().type('abc');
      cy.get('button.save-button').click();
      cy.get('.hint').should('be.visible');

      // 3) out of range low -> error
      cy.get('@httpPort').clear().type('1999');
      cy.get('button.save-button').click();
      cy.get('.hint').should('be.visible');

      // 4) out of range high -> error
      cy.get('@httpPort').clear().type('70000');
      cy.get('button.save-button').click();
      cy.get('.hint').should('be.visible');

      // 5) valid -> save, POST is called with correct payload, edit mode closes and view shows new value
      cy.get('@httpPort').clear().type('8081');
      cy.get('button.save-button').click();
    });

    cy.wait('@saveHttp').its('request.body').should('deep.equal', { httpPort: 8081 });

    // After save, card exits edit mode and shows the new saved port in view mode
    cy.get('@httpCard').within(() => {
      cy.get('.edit-mode').should('not.exist');
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', '8081');
    });
  });

  it('validates HL7 TCP port inputs and cancel/save behaviors', () => {
    // Stub initial config and capture save calls
    cy.intercept('GET', '/api/port-config', {
      statusCode: 200,
      body: { success: true, config: { tcpPort: 3359, httpPort: 8978 } }
    }).as('getPortConfig');

    cy.intercept('POST', '/api/port-config', (req) => {
      const body = req.body || {};
      if (typeof body.tcpPort === 'number') {
        req.reply({ statusCode: 200, body: { success: true } });
      } else {
        req.reply({ statusCode: 400, body: { success: false } });
      }
    }).as('saveTcp');

    cy.visit('/config');
    cy.wait('@getPortConfig');

    // HL7 receiver card is the second
    cy.get('.config-card').eq(1).as('hl7Card');

    // Enter edit mode
    cy.get('@hl7Card').within(() => {
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#serverAddress').should('be.disabled');
      cy.get('#port').as('tcpPort');

      // Invalid values checks
      cy.get('@tcpPort').clear();
      cy.get('button.save-button').click();
      cy.get('.hint').should('be.visible');

      cy.get('@tcpPort').clear().type('foo');
      cy.get('button.save-button').click();
      cy.get('.hint').should('be.visible');

      cy.get('@tcpPort').clear().type('1999');
      cy.get('button.save-button').click();
      cy.get('.hint').should('be.visible');

      // Change but then cancel -> should restore saved value and not send POST
      cy.get('@tcpPort').clear().type('5555');
      cy.get('button.cancel-button').click();
    });

    // Verify view mode shows original saved value 3359
    cy.get('@hl7Card').within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', '3359');
    });

    // Re-enter edit mode and save a valid value
    cy.get('@hl7Card').within(() => {
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#port').clear().type('2575');
      cy.get('button.save-button').click();
    });

    cy.wait('@saveTcp').its('request.body').should('deep.equal', { tcpPort: 2575 });

    // Verify saved value reflected
    cy.get('@hl7Card').within(() => {
      cy.get('.edit-mode').should('not.exist');
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', '2575');
    });
  });

  it('keeps saved ports effective after navigating away and back', () => {
    // Maintain mutable config that GET returns
    let currentConfig = { tcpPort: 3359, httpPort: 8978 } as { tcpPort: number; httpPort: number };

    cy.intercept('GET', '/api/port-config', (req) => {
      req.reply({ statusCode: 200, body: { success: true, config: { ...currentConfig } } });
    }).as('getPortConfigDyn');

    cy.intercept('POST', '/api/port-config', (req) => {
      const body = req.body || {};
      if (typeof body.httpPort === 'number') {
        currentConfig.httpPort = body.httpPort;
        req.reply({ statusCode: 200, body: { success: true } });
        return;
      }
      if (typeof body.tcpPort === 'number') {
        currentConfig.tcpPort = body.tcpPort;
        req.reply({ statusCode: 200, body: { success: true } });
        return;
      }
      req.reply({ statusCode: 400, body: { success: false } });
    }).as('savePortDyn');

    // 1) Update HTTP port then TCP port
    cy.visit('/config');
    cy.wait('@getPortConfigDyn');

    // HTTP card
    cy.get('.config-card').first().as('httpCard');
    cy.get('@httpCard').within(() => {
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#httpPort').clear().type('8082');
      cy.get('button.save-button').click();
    });
    cy.wait('@savePortDyn').its('request.body').should('deep.equal', { httpPort: 8082 });

    // TCP card
    cy.get('.config-card').eq(1).as('hl7Card');
    cy.get('@hl7Card').within(() => {
      cy.get('button').contains(/edit/i).click({ force: true });
      cy.get('#port').clear().type('4567');
      cy.get('button.save-button').click();
    });
    cy.wait('@savePortDyn').its('request.body').should('deep.equal', { tcpPort: 4567 });

    // Verify values in view mode now
    cy.get('@httpCard').within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', '8082');
    });
    cy.get('@hl7Card').within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', '4567');
    });

    // 2) Navigate away then back
    cy.visit('/management');
    // simple sanity check
    cy.get('#passwordCycle').should('exist');

    cy.visit('/config');
    cy.wait('@getPortConfigDyn');

    // Values should persist (coming from updated GET)
    cy.get('.config-card').first().within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', '8082');
    });
    cy.get('.config-card').eq(1).within(() => {
      cy.get('.view-mode .config-item').eq(1).find('.value').should('have.text', '4567');
    });
  });
});
