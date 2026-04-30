import { AfterlifeManager } from "./afterlife-manager.js";
import { FundTransferForm, UpgradePitchForm } from "./request-forms.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AfterlifeDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "afterlife-dashboard",
        title: "AFTERLIFE OS MAIN TERMINAL",
        tag: "form",
        classes: ["afterlife-dashboard"], 
        window: { icon: "fas fa-network-wired", resizable: true, width: 600, height: 750 },
        actions: {
            approveRequest: AfterlifeDashboard._onApproveRequest,
            rejectRequest: AfterlifeDashboard._onRejectRequest,
            cancelRequest: AfterlifeDashboard._onCancelRequest,
            openTransferForm: () => new FundTransferForm().render({force: true}),
            openUpgradeForm: () => new UpgradePitchForm().render({force: true})
        }
    };

    static PARTS = { inbox: { template: "modules/afterlife-manager/templates/inbox.hbs" } };

    async _prepareContext(options) {
        const hq = AfterlifeManager.hqJournal;
        const clubData = hq ? hq.getFlag('afterlife-manager', 'afterlifeState') || {} : {};
        
        const mapData = (r) => ({
            ...r,
            userName: game.users.get(r.requestedBy)?.name || "Unknown",
            actorName: game.actors.get(r.sourceActorId)?.name || "Unknown",
            targetName: r.targetActorId === "afterlife" ? "Shared Fund" : (game.actors.get(r.targetActorId)?.name || "Unknown"),
            linkedJournalName: game.journal.get(r.linkedJournalId)?.name || null,
            canApprove: game.user.isGM
        });

        const targetFolderId = game.settings.get("afterlife-manager", "sceneFolderId");
        const sceneFolder = game.folders.get(targetFolderId);

        return {
            inbox: (clubData.inbox || []).map(mapData),
            history: (clubData.history || []).map(mapData),
            constructionUpgrades: (clubData.customUpgrades || []).filter(u => u.status === "construction").map(mapData),
            completedUpgrades: (clubData.customUpgrades || []).filter(u => u.status === "active").map(mapData),
            sharedFunds: clubData.basics?.sharedFunds || 0,
            hasHQ: !!hq,
            expansionScenes: sceneFolder ? sceneFolder.contents.map(s => ({ id: s.id, name: s.name })) : [],
            allJournals: game.journal.map(j => ({ id: j.id, name: j.name }))
        };
    }

    static async _onApproveRequest(event, target) {
        const item = target.closest('.inbox-item');
        const visualOptions = {
            sceneId: item.querySelector('.scene-select')?.value || "none",
            macroName: item.querySelector('.macro-input')?.value.trim() || "",
            journalId: item.querySelector('.journal-select')?.value || "none"
        };
        await AfterlifeManager.resolveRequest(item.dataset.requestId, "approve", visualOptions);
    }

    static async _onRejectRequest(event, target) {
        await AfterlifeManager.resolveRequest(target.closest('.inbox-item').dataset.requestId, "reject");
    }

    static async _onCancelRequest(event, target) {
        await AfterlifeManager.resolveRequest(target.closest('.inbox-item').dataset.requestId, "cancel");
    }
}