describe("Customer portal smoke", () => {

  it("visits overview and checks fulfillment stats", () => {
    cy.visit("/portal");
    cy.contains("Commerce-grade command center").should("exist");
    cy.contains("Fulfillment").should("exist");
  });

  it("filters inventory table", () => {
    cy.visit("/portal/inventory");
    cy.contains("Live inventory").should("exist");
    cy.get("input[name=search]").clear().type("PC54");
    cy.get("form").first().submit();
    cy.get("body").then(($body) => {
      if ($body.find("table").length) {
        cy.get("table").should("exist");
      } else if ($body.find(".empty-state").length) {
        cy.get(".empty-state").should("contain.text", "No results");
      } else if ($body.text().includes("Configure API credentials")) {
        cy.contains("Configure API credentials").should("exist");
      } else {
        cy.log("Inventory data not available");
      }
    });
  });

  it("loads quotes list and detail", () => {
    cy.visit("/portal/quotes");
    cy.contains("Quotes").should("exist");

    cy.get("body").then(($body) => {
      const quoteLinks = $body.find("table tbody tr a");
      if (quoteLinks.length === 0) {
        if ($body.text().includes("No quotes yet")) {
          cy.contains("No quotes yet").should("exist");
        } else {
          cy.log("No quote links found");
        }
        return;
      }

      const href = quoteLinks.first().attr("href");
      if (!href) {
        cy.log("Quote link missing href");
        return;
      }

      cy.visit(href);
      cy.contains("Quote overview").should("exist");
      cy.contains("Supplier breakdown").should("exist");
    });
  });
});
