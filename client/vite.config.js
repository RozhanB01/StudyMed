const { defineConfig } = require("vite");

module.exports = defineConfig({
    root: __dirname,

    server: {
        port: 5173,

        proxy: {
            "/api": "http://localhost:4000"
        }
    }
});