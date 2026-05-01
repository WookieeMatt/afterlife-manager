import { AfterlifeManager } from "./afterlife-manager.js";
import { AfterlifeDashboard } from "./afterlife-app.js";
import { registerSettings } from "./settings.js";

Hooks.once('init', () => {
    registerSettings();
});

Hooks.once('setup', () => {
    AfterlifeManager.init();
});

Hooks.once('ready', async () => {
    // Scaffold the database journals automatically for the GM
    if (game.user.isGM) {
        await AfterlifeManager.ensureDatabaseJournals();
    }

    const journalChoices = { "": "None" };
    game.journal.forEach(j => { journalChoices[j.id] = j.name; });
    game.settings.settings.get("afterlife-manager.hqJournalId").choices = journalChoices;

    const sceneFolderChoices = { "": "None" };
    game.folders.forEach(folder => {
        if (folder.type === "Scene") sceneFolderChoices[folder.id] = folder.name;
    });
    game.settings.settings.get("afterlife-manager.sceneFolderId").choices = sceneFolderChoices;

    game.modules.get("afterlife-manager").api = {
        manager: AfterlifeManager,
        app: new AfterlifeDashboard()
    };
    console.log("Afterlife OS | Terminal Online.");
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

    actions.find('button').on('click', async (ev) => {
        ev.preventDefault();
        const action = ev.currentTarget.dataset.action; 
        const requestId = actions.data('requestId');
        const success = await AfterlifeManager.resolveRequest(requestId, action);
        
        if (success) {
            let statusText = "> EXECUTED";
            let color = "#00ff00";
            if (action === "reject") { statusText = "> REJECTED"; color = "#ff0000"; }
            if (action === "hold") { statusText = "> ON HOLD"; color = "#ffaa00"; }
            actions.html(`<span style="color:${color}; font-weight:bold;">${statusText}</span>`);
        }
    });
});