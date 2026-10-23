module.exports = {
  server: {
    baseDir: ["src"],
    directory: false,
    routes: {
      "/src": "src",
      "/test": "test",
      "/node_modules/mocha": "node_modules/mocha",
      "/node_modules/chai": "node_modules/chai"
    }
  },
  files: ["src/**/*.{html,js,css}", "test/integration/**/*"],
  listen: "127.0.0.1",
  open: false,
  ui: false,
  online: false,
  ghostMode: false
};
