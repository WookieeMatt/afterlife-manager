import { AfterlifeManager } from "./afterlife-manager.js";
import { AfterlifeDashboard } from "./afterlife-app.js";
import { registerSettings } from "./settings.js";

Hooks.once('init', () => {
    registerSettings();
});

Hooks.once('ready', async () => {
    // 1. Initialize the Socket exactly when the server is ready
    AfterlifeManager.init();

    // 2. Scaffold the database and Fixer NPC for the GM
    if (game.user.isGM) {
        await AfterlifeManager.ensureDatabaseJournals();
        await AfterlifeManager.ensureFixerNPC(); 
    }

    // 3. Populate Settings Dropdowns
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

    // 4. Mount API
    game.modules.get("afterlife-manager").api = {
        manager: AfterlifeManager,
        app: new AfterlifeDashboard()
    };
    
    console.log("Afterlife OS | v2.5.1 Terminal Online & Network Secured.");
});

Hooks.on('updateJournalEntry', (journal) => {
    const hqId = game.settings.get("afterlife-manager", "hqJournalId");
    if (journal.id === hqId) {
        const app = game.modules.get("afterlife-manager").api?.app;
        if (app?.rendered) app.render(); 
    }
});

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