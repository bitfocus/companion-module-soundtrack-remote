module.exports = function (self) {
  self.setActionDefinitions({
    play: {
      name: "Play",
      options: [],
      callback: async (event) => {
        let res = await self.client.request(
          `mutation { play(input: {soundZone: "${self.config.zone_id}"}) {status} }`
        );
        self.log("debug", JSON.stringify(res));
      },
    },
    pause: {
      name: "Pause",
      options: [],
      callback: async (event) => {
        let res = await self.client.request(
          `mutation { pause(input: {soundZone: "${self.config.zone_id}"}) {status} }`
        );
        self.log("debug", JSON.stringify(res));
      },
    },
    skip: {
      name: "Skip Track",
      options: [],
      callback: async (event) => {
        let res = await self.client.request(
          `mutation { skipTrack(input: {soundZone: "${self.config.zone_id}"}) {status} }`
        );
        self.log("debug", JSON.stringify(res));
      },
    },
    set_volume: {
      name: "Set Volume",
      options: [
          {
            type: "number",
            id: "volume",
            label: "Volume",
            default: "10",
            min: 1,
            max: 16,
            step: 1,
            required: true,
          },
        ],
      callback: async (event) => {
        let res = await self.client.request(
          `mutation { setVolume(input: {soundZone: "${self.config.zone_id}", volume: ${event.options.volume}}) {status} }`
        );
        self.log("debug", JSON.stringify(res));
      },
    },
  });
};
