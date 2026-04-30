export class AfterlifeManager {
    static SOCKET_NAME = "module.afterlife-manager";

    static get hqJournal() {
        const journalId = game.settings.get("afterlife-manager", "hqJournalId");
        return game.journal.get(journalId);
    }

    static init() {
        game.socket.on(this.SOCKET_NAME, this._onSocketMessage.bind(this));
    }

    static async requestFundTransfer(sourceActorId, targetActorId, amount) {
        const payload = {
            action: "addRequest",
            requestData: {
                id: foundry.utils.randomID(),
                type: "fund_transfer",
                requestedBy: game.user.id,
                sourceActorId: sourceActorId,
                targetActorId: targetActorId,
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
            const hqJournal = this.hqJournal;
            if (!hqJournal) return ui.notifications.error("Afterlife Manager: Please assign an HQ Journal in settings.");

            const clubData = hqJournal.getFlag('afterlife-manager', 'afterlifeState') || { inbox: [] };
            const currentInbox = clubData.inbox || [];
            
            currentInbox.push(payload.requestData);
            await hqJournal.setFlag('afterlife-manager', 'afterlifeState.inbox', currentInbox);
        }
    }

    static async resolveRequest(requestId, resolutionType, visualOptions = { sceneId: "none", macroName: "" }) {
        const hqJournal = this.hqJournal;
        if (!hqJournal) return;

        const clubData = hqJournal.getFlag('afterlife-manager', 'afterlifeState') || {};
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

                if (request.targetActorId === "afterlife") {
                    const currentFunds = clubData.basics?.sharedFunds || 0;
                    await hqJournal.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', currentFunds + request.amount);
                } else {
                    const targetActor = game.actors.get(request.targetActorId);
                    if (targetActor) {
                        const targetEb = targetActor.system.wealth.value;
                        await targetActor.update({ "system.wealth.value": targetEb + request.amount });
                    }
                }
                
                request.status = "completed";
                transferHistory.push(request);
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.history', transferHistory);
            }

            if (request.type === "custom_upgrade") {
                const currentFunds = clubData.basics?.sharedFunds || 0;
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', currentFunds - request.cost);
                
                request.status = "construction";
                customUpgrades.push(request);
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.customUpgrades', customUpgrades);

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
        await hqJournal.setFlag('afterlife-manager', 'afterlifeState.inbox', currentInbox);
    }
}