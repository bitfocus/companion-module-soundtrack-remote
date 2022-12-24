const {
  InstanceBase,
  Regex,
  runEntrypoint,
  InstanceStatus,
} = require("@companion-module/base");
const { GraphQLClient } = require("graphql-request");
const UpgradeScripts = require("./upgrades");
const UpdateActions = require("./actions");

class ModuleInstance extends InstanceBase {
  constructor(internal) {
    super(internal);
  }

  async init(config) {
    this.config = config;

    const soundtrackURL = "https://api.soundtrackyourbrand.com/v2";
    if (this.config.api_key) {
      this.api_key = this.config.api_key;
      this.client = new GraphQLClient(soundtrackURL, {
        headers: { authorization: `Basic ${this.api_key}` },
      });
    }

    this.updateStatus(InstanceStatus.Ok);

    this.updateActions(); // export actions
  }
  // When module gets deleted
  async destroy() {
    this.log("debug", "destroy");
  }

  async configUpdated(config) {
    this.config = config;
  }

  // Return config fields for web config
  getConfigFields() {
    return [
      {
        type: "textinput",
        id: "api_key",
        label: "API Key",
      },
      {
        type: "textinput",
        id: "zone_id",
        label: "Zone ID",
      },
    ];
  }

  // Function to skip a song using the Soundtrack Your Brand API
  async skipSong() {}

  updateActions() {
    UpdateActions(this);
  }
}

runEntrypoint(ModuleInstance, UpgradeScripts);
