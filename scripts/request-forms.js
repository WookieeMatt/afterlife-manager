import { AfterlifeManager } from "./afterlife-manager.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class FundTransferForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-transfer-form",
        title: "FUND TRANSFER",
        tag: "form",
        classes: ["afterlife-dashboard"], 
        window: { width: 400, height: "auto" },
        actions: { submitTransfer: FundTransferForm._onSubmit }
    };

    static PARTS = { form: { template: "modules/afterlife-manager/templates/transfer-form.hbs" } };

    async _prepareContext() {
        const ownedActors = game.actors.filter(a => a.isOwner && a.type === "character");
        const allCharacters = game.actors.filter(a => a.type === "character");
        
        return { 
            actors: ownedActors.map(a => ({ id: a.id, name: a.name })),
            allActors: allCharacters.map(a => ({ id: a.id, name: a.name }))
        };
    }

    static async _onSubmit(event, target) {
        const form = target.closest("form");
        const source = form.querySelector("[name='sourceActor']").value;
        const targetId = form.querySelector("[name='targetActor']").value;
        const amount = parseInt(form.querySelector("[name='amount']").value);

        if (source && targetId && amount > 0) {
            await AfterlifeManager.requestFundTransfer(source, targetId, amount);
            ui.notifications.info("Transfer request transmitted to Fixer.");
            this.close(); 
        } else {
            ui.notifications.warn("Provide a valid sender, recipient, and amount.");
        }
    }
}

export class UpgradePitchForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-upgrade-form",
        title: "PURCHASE UPGRADE",
        tag: "form",
        classes: ["afterlife-dashboard"], 
        window: { width: 450, height: "auto" },
        actions: { submitUpgrade: UpgradePitchForm._onSubmit }
    };

    static PARTS = { form: { template: "modules/afterlife-manager/templates/upgrade-form.hbs" } };

    static async _onSubmit(event, target) {
        const form = target.closest("form");
        const data = {
            targetSystem: form.querySelector("[name='targetSystem']").value,
            cost: parseInt(form.querySelector("[name='cost']").value) || 0,
            description: form.querySelector("[name='description']").value
        };

        if (data.targetSystem && data.cost > 0) {
            await AfterlifeManager.requestCustomUpgrade(data);
            ui.notifications.info("Upgrade pitch transmitted to Fixer.");
            this.close();
        } else {
            ui.notifications.warn("Please provide an upgrade name and cost.");
        }
    }
}