import { AfterlifeManager } from "./afterlife-manager.js";
import { AfterlifeDashboard } from "./afterlife-app.js";
import { registerSettings } from "./settings.js";

Hooks.once('init', () => {
    registerSettings();
});

Hooks.once('ready', async () => {
    AfterlifeManager.init();

    if (game.user.isGM) {
        await AfterlifeManager.ensureDatabaseJournals();
        await AfterlifeManager.ensureFixerNPC(); 
    }

    const journalChoices = { "": "None" };
    game.journal.forEach(j => { journalChoices[j.id] = j.name; });
    game.settings.settings.get("afterlife-manager.hqJournalId").choices = journalChoices;

    const sceneFolderChoices = { "": "None" };
    game.folders.forEach(folder => {
        if (folder.type === "Scene") sceneFolderChoices[folder.id] = folder.name;
    });
    game.settings.settings.get("afterlife-manager.sceneFolderId").choices = sceneFolderChoices;

    const actorChoices = { "": "None" };
    game.actors.forEach(a => { actorChoices[a.id] = a.name; });
    game.settings.settings.get("afterlife-manager.fixerActorId").choices = actorChoices;

    game.modules.get("afterlife-manager").api = {
        manager: AfterlifeManager,
        app: new AfterlifeDashboard()
    };
    
    console.log("Afterlife OS | Terminal Online & Document Syncing Active.");
});

// UI Live Refresh
Hooks.on('updateJournalEntry', (journal) => {
    const hqId = game.settings.get("afterlife-manager", "hqJournalId");
    if (journal.id === hqId) {
        const app = game.modules.get("afterlife-manager").api?.app;
        if (app?.rendered) app.render(); 
    }
});

// GM: Secretly intercept payloads from player chat messages
Hooks.on('createChatMessage', async (message, options, userId) => {
    if (!game.user.isGM) return; // Only GM processes this
    
    // Check if the message contains a hidden payload
    const hiddenPayload = message.getFlag("afterlife-manager", "payload");
    if (hiddenPayload) {
        console.log("Afterlife OS | Intercepted Document Payload!");
        await AfterlifeManager._processPayload(hiddenPayload);
    }
});

// Chat Interaction Buttons
Hooks.on('renderChatMessage', (message, html) => {
    const actions = html.find('.afterlife-chat-actions');
    if (!actions.length) return;
    if (!game.user.isGM) return actions.hide(); 

    actions.find('button').off('click').on('click', async (ev) => {
        ev.preventDefault();
        const action = ev.currentTarget.dataset.action; 
        const requestId = actions.data('requestId');
        
        const success = await AfterlifeManager.resolveRequest(requestId, action);
        
        if (success) {
            let statusText = "> EXECUTED";
            let color = "#00ff00";
            if (action === "reject") { statusText = "> REJECTED"; color = "#ff4444"; }
            if (action === "hold") { statusText = "> ON HOLD"; color = "#ffaa00"; }
            actions.html(`<span style="color:${color}; font-weight:bold; font-family: monospace;">${statusText}</span>`);
        }
    });
});