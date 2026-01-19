// Shared navigation data for AgentOS Desktop UI

const NAV_ITEMS = [
    { id: 'chat', label: 'Chat', icon: 'fa-regular fa-comments' },
    { id: 'workspace', label: 'Workspace', icon: 'fa-solid fa-folder-tree' },
    { id: 'skills', label: 'Skills', icon: 'fa-solid fa-wand-magic-sparkles' },
    { id: 'tasks', label: 'Tasks', icon: 'fa-solid fa-list-check' },
    { id: 'settings', label: 'Settings', icon: 'fa-solid fa-gear' },
];

/**
 * Returns the base application data including navigation items and active tab state.
 * @param {string} initialTab - The ID of the initial active tab
 * @returns {Object} Base data object to be spread into Alpine x-data
 */
function getBaseData(initialTab = 'chat') {
    return {
        activeTab: initialTab,
        navItems: NAV_ITEMS,
        switchTab(tabId) {
            this.activeTab = tabId;
        }
    };
}
