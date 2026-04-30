import { AfterlifeManager } from "./afterlife-manager.js";
import { AfterlifeRequestForm } from "./request-form.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AfterlifeDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
    
    static DEFAULT_OPTIONS = {
        id: "afterlife-dashboard",
        title: "AFTERLIFE OS MAIN TERMINAL",
        tag: "form",
        classes: ["afterlife-dashboard"], 
        window: {
            icon: "fas fa-network-wired",
            resizable: true,
            width: 600,
            height: 750
        },
        actions: {
            approveRequest: AfterlifeDashboard._onApproveRequest,
            rejectRequest: AfterlifeDashboard._onRejectRequest,
            cancelRequest: AfterlifeDashboard._onCancelRequest,
            openRequestForm: AfterlifeDashboard._onOpenForm
        }
    };

    static PARTS = {
        inbox: { template: "modules/afterlife-manager/templates/inbox.hbs" }
    };

    async _prepareContext(options) {
        // Pull data from the assigned Journal Entry
        const hqJournal = AfterlifeManager.hqJournal;
        const clubData = hqJournal ? hqJournal.getFlag('afterlife-manager', 'afterlifeState') || {} : {};
        
        const currentUserId = game.user.id;
        const isGM = game.user.isGM;

        // Process the Pending Inbox
        const rawInbox = clubData.inbox || [];
        const processedInbox = rawInbox.map(request => {
            const requestingUser = game.users.get(request.requestedBy);
            const sourceActor = request.sourceActorId ? game.actors.get(request.sourceActorId) : null;
            return {
                ...request,
                userName: requestingUser ? requestingUser.name : "Unknown",
                actorName: sourceActor ? sourceActor.name : "Unknown",
                canApprove: isGM,
                canCancel: (request.requestedBy === currentUserId) && !isGM
            };
        });

        // Process Expansion Scenes from Settings
        const targetFolderId = game.settings.get("afterlife-manager", "sceneFolderId");
        const sceneFolder = game.folders.get(targetFolderId);
        const expansionScenes = sceneFolder ? sceneFolder.contents.map(s => ({ id: s.id, name: s.name })) : [];

        // Process Upgrades and Ledgers
        const customUpgrades = clubData.customUpgrades || [];
        const transferHistory = clubData.history || [];

        return {
            inbox: processedInbox,
            history: transferHistory,
            constructionUpgrades: customUpgrades.filter(u => u.status === "construction"),
            completedUpgrades: customUpgrades.filter(u => u.status === "active"),
            isGM: isGM,
            isEmpty: processedInbox.length === 0,
            hasHQ: !!hqJournal, // Validates if the GM set up the Journal
            expansionScenes: expansionScenes,
            sharedFunds: clubData.basics?.sharedFunds || 0
        };
    }

    // --- BUTTON ACTIONS ---

    static async _onApproveRequest(event, target) {
        const inboxItem = target.closest('.inbox-item');
        const requestId = inboxItem.dataset.requestId;
        
        // Grab values from the GM's visual routing inputs
        let visualOptions = { sceneId: "none", macroName: "" };
        const sceneSelect = inboxItem.querySelector('.scene-select');
        const macroInput = inboxItem.querySelector('.macro-input');

        if (sceneSelect) visualOptions.sceneId = sceneSelect.value;
        if (macroInput) visualOptions.macroName = macroInput.value.trim();

        await AfterlifeManager.resolveRequest(requestId, "approve", visualOptions);
    }

    static async _onRejectRequest(event, target) {
        const requestId = target.closest('.inbox-item').dataset.requestId;
        await AfterlifeManager.resolveRequest(requestId, "reject");
    }

    static async _onCancelRequest(event, target) {
        const requestId = target.closest('.inbox-item').dataset.requestId;
        await AfterlifeManager.resolveRequest(requestId, "cancel");
    }

    static async _onOpenForm(event, target) {
        new AfterlifeRequestForm().render({force: true});
    }
}