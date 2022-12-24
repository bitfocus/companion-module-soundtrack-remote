module.exports = function (self) {
  self.setActionDefinitions({
    play: {
      name: "Play",
      description: "Resume the current track in this zone.",
      options: [],
      callback: async () => {
        let res = await self.client.request(
          `mutation { play(input: {soundZone: "${self.config.zone_id}"}) {status} }`
        );
        self.log("debug", JSON.stringify(res));
      },
    },
    pause: {
      name: "Pause",
      description: "Pause the current track in this zone.",
      options: [],
      callback: async () => {
        let res = await self.client.request(
          `mutation { pause(input: {soundZone: "${self.config.zone_id}"}) {status} }`
        );
        self.log("debug", JSON.stringify(res));
      },
    },
    skip: {
      name: "Skip Track",
      description: "Skip the current track in this zone.",
      options: [],
      callback: async () => {
        let res = await self.client.request(
          `mutation { skipTrack(input: {soundZone: "${self.config.zone_id}"}) {status} }`
        );
        self.log("debug", JSON.stringify(res));
      },
    },
    set_volume: {
      name: "Set Volume",
      description: "Set the volume of this zone.",
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
    assign_source: {
      name: "Assign source",
      description:
        "Assign a source (schedule, playlist, or station) to this zone",
      options: [
        {
          type: "textinput",
          id: "source",
          label: "Source ID (schedule, playlist, or station)",
          required: true,
        },
        {
          id: "immediate",
          type: "checkbox",
          label: "Play Immediately",
          tooltip:
            "Play the source immediately instead of after the current track finishes",
          default: false,
        },
        {
          id: "setTrackIndex",
          type: "checkbox",
          label: "Set Track Index? (playlists only)",
          tooltip: "Enable setting track index. (Only works for playlists)",
          default: false,
        },
        {
          id: "sourceTrackIndex",
          type: "number",
          label: "Track Index",
          tooltip: "The index of the track to start playing from",
          min: 0,
          isVisible: (options) => {
            return options.setTrackIndex;
          },
        },
      ],
      callback: async (event) => {
        var res;
        if (event.options.setTrackIndex) {
          res = await self.client.request(
            `mutation { soundZoneAssignSource(input: {soundZones: ["${self.config.zone_id}"], source: "${event.options.source}", immediate: ${event.options.immediate}, sourceTrackIndex: ${event.options.sourceTrackIndex}}) {soundZones} }`
          );
        } else {
          res = await self.client.request(
            `mutation { soundZoneAssignSource(input: {soundZones: ["${self.config.zone_id}"], source: "${event.options.source}", immediate: ${event.options.immediate}}) {soundZones} }`
          );
        }
        self.log("debug", JSON.stringify(res));
      },
    },
  });
};
