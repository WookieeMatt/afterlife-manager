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
        const reqId = foundry.utils.randomID();
        const payload = {
            action: "addRequest",
            requestData: {
                id: reqId,
                type: "fund_transfer",
                requestedBy: game.user.id,
                sourceActorId: sourceActorId,
                targetActorId: targetActorId,
                amount: amount,
                status: "pending",
                timestamp: Date.now()
            }
        };
        
        if (game.user.isGM) await this._onSocketMessage(payload);
        else game.socket.emit(this.SOCKET_NAME, payload);

        this._createChatCard("Transfer Initiated", `Amount: ${amount}eb<br>Auth: ${game.user.name}`, reqId);
    }

    static async requestCustomUpgrade(upgradeData) {
        const reqId = foundry.utils.randomID();
        const payload = {
            action: "addRequest",
            requestData: {
                id: reqId,
                type: "custom_upgrade",
                requestedBy: game.user.id,
                status: "pending",
                timestamp: Date.now(),
                ...upgradeData
            }
        };
        
        if (game.user.isGM) await this._onSocketMessage(payload);
        else game.socket.emit(this.SOCKET_NAME, payload);

        this._createChatCard("Upgrade Pitch", `System: ${upgradeData.targetSystem}<br>Cost: ${upgradeData.cost}eb`, reqId);
    }

    static _createChatCard(title, body, reqId) {
        ChatMessage.create({
            speaker: { alias: "Afterlife OS" },
            content: `
                <div style="background: #1a1a1a; color: #e0e0e0; padding: 10px; border-left: 5px solid #cc0000; font-family: 'Signika', sans-serif;">
                    <h4 style="margin:0; color: #cc0000; text-transform: uppercase;">${title}</h4>
                    <div style="font-size: 0.9rem; margin: 5px 0;">${body}</div>
                    <div class="afterlife-chat-actions flexrow" data-request-id="${reqId}" style="margin-top:10px; gap:5px;">
                        <button type="button" data-action="approve" style="background:#cc0000; color:white; border:none; cursor:pointer; font-weight:bold; padding:2px;">APPROVE</button>
                        <button type="button" data-action="reject" style="background:transparent; color:#e0e0e0; border:1px solid #555; cursor:pointer; font-weight:bold; padding:2px;">REJECT</button>
                    </div>
                </div>
            `
        });
    }

    static async resolveRequest(requestId, resolutionType, visualOptions = { sceneId: "none", macroName: "", journalId: "none" }) {
        const hqJournal = this.hqJournal;
        if (!hqJournal) return false;

        const clubData = hqJournal.getFlag('afterlife-manager', 'afterlifeState') || {};
        const currentInbox = clubData.inbox || [];
        const history = clubData.history || [];
        const customUpgrades = clubData.customUpgrades || [];

        const idx = currentInbox.findIndex(r => r.id === requestId);
        if (idx === -1) return false;
        const request = currentInbox[idx];

        if (resolutionType === "approve" && game.user.isGM) {
            if (request.type === "fund_transfer") {
                const src = game.actors.get(request.sourceActorId);
                if (src) await src.update({ "system.wealth.value": src.system.wealth.value - request.amount });
                
                if (request.targetActorId === "afterlife") {
                    await hqJournal.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', (clubData.basics?.sharedFunds || 0) + request.amount);
                } else {
                    const tgt = game.actors.get(request.targetActorId);
                    if (tgt) await tgt.update({ "system.wealth.value": tgt.system.wealth.value + request.amount });
                }
                history.push({...request, status: "completed", resolvedAt: Date.now()});
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.history', history);
            } else {
                if (request.fundingSource === "personal") {
                    const src = game.actors.get(request.sourceActorId);
                    if (src) await src.update({ "system.wealth.value": src.system.wealth.value - request.cost });
                } else {
                    await hqJournal.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', (clubData.basics?.sharedFunds || 0) - request.cost);
                }
                customUpgrades.push({...request, status: "construction", linkedJournalId: visualOptions.journalId});
                await hqJournal.setFlag('afterlife-manager', 'afterlifeState.customUpgrades', customUpgrades);
                
                if (visualOptions.sceneId !== "none") {
                    const scene = game.scenes.get(visualOptions.sceneId);
                    if (scene) await scene.activate();
                }
                if (visualOptions.macroName) {
                    const macro = game.macros.getName(visualOptions.macroName);
                    if (macro) macro.execute();
                }
                if (visualOptions.journalId !== "none") {
                    const journal = game.journal.get(visualOptions.journalId);
                    if (journal) journal.sheet.render(true);
                }
            }
        }

        const color = resolutionType === "approve" ? "#00ff00" : "#cc0000";
        ChatMessage.create({
            content: `<div style="border-left:5px solid ${color}; padding:10px; background:#1a1a1a; color:white;"><strong>REQUEST ${resolutionType.toUpperCase()}</strong></div>`
        });

        currentInbox.splice(idx, 1);
        await hqJournal.setFlag('afterlife-manager', 'afterlifeState.inbox', currentInbox);
        return true;
    }

    static async _onSocketMessage(payload) {
        if (!game.user.isGM) return;
        const hq = this.hqJournal;
        if (!hq) return;
        const data = hq.getFlag('afterlife-manager', 'afterlifeState') || { inbox: [] };
        const inbox = data.inbox || [];
        inbox.push(payload.requestData);
        await hq.setFlag('afterlife-manager', 'afterlifeState.inbox', inbox);
    }
}