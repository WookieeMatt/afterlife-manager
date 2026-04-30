export class AfterlifeManager {
    static SOCKET_NAME = "module.afterlife-manager";

    // Fetches the assigned Journal Entry from the Foundry settings
    static get hqJournal() {
        const journalId = game.settings.get("afterlife-manager", "hqJournalId");
        return game.journal.get(journalId);
    }

    static init() {
        game.socket.on(this.SOCKET_NAME, this._onSocketMessage.bind(this));
    }

    // --- PLAYER ACTIONS (Sending Requests) ---

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

    // --- GM / SYSTEM ACTIONS (Processing Sockets) ---

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

    // --- INBOX RESOLUTION (Triggered via UI by GM or Owner) ---

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

        // If the GM clicks Approve
        if (resolutionType === "approve" && game.user.isGM) {
            
            // Handle Eurobuck Transfers
            if (request.type === "fund_transfer") {
                // Deduct from the player's Actor sheet
                const sourceActor = game.actors.get(request.sourceActorId);
                const currentEb = sourceActor.system.wealth.value; // Adjust path if CPR system data structure differs
                await sourceActor.update({ "system.wealth.value": currentEb - request.amount });

                // Add to the Journal's shared pool
                const currentFunds = clubData.basics?.sharedFunds || 0;
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', currentFunds + request.amount);
                
                // Move to history ledger
                request.status = "completed";
                transferHistory.push(request);
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.history', transferHistory);
            }

            // Handle Upgrade Pitches
            if (request.type === "custom_upgrade") {
                // Deduct cost from the shared pool
                const currentFunds = clubData.basics?.sharedFunds || 0;
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', currentFunds - request.cost);
                
                // Move to active construction
                request.status = "construction";
                customUpgrades.push(request);
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.customUpgrades', customUpgrades);

                // Execute Visual Routing: Scene Swap
                if (visualOptions.sceneId !== "none" && visualOptions.sceneId !== "") {
                    const newScene = game.scenes.get(visualOptions.sceneId);
                    if (newScene) {
                        await newScene.activate(); 
                        ui.notifications.info(`Afterlife OS: Rerouting crew to ${newScene.name}.`);
                    }
                }

                // Execute Visual Routing: Macro Trigger (Monk's Active Tiles)
                if (visualOptions.macroName !== "") {
                    const macro = game.macros.getName(visualOptions.macroName);
                    if (macro) {
                        macro.execute();
                    } else {
                        ui.notifications.warn(`Afterlife OS: Macro "${visualOptions.macroName}" not found.`);
                    }
                }
            }
        }

        // Clean up the inbox regardless of approve, reject, or cancel
        currentInbox.splice(requestIndex, 1);
        await hqJournal.setFlag('afterlife-manager', 'afterlifeState.inbox', currentInbox);
    }
}