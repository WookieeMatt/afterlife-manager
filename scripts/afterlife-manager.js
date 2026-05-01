export class AfterlifeManager {
    static SOCKET_NAME = "module.afterlife-manager";

    static get hqJournal() {
        const id = game.settings.get("afterlife-manager", "hqJournalId");
        return game.journal.get(id);
    }

    static init() {
        game.socket.off(this.SOCKET_NAME);
        game.socket.on(this.SOCKET_NAME, this._onSocketMessage.bind(this));
        console.log("Afterlife OS | Secure Socket Active.");
    }

    // --- AUTO-BUILDER FOR JOURNALS ---
    static async ensureDatabaseJournals() {
        if (!game.settings.get("afterlife-manager", "enableLedgerPrinting")) return;

        let journal = game.journal.getName("Afterlife Database");
        
        // 1. Create the Master Journal if missing (Default: Players = Observer)
        if (!journal) {
            journal = await JournalEntry.create({
                name: "Afterlife Database",
                ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }
            });
            ui.notifications.info("Afterlife OS: Automatically generated Afterlife Database journal.");
        }

        // 2. Auto-link the settings if empty
        if (!game.settings.get("afterlife-manager", "hqJournalId")) {
            await game.settings.set("afterlife-manager", "hqJournalId", journal.id);
        }

        // 3. Create the specific Pages and fix permissions
        const pagesToCreate = [];
        
        if (!journal.pages.getName("Fund Transfer Ledger")) {
            pagesToCreate.push({ name: "Fund Transfer Ledger", type: "text", text: { format: 1, content: "<h2>Fund Transfer Ledger</h2><hr>" }});
        }
        
        if (!journal.pages.getName("Afterlife Construction")) {
            pagesToCreate.push({ name: "Afterlife Construction", type: "text", text: { format: 1, content: "<h2>Construction & Upgrades</h2><hr>" }});
        }
        
        if (!journal.pages.getName("Edgerunner's Notes")) {
            pagesToCreate.push({ 
                name: "Edgerunner's Notes", 
                type: "text", 
                text: { format: 1, content: "<h2>Edgerunner's Notes</h2><hr><p>Crew access granted. Add your intel here...</p>" },
                // Players have full Write Access to this specific page
                ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
            });
        }

        if (pagesToCreate.length > 0) {
            await JournalEntryPage.createDocuments(pagesToCreate, { parent: journal });
        }
    }

    // --- PLAYER ACTIONS ---
    static async requestFundTransfer(sourceActorId, targetActorId, amount) {
        const reqId = foundry.utils.randomID();
        const payload = {
            action: "addRequest",
            requestData: {
                id: reqId, type: "fund_transfer", requestedBy: game.user.id,
                sourceActorId, targetActorId, amount, status: "pending", timestamp: Date.now()
            }
        };
        if (game.user.isGM) await this._onSocketMessage(payload);
        else game.socket.emit(this.SOCKET_NAME, payload);
        this._createChatCard("Transfer Initiated", `Amount: ${amount}eb`, reqId);
    }

    static async requestCustomUpgrade(upgradeData) {
        const reqId = foundry.utils.randomID();
        const payload = {
            action: "addRequest",
            requestData: {
                id: reqId, type: "custom_upgrade", requestedBy: game.user.id,
                status: "pending", timestamp: Date.now(), ...upgradeData
            }
        };
        if (game.user.isGM) await this._onSocketMessage(payload);
        else game.socket.emit(this.SOCKET_NAME, payload);
        this._createChatCard("Upgrade Pitch", `System: ${upgradeData.targetSystem}`, reqId);
    }

    // --- GM RECEIVER ---
    static async _onSocketMessage(payload) {
        if (!game.user.isGM) return;
        const hq = this.hqJournal;
        if (!hq) return;

        if (payload.action === "addRequest") {
            const data = hq.getFlag('afterlife-manager', 'afterlifeState') || {};
            const requests = data.requests || [];
            requests.push(payload.requestData);
            await hq.setFlag('afterlife-manager', 'afterlifeState.requests', requests);
            ui.notifications.info(`Afterlife OS: New Request Logged.`);
        }
    }

    // --- GM RESOLUTION ---
    static async resolveRequest(requestId, resolutionType, visualOptions = { sceneId: "none", macroName: "", journalId: "none" }) {
        if (!game.user.isGM) return false;
        const hq = this.hqJournal;
        const clubData = hq?.getFlag('afterlife-manager', 'afterlifeState') || {};
        const requests = clubData.requests || [];

        const idx = requests.findIndex(r => r.id === requestId);
        if (idx === -1) return false;
        const request = requests[idx];

        if (request.status === "active" || request.status === "rejected") {
            ui.notifications.warn("Afterlife OS: This request has already been finalized.");
            return false;
        }

        if (resolutionType === "approve") {
            try {
                if (request.type === "fund_transfer") {
                    const src = game.actors.get(request.sourceActorId);
                    if (src) await src.update({ "system.wealth.value": src.system.wealth.value - request.amount });
                    
                    if (request.targetActorId === "afterlife") {
                        await hq.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', (clubData.basics?.sharedFunds || 0) + request.amount);
                    } else {
                        const tgt = game.actors.get(request.targetActorId);
                        if (tgt) await tgt.update({ "system.wealth.value": tgt.system.wealth.value + request.amount });
                    }
                } else {
                    const cost = request.cost;
                    if (request.fundingSource === "personal") {
                        const src = game.actors.get(request.sourceActorId);
                        if (src) await src.update({ "system.wealth.value": src.system.wealth.value - cost });
                    } else {
                        await hq.setFlag('afterlife-manager', 'afterlifeState.basics.sharedFunds', (clubData.basics?.sharedFunds || 0) - cost);
                    }
                    request.linkedJournalId = visualOptions.journalId;
                }

                if (visualOptions.sceneId !== "none") await game.scenes.get(visualOptions.sceneId)?.activate();
                if (visualOptions.macroName) game.macros.getName(visualOptions.macroName)?.execute();
                if (visualOptions.journalId !== "none") game.journal.get(visualOptions.journalId)?.sheet.render(true);

            } catch (e) { console.error(e); return false; }
        }

        // Update Status
        request.status = resolutionType === "approve" ? "active" : resolutionType;
        
        // Print to the actual Journal Pages
        await this._writeToLedger(request, resolutionType);

        // Save internal flags
        requests[idx] = request;
        await hq.setFlag('afterlife-manager', 'afterlifeState.requests', requests);
        return true;
    }

    // --- LEDGER WRITER ---
    static async _writeToLedger(request, action) {
        if (!game.settings.get("afterlife-manager", "enableLedgerPrinting")) return;
        const journal = this.hqJournal;
        if (!journal) return;

        const isTransfer = request.type === "fund_transfer";
        const pageName = isTransfer ? "Fund Transfer Ledger" : "Afterlife Construction";
        const page = journal.pages.getName(pageName);
        if (!page) return;

        const date = new Date().toLocaleString();
        const user = game.users.get(request.requestedBy)?.name || "System";
        
        // Aesthetic styling for the printout
        let color = "#555555";
        if(action === "approve") color = "#00a859";
        if(action === "hold") color = "#ffaa00";
        if(action === "reject") color = "#cc0000";

        let logEntry = "";
        if (isTransfer) {
            const src = game.actors.get(request.sourceActorId)?.name || "Unknown";
            const tgt = request.targetActorId === "afterlife" ? "Shared Fund" : (game.actors.get(request.targetActorId)?.name || "Unknown");
            logEntry = `<div style="margin-bottom: 8px; border-left: 3px solid ${color}; padding-left: 8px; background: rgba(0,0,0,0.05);">
                <strong>[${date}] <span style="color:${color}; text-transform:uppercase;">${action}</span></strong><br>
                ${user} authorized <strong>${request.amount}eb</strong> (<em>${src} &rarr; ${tgt}</em>).
            </div>`;
        } else {
            logEntry = `<div style="margin-bottom: 8px; border-left: 3px solid ${color}; padding-left: 8px; background: rgba(0,0,0,0.05);">
                <strong>[${date}] <span style="color:${color}; text-transform:uppercase;">${action}</span></strong><br>
                ${user} pitched <strong>${request.targetSystem}</strong> for <strong>${request.cost}eb</strong>.
            </div>`;
        }

        const newContent = (page.text.content || "") + logEntry;
        await page.update({ "text.content": newContent });
    }

    static _createChatCard(title, body, reqId) {
        ChatMessage.create({
            speaker: { alias: "Afterlife OS" },
            content: `
                <div style="background:#1a1a1a; padding:10px; border-left:4px solid #cc0000; color:#eee;">
                    <h4 style="color:#cc0000; margin:0; text-transform:uppercase;">${title}</h4>
                    <p style="font-size:0.85rem; margin:5px 0;">${body}</p>
                    <div class="afterlife-chat-actions flexrow" data-request-id="${reqId}" style="margin-top:8px; gap:5px;">
                        <button type="button" data-action="approve" style="background:#00a859; color:white; border:none; cursor:pointer; padding:3px;">APPROVE</button>
                        <button type="button" data-action="hold" style="background:#ffaa00; color:white; border:none; cursor:pointer; padding:3px;">HOLD</button>
                        <button type="button" data-action="reject" style="background:#cc0000; color:white; border:none; cursor:pointer; padding:3px;">REJECT</button>
                    </div>
                </div>`
        });
    }
}