import { AfterlifeManager } from "./afterlife-manager.js";
import { FundTransferForm, UpgradePitchForm } from "./request-forms.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AfterlifeDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options) {
        super(options);
        this.activeTab = "transfers"; 
    }

    static DEFAULT_OPTIONS = {
        id: "afterlife-dashboard", title: "AFTERLIFE OS v2", tag: "form",
        classes: ["afterlife-dashboard"], window: { resizable: true, width: 650, height: 800 },
        actions: {
            switchTab: function(e, t) { this.activeTab = t.dataset.tab; this.render(); },
            approveReq: AfterlifeDashboard._onResolve,
            rejectReq: AfterlifeDashboard._onResolve,
            holdReq: AfterlifeDashboard._onResolve,
            openTransferForm: () => new FundTransferForm().render({force: true}),
            openUpgradeForm: () => new UpgradePitchForm().render({force: true})
        }
    };
    static PARTS = { inbox: { template: "modules/afterlife-manager/templates/inbox.hbs" } };
    
    async _prepareContext() {
        const hq = AfterlifeManager.hqJournal;
        const clubData = hq?.getFlag('afterlife-manager', 'afterlifeState') || {};
        const requests = clubData.requests || [];
        
        const mapData = (r) => ({
            ...r, 
            userName: game.users.get(r.requestedBy)?.name || "Unknown",
            actorName: game.actors.get(r.sourceActorId)?.name || "Unknown",
            targetName: r.targetActorId === "afterlife" ? "Shared Fund" : (game.actors.get(r.targetActorId)?.name || "Unknown"),
            linkedJournalName: game.journal.get(r.linkedJournalId)?.name || null,
            canApprove: game.user.isGM && (r.status === "pending" || r.status === "hold")
        });

        const transfers = requests.filter(r => r.type === "fund_transfer").map(mapData);
        const upgrades = requests.filter(r => r.type === "custom_upgrade").map(mapData);

        return {
            isTransfersTab: this.activeTab === "transfers",
            isUpgradesTab: this.activeTab === "upgrades",
            
            transferPending: transfers.filter(r => r.status === "pending"),
            transferActive: transfers.filter(r => r.status === "active"),
            transferHold: transfers.filter(r => r.status === "hold"),
            transferRejected: transfers.filter(r => r.status === "rejected"),

            upgradePending: upgrades.filter(r => r.status === "pending"),
            upgradeActive: upgrades.filter(r => r.status === "active"),
            upgradeHold: upgrades.filter(r => r.status === "hold"),
            upgradeRejected: upgrades.filter(r => r.status === "rejected"),

            sharedFunds: clubData.basics?.sharedFunds || 0,
            hasHQ: !!hq,
            allJournals: game.journal.map(j => ({ id: j.id, name: j.name })),
            expansionScenes: game.scenes.map(s => ({ id: s.id, name: s.name }))
        };
    }
    
    static async _onResolve(event, target) {
        const item = target.closest('.inbox-item');
        const reqId = item.dataset.requestId;
        const action = target.dataset.action.replace('Req', ''); 
        
        const visualOptions = {
            sceneId: item.querySelector('.scene-select')?.value || "none",
            macroName: item.querySelector('.macro-input')?.value || "",
            journalId: item.querySelector('.journal-select')?.value || "none"
        };
        await AfterlifeManager.resolveRequest(reqId, action, visualOptions);
    }
}