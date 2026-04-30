import { AfterlifeManager } from "./afterlife-manager.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class FundTransferForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-transfer-form", title: "FUND TRANSFER", tag: "form",
        classes: ["afterlife-dashboard"], window: { width: 400, height: "auto" },
        actions: {
            submitTransfer: async function(event, target) {
                const fd = new FormDataExtended(target.closest("form")).object;
                if (fd.amount > 0) {
                    await AfterlifeManager.requestFundTransfer(fd.sourceActor, fd.targetActor, parseInt(fd.amount));
                    this.close();
                }
            }
        }
    };
    static PARTS = { form: { template: "modules/afterlife-manager/templates/transfer-form.hbs" } };
    async _prepareContext() {
        return { 
            actors: game.actors.filter(a => a.isOwner && a.type === "character"),
            allActors: game.actors.filter(a => a.type === "character")
        };
    }
}

export class UpgradePitchForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-upgrade-form", title: "PURCHASE UPGRADE", tag: "form",
        classes: ["afterlife-dashboard"], window: { width: 450, height: "auto" },
        actions: {
            submitUpgrade: async function(event, target) {
                const fd = new FormDataExtended(target.closest("form")).object;
                if (fd.targetSystem && fd.cost > 0) {
                    fd.sourceActorId = game.user.character?.id || null;
                    await AfterlifeManager.requestCustomUpgrade(fd);
                    this.close();
                }
            }
        }
    };
    static PARTS = { form: { template: "modules/afterlife-manager/templates/upgrade-form.hbs" } };
}