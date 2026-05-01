import { AfterlifeManager } from "./afterlife-manager.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class FundTransferForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-transfer-form", title: "UNIVERSAL FUND TRANSFER", tag: "form",
        window: { width: 400, height: "auto" },
        actions: {
            submitTransfer: async function(event, target) {
                const fd = new FormDataExtended(target.closest("form")).object;
                if (fd.amount > 0) {
                    await AfterlifeManager.requestFundTransfer(fd.sourceActor, fd.targetActor, parseInt(fd.amount));
                    this.close();
                } else ui.notifications.warn("Provide a valid amount.");
            }
        }
    };
    static PARTS = { form: { template: "modules/afterlife-manager/templates/transfer-form.hbs" } };
    async _prepareContext() {
        return { actors: game.actors.filter(a => a.isOwner), allActors: game.actors.map(a => ({ id: a.id, name: a.name })) };
    }
}

export class UpgradePitchForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-upgrade-form", title: "PURCHASE UPGRADE", tag: "form",
        window: { width: 450, height: "auto" },
        actions: {
            submitUpgrade: async function(event, target) {
                const fd = new FormDataExtended(target.closest("form")).object;
                fd.sourceActorId = game.user.character?.id || null;
                if(fd.cost > 0) {
                    await AfterlifeManager.requestCustomUpgrade(fd);
                    this.close();
                } else ui.notifications.warn("Provide a valid cost.");
            }
        }
    };
    static PARTS = { form: { template: "modules/afterlife-manager/templates/upgrade-form.hbs" } };
}