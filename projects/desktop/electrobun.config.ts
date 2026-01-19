export default {
    app: {
        name: "AgentOS",
        identifier: "com.agentos.desktop",
        version: "0.0.1",
    },
    build: {
        views: {
            mainview: {
                entrypoint: "src/mainview/index.tsx",
                external: [],
            },
        },
        copy: {
            "src/mainview/index.html": "views/mainview/index.html",
            "src/mainview/output.css": "views/mainview/output.css",
        },
        mac: {
            bundleCEF: false,
        },
        linux: {
            bundleCEF: false,
        },
        win: {
            bundleCEF: false,
        },
    },
};