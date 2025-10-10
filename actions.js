module.exports = function (self) {
  let actions = {
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
      name: "Assign source by ID",
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
    assign_playlist: {
      name: "Assign Playlist",
      description: "Assign a playlist to this zone",
      options: [
        {
          id: "playlist",
          type: "dropdown",
          label: "Playlist",
          choices: self.playlists ? self.playlists : [],
          default: self.playlists.length > 0 ? self.playlists[0].id : "",
          tooltip: "The playlist to assign to this zone",
        },
        {
          id: "immediate",
          type: "checkbox",
          label: "Play Immediately",
          tooltip:
            "Play the playlist immediately instead of after the current track finishes",
          default: false,
        },
        {
          id: "setTrackIndex",
          type: "checkbox",
          label: "Set Track Index?",
          tooltip: "Enable setting track index.",
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
            `mutation { soundZoneAssignSource(input: {soundZones: ["${self.config.zone_id}"], source: "${event.options.playlist}", immediate: ${event.options.immediate}, sourceTrackIndex: ${event.options.sourceTrackIndex}}) {soundZones} }`
          );
        } else {
          res = await self.client.request(
            `mutation { soundZoneAssignSource(input: {soundZones: ["${self.config.zone_id}"], source: "${event.options.playlist}", immediate: ${event.options.immediate}}) {soundZones} }`
          );
        }
        self.log("debug", JSON.stringify(res));
      },
    },
    assign_schedule: {
      name: "Assign Schedule",
      description: "Assign a schedule to this zone",
      options: [
        {
          id: "schedule",
          type: "dropdown",
          label: "Schedule",
          choices: self.schedules ? self.schedules : [],
          default: self.schedules.length > 0 ? self.schedules[0].id : "",
          tooltip: "The schedule to assign to this zone",
        },
        {
          id: "immediate",
          type: "checkbox",
          label: "Play Immediately",
          tooltip:
            "Play the schedule immediately instead of after the current track finishes",
          default: false,
        },
      ],
      callback: async (event) => {
        let res = await self.client.request(
          `mutation { soundZoneAssignSource(input: {soundZones: ["${self.config.zone_id}"], source: "${event.options.schedule}", immediate: ${event.options.immediate}}) {soundZones} }`
        );
        self.log("debug", JSON.stringify(res));
      },
    },
    play_track: {
      name: "Play/Queue Track",
      description: "Play/Queue a track in this zone by ID",
      options: [
        {
          id: "track",
          type: "textinput",
          label: "Track ID",
          required: true,
          tooltip: "The track to play in this zone",
        },
        {
          id: "immediate",
          type: "checkbox",
          label: "Play Immediately",
          tooltip:
            "Play the track immediately instead of after the current track finishes",
          default: false,
        },
      ],
      callback: async (event) => {
        let payload = `mutation { soundZoneQueueTracks(input: {soundZone: "${self.config.zone_id}", tracks: ["${event.options.track}"], immediate: ${event.options.immediate}}) {status} }`;
        self.log("info", payload);
        let res = await self.client.request(payload);
        self.log("info", JSON.stringify(res));
      },
    },
  };
  if (self.supportsAnnouncements) {
    actions.play_announcement = {
      name: "Play/Queue Announcement",
      description: "Play/Queue an announcement in this zone",
      options: [
        {
          id: "announcement",
          type: "dropdown",
          label: "Announcement",
          choices: self.announcements ? self.announcements : [],
          default:
            self.announcements.length > 0 ? self.announcements[0].id : "",
          tooltip: "The announcement to play in this zone",
        },
        {
          id: "immediate",
          type: "checkbox",
          label: "Play Immediately",
          tooltip:
            "Play the announcement immediately instead of after the current track finishes",
          default: false,
        },
      ],
      callback: async (event) => {
        let payload = `mutation { soundZoneQueueTracks(input: {soundZone: "${self.config.zone_id}", tracks: ["${event.options.announcement}"], immediate: ${event.options.immediate}}) {status} }`;
        self.log("info", payload);
        let res = await self.client.request(payload);
        self.log("info", JSON.stringify(res));
      },
    };
  }
  self.setActionDefinitions(actions);
};
