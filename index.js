const Client = new (require("./src/classes/App.js"))

function loaded() { console.log(`Server is running on port ${process.env.EXPRESS_PORT}`); }

(async function () {
    await Client.registerRoutes();
    await Client.listen(loaded, true);
})();