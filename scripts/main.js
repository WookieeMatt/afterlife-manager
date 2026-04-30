import { AfterlifeManager } from "./afterlife-manager.js";
import { AfterlifeDashboard } from "./afterlife-app.js";
import { registerSettings } from "./settings.js";

Hooks.once('init', () => {
    registerSettings();
});

Hooks.once('ready', () => {
    const actorChoices = { "": "None" };
    game.actors.forEach(actor => { actorChoices[actor.id] = actor.name; });
    game.settings.settings.get("afterlife-manager.hqActorId").choices = actorChoices;

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
    
    console.log("Afterlife Manager | Systems green. Welcome to the major leagues.");
});