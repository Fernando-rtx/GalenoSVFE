module.exports = {
  server: {
    baseDir: ["src"],
    directory: true,
    routes: {
      "/src": "src",
      "/test": "test",
      "/node_modules/mocha": "node_modules/mocha",
      "/node_modules/chai": "node_modules/chai"
    }
  },
  files: ["src/**/*.js", "test/integration/**/*"],
  listen: "127.0.0.1",
  open: false,
  ui: false,
  online: false,
  ghostMode: false
};
