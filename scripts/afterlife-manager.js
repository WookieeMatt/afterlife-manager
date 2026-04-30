export class AfterlifeManager {
    static SOCKET_NAME = "module.afterlife-manager";

    static get hqActor() {
        const actorId = game.settings.get("afterlife-manager", "hqActorId");
        return game.actors.get(actorId);
    }

    static init() {
        game.socket.on(this.SOCKET_NAME, this._onSocketMessage.bind(this));
    }

    static async requestFundTransfer(sourceActorId, amount) {
        const payload = {
            action: "addRequest",
            requestData: {
                id: foundry.utils.randomID(),
                type: "fund_transfer",
                requestedBy: game.user.id,
                sourceActorId: sourceActorId,
                amount: amount,
                status: "pending",
                timestamp: Date.now()
            }
        };
        game.socket.emit(this.SOCKET_NAME, payload);
    }

    static async requestCustomUpgrade(upgradeData) {
        const payload = {
            action: "addRequest",
            requestData: {
                id: foundry.utils.randomID(),
                type: "custom_upgrade",
                requestedBy: game.user.id,
                status: "pending",
                timestamp: Date.now(),
                ...upgradeData
            }
        };
        game.socket.emit(this.SOCKET_NAME, payload);
    }

    static async _onSocketMessage(payload) {
        if (!game.user.isGM) return;

        if (payload.action === "addRequest") {
            const hqActor = this.hqActor;
            if (!hqActor) return ui.notifications.error("Afterlife Manager: Please assign an HQ Actor in settings.");

            const clubData = hqActor.getFlag('afterlife-manager', 'afterlifeState') || { inbox: [] };
            const currentInbox = clubData.inbox || [];
            
            currentInbox.push(payload.requestData);
            await hqActor.setFlag('afterlife-manager', 'afterlifeState.inbox', currentInbox);
        }
    }

    static async resolveRequest(requestId, resolutionType, visualOptions = { sceneId: "none", macroName: "" }) {
        const hqActor = this.hqActor;
        if (!hqActor) return;

        const clubData = hqActor.getFlag('afterlife-manager', 'afterlifeState') || {};
        const currentInbox = clubData.inbox || [];
        const transferHistory = clubData.history || [];
        const customUpgrades = clubData.customUpgrades || [];

        const requestIndex = currentInbox.findIndex(req => req.id === requestId);
        if (requestIndex === -1) return;

        const request = currentInbox[requestIndex];

        if (resolutionType === "approve" && game.user.isGM) {
            
            if (request.type === "fund_transfer") {
                const sourceActor = game.actors.get(request.sourceActorId);
                const currentEb = sourceActor.system.wealth.value; 
                await sourceActor.update({ "system.wealth.value": currentEb - request.amount });

                const currentFunds = clubData.basics?.sharedFunds || 0;
                await hqActor.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', currentFunds + request.amount);
                
                request.status = "completed";
                transferHistory.push(request);
                await hqActor.setFlag('afterlife-manager', 'afterlifeState.history', transferHistory);
            }

            if (request.type === "custom_upgrade") {
                const currentFunds = clubData.basics?.sharedFunds || 0;
                await hqActor.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', currentFunds - request.cost);
                
                request.status = "construction";
                customUpgrades.push(request);
                await hqActor.setFlag('afterlife-manager', 'afterlifeState.customUpgrades', customUpgrades);

                if (visualOptions.sceneId !== "none" && visualOptions.sceneId !== "") {
                    const newScene = game.scenes.get(visualOptions.sceneId);
                    if (newScene) {
                        await newScene.activate(); 
                        ui.notifications.info(`Afterlife OS: Rerouting crew to ${newScene.name}.`);
                    }
                }

                if (visualOptions.macroName !== "") {
                    const macro = game.macros.getName(visualOptions.macroName);
                    if (macro) macro.execute();
                    else ui.notifications.warn(`Afterlife OS: Macro "${visualOptions.macroName}" not found.`);
                }
            }
        }

        currentInbox.splice(requestIndex, 1);
        await hqActor.setFlag('afterlife-manager', 'afterlifeState.inbox', currentInbox);
    }
}