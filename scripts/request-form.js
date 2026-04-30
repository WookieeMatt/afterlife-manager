import { AfterlifeManager } from "./afterlife-manager.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AfterlifeRequestForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-request-form",
        title: "SUBMIT REQUEST",
        tag: "form",
        classes: ["afterlife-dashboard"], 
        window: { width: 450, height: "auto" },
        actions: {
            toggleFormType: AfterlifeRequestForm._onToggleType,
            submitRequest: AfterlifeRequestForm._onSubmit
        }
    };

    static PARTS = {
        form: { template: "modules/afterlife-manager/templates/request-form.hbs" }
    };

    async _prepareContext() {
        const ownedActors = game.actors.filter(a => a.isOwner && a.type === "character");
        return { actors: ownedActors.map(a => ({ id: a.id, name: a.name })) };
    }

    static _onToggleType(event, target) {
        const form = target.closest("form");
        const type = target.value;
        form.querySelector("#transfer-fields").style.display = type === "transfer" ? "block" : "none";
        form.querySelector("#upgrade-fields").style.display = type === "upgrade" ? "block" : "none";
    }

    static async _onSubmit(event, target) {
        const form = target.closest("form");
        const type = form.querySelector("[name='requestType']").value;

        if (type === "transfer") {
            const source = form.querySelector("[name='sourceActor']").value;
            const amount = parseInt(form.querySelector("[name='amount']").value);
            if (source && amount > 0) await AfterlifeManager.requestFundTransfer(source, amount);
            else return ui.notifications.warn("Provide a valid source and amount.");
        } else {
            const data = {
                targetSystem: form.querySelector("[name='targetSystem']").value,
                previousState: form.querySelector("[name='previousState']").value,
                newState: form.querySelector("[name='newState']").value,
                cost: parseInt(form.querySelector("[name='cost']").value) || 0,
                description: form.querySelector("[name='description']").value
            };
            await AfterlifeManager.requestCustomUpgrade(data);
        }
        
        ui.notifications.info("Request transmitted to HQ.");
        this.close(); 
    }
}