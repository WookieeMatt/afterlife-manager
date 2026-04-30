import { AfterlifeManager } from "./afterlife-manager.js";
import { FundTransferForm, UpgradePitchForm } from "./request-forms.js";

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
            openTransferForm: AfterlifeDashboard._onOpenTransfer,
            openUpgradeForm: AfterlifeDashboard._onOpenUpgrade
        }
    };

    static PARTS = {
        inbox: { template: "modules/afterlife-manager/templates/inbox.hbs" }
    };

    async _prepareContext(options) {
        const hqJournal = AfterlifeManager.hqJournal;
        const clubData = hqJournal ? hqJournal.getFlag('afterlife-manager', 'afterlifeState') || {} : {};
        
        const currentUserId = game.user.id;
        const isGM = game.user.isGM;

        const mapRequestData = (request) => {
            const requestingUser = game.users.get(request.requestedBy);
            const sourceActor = request.sourceActorId ? game.actors.get(request.sourceActorId) : null;
            
            const targetActorName = request.targetActorId === "afterlife" 
                ? "The Afterlife Shared Fund" 
                : (game.actors.get(request.targetActorId)?.name || "Unknown");

            return {
                ...request,
                userName: requestingUser ? requestingUser.name : "Unknown Edgerunner",
                actorName: sourceActor ? sourceActor.name : "Unknown Account",
                targetName: targetActorName,
                canApprove: isGM,
                canCancel: (request.requestedBy === currentUserId) && !isGM
            };
        };

        const processedInbox = (clubData.inbox || []).map(mapRequestData);
        const processedHistory = (clubData.history || []).map(mapRequestData);
        const processedUpgrades = (clubData.customUpgrades || []).map(mapRequestData);

        const targetFolderId = game.settings.get("afterlife-manager", "sceneFolderId");
        const sceneFolder = game.folders.get(targetFolderId);
        const expansionScenes = sceneFolder ? sceneFolder.contents.map(s => ({ id: s.id, name: s.name })) : [];

        return {
            inbox: processedInbox,
            history: processedHistory,
            constructionUpgrades: processedUpgrades.filter(u => u.status === "construction"),
            completedUpgrades: processedUpgrades.filter(u => u.status === "active"),
            isGM: isGM,
            isEmpty: processedInbox.length === 0,
            hasHQ: !!hqJournal,
            expansionScenes: expansionScenes,
            sharedFunds: clubData.basics?.sharedFunds || 0
        };
    }

    static async _onApproveRequest(event, target) {
        const inboxItem = target.closest('.inbox-item');
        const requestId = inboxItem.dataset.requestId;
        
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

    static async _onOpenTransfer(event, target) {
        new FundTransferForm().render({force: true});
    }

    static async _onOpenUpgrade(event, target) {
        new UpgradePitchForm().render({force: true});
    }
}