import { AfterlifeManager } from "./afterlife-manager.js";
import { AfterlifeDashboard } from "./afterlife-app.js";
import { registerSettings } from "./settings.js";

Hooks.once('init', () => {
    registerSettings();
});

Hooks.once('ready', () => {
    const journalChoices = { "": "None" };
    game.journal.forEach(j => { journalChoices[j.id] = j.name; });
    game.settings.settings.get("afterlife-manager.hqJournalId").choices = journalChoices;

    const sceneFolderChoices = { "": "None" };
    game.folders.forEach(folder => {
        if (folder.type === "Scene") sceneFolderChoices[folder.id] = folder.name;
    });
    game.settings.settings.get("afterlife-manager.sceneFolderId").choices = sceneFolderChoices;

    AfterlifeManager.init();

    game.modules.get("afterlife-manager").api = {
        manager: AfterlifeManager,
        app: new AfterlifeDashboard()
    };
});

// LIVE REFRESH: Re-render the app whenever the Journal data changes
Hooks.on('updateJournalEntry', (journal, data, options, userId) => {
    const hqJournalId = game.settings.get("afterlife-manager", "hqJournalId");
    if (journal.id === hqJournalId) {
        const app = game.modules.get("afterlife-manager").api.app;
        if (app && app.rendered) app.render();
    }
});

// CHAT LISTENER: Activate GM buttons on cards
Hooks.on('renderChatMessage', (message, html, data) => {
    const actions = html.find('.afterlife-chat-actions');
    if (!actions.length) return;

    if (!game.user.isGM) {
        actions.hide();
        return;
    }

    actions.find('button').click(async (ev) => {
        ev.preventDefault();
        const button = ev.currentTarget;
        const action = button.dataset.action;
        const requestId = actions.data('requestId');

        const success = await AfterlifeManager.resolveRequest(requestId, action);
        if (success) {
            actions.html(`<span style="color: #00ff00; font-family: monospace;">> COMMAND EXECUTED</span>`);
        }
    });
});