const {
  InstanceBase,
  runEntrypoint,
  InstanceStatus,
} = require("@companion-module/base");
const { GraphQLClient } = require("graphql-request");
const WebSocket = require("ws");
const { createClient, SubscribePayload } = require("graphql-ws");
const UpgradeScripts = require("./upgrades");
const UpdateActions = require("./actions");
const UpdateVariables = require("./variables");

class SoundtrackInstance extends InstanceBase {
  constructor(internal) {
    super(internal);
  }

  async init(config) {
    this.config = config;

    const soundtrackHTTPURL = "https://api.soundtrackyourbrand.com/v2";
    const soundtrackWSURL = "wss://api.soundtrackyourbrand.com/v2/graphql-transport-ws";
    if (this.config.api_key) {
      // Setup HTTP GraphQL client for mutations
      this.client = new GraphQLClient(soundtrackHTTPURL, {
        headers: { authorization: `Basic ${this.config.api_key}` },
      });
      this.log("debug", "client created");

      // Setup WebSocket client for subscriptions
      this.wsClient = createClient({
        url: soundtrackWSURL,
        webSocketImpl: WebSocket,
        connectionParams: {
          Authorization: `Basic ${this.config.api_key}`,
        },
      });

      this.wsClient.on("connected", () => {
        this.log("debug", "WebSocket connected");
        this.updateStatus(InstanceStatus.Ok);
      });

      this.wsClient.on("error", (error) => {
        this.log("error", JSON.stringify(error));
        this.updateStatus(
          InstanceStatus.ConnectionFailure,
          "Error with WebSocket connection"
        );
      });

      this.wsClient.on("closed", (error) => {
        this.log("debug", "WebSocket connection closed");
        this.updateStatus(InstanceStatus.ConnectionFailure, "WebSocket connection closed");
      });

      // Subscribe to playback updates
      (async () => {
        const playbackSubscription = this.wsClient.iterate({
          query: `subscription playbackUpdate {
            playbackUpdate(
              input: {soundZone: "${this.config.zone_id}"}
            ) {
              playback {
              soundZone
                state
                volume
                progress {
                  progressMs
                }
                playbackMode
                current {
                  start
                  playable {
                    ... on Track {
                      id
                      title
                      version
                      durationMs
                      explicit
                      recognizability
                      album {
                        id
                        title
                      }
                      artists {
                        id
                        name
                      }
                    }
                  }
                  source {
                    ... on Playlist {
                      __typename
                      id
                      name
                      shortDescription
                    }
                    ... on ManuallyQueued {
                      __typename
                    }
                    ... on ScheduleSource {
                      __typename
                      schedule {
                        id
                        name
                        shortDescription
                      }
                      playlist {
                        id
                        name
                        shortDescription
                      }
                    }
                  }
                }
                upcoming {
                  start
                  playable {
                    ... on Track {
                      id
                      title
                      version
                      durationMs
                      explicit
                      recognizability
                      album {
                        id
                        title
                      }
                      artists {
                        id
                        name
                      }
                    }
                  }
                  source {
                    ... on Playlist {
                      __typename
                      id
                      name
                      shortDescription
                    }
                    ... on ManuallyQueued {
                      __typename
                    }
                    ... on ScheduleSource {
                      __typename
                      schedule {
                        id
                        name
                        shortDescription
                      }
                      playlist {
                        id
                        name
                        shortDescription
                      }
                    }
                  }
                }
              }
            }
          }`,
        });

        for await (const result of playbackSubscription) {
          this.log("debug", JSON.stringify(result));
          if (result.data.playbackUpdate.playback && result.data.playbackUpdate.playback.soundZone === this.config.zone_id) {
            let variableVals = {};
            // playback state
            variableVals["playback_state"] = result.data.playbackUpdate.playback.state;
            variableVals["playback_volume"] = result.data.playbackUpdate.playback.volume;
            variableVals["playback_progress_s"] = Math.floor(result.data.playbackUpdate.playback.progress.progressMs / 1000);
            variableVals["playback_mode"] = result.data.playbackUpdate.playback.playbackMode;
            // current track
            if (result.data.playbackUpdate.playback.current) {
              variableVals["current_track_start"] = result.data.playbackUpdate.playback.current.start;
              variableVals["current_track_id"] = result.data.playbackUpdate.playback.current.playable.id;
              variableVals["current_track_title"] = result.data.playbackUpdate.playback.current.playable.title;
              variableVals["current_track_version"] = result.data.playbackUpdate.playback.current.playable.version;
              variableVals["current_track_duration_s"] = Math.floor(result.data.playbackUpdate.playback.current.playable.durationMs / 1000);
              variableVals["current_track_explicit"] = result.data.playbackUpdate.playback.current.playable.explicit;
              variableVals["current_track_recognizability"] = result.data.playbackUpdate.playback.current.playable.recognizability;
              variableVals["current_track_album_id"] = result.data.playbackUpdate.playback.current.playable.album.id;
              variableVals["current_track_album_title"] = result.data.playbackUpdate.playback.current.playable.album.title;
              let currentArtistIDs = "";
              for (let i = 0; i < result.data.playbackUpdate.playback.current.playable.artists.length; i++) {
                currentArtistIDs += result.data.playbackUpdate.playback.current.playable.artists[i].id;
                if (i < result.data.playbackUpdate.playback.current.playable.artists.length - 1) {
                  currentArtistIDs += ", ";
                }
              }
              variableVals["current_track_artist_ids"] = currentArtistIDs;
              let currentArtistNames = "";
              for (let i = 0; i < result.data.playbackUpdate.playback.current.playable.artists.length; i++) {
                currentArtistNames += result.data.playbackUpdate.playback.current.playable.artists[i].name;
                if (i < result.data.playbackUpdate.playback.current.playable.artists.length - 1) {
                  currentArtistNames += ", ";
                }
              }
              variableVals["current_track_artist_names"] = currentArtistNames;
              variableVals["current_track_source_type"] = result.data.playbackUpdate.playback.current.source.__typename;
              if (result.data.playbackUpdate.playback.current.source.__typename === "Playlist") {
                variableVals["current_track_schedule_id"] = undefined;
                variableVals["current_track_schedule_title"] = undefined;
                variableVals["current_track_schedule_description"] = undefined;
                variableVals["current_track_playlist_id"] = result.data.playbackUpdate.playback.current.source.id;
                variableVals["current_track_playlist_title"] = result.data.playbackUpdate.playback.current.source.name;
                variableVals["current_track_playlist_description"] = result.data.playbackUpdate.playback.current.source.shortDescription;
              }
              else if (result.data.playbackUpdate.playback.current.source.__typename === "ScheduleSource") {
                variableVals["current_track_schedule_id"] = result.data.playbackUpdate.playback.current.source.schedule.id;
                variableVals["current_track_schedule_title"] = result.data.playbackUpdate.playback.current.source.schedule.name;
                variableVals["current_track_schedule_description"] = result.data.playbackUpdate.playback.current.source.schedule.shortDescription;
                variableVals["current_track_playlist_id"] = result.data.playbackUpdate.playback.current.source.playlist.id;
                variableVals["current_track_playlist_title"] = result.data.playbackUpdate.playback.current.source.playlist.name;
                variableVals["current_track_playlist_description"] = result.data.playbackUpdate.playback.current.source.playlist.shortDescription;
              }
            }
            else {
              variableVals["current_track_start"] = undefined;
              variableVals["current_track_id"] = undefined;
              variableVals["current_track_title"] = undefined;
              variableVals["current_track_version"] = undefined;
              variableVals["current_track_duration_s"] = undefined;
              variableVals["current_track_explicit"] = undefined;
              variableVals["current_track_recognizability"] = undefined;
              variableVals["current_track_album_id"] = undefined;
              variableVals["current_track_album_title"] = undefined;
              variableVals["current_track_artist_ids"] = undefined;
              variableVals["current_track_artists"] = undefined;
              variableVals["current_track_source_type"] = undefined;
              variableVals["current_track_schedule_id"] = undefined;
              variableVals["current_track_schedule_title"] = undefined;
              variableVals["current_track_schedule_description"] = undefined;
              variableVals["current_track_playlist_id"] = undefined;
              variableVals["current_track_playlist_title"] = undefined;
              variableVals["current_track_playlist_description"] = undefined;
            }

            // upcoming track
            if (result.data.playbackUpdate.playback.upcoming[0]) {
              variableVals["upcoming_track_start"] = result.data.playbackUpdate.playback.upcoming[0].start;
              variableVals["upcoming_track_id"] = result.data.playbackUpdate.playback.upcoming[0].playable.id;
              variableVals["upcoming_track_title"] = result.data.playbackUpdate.playback.upcoming[0].playable.title;
              variableVals["upcoming_track_version"] = result.data.playbackUpdate.playback.upcoming[0].playable.version;
              variableVals["upcoming_track_duration_s"] = Math.floor(result.data.playbackUpdate.playback.upcoming[0].playable.durationMs / 1000);
              variableVals["upcoming_track_explicit"] = result.data.playbackUpdate.playback.upcoming[0].playable.explicit;
              variableVals["upcoming_track_recognizability"] = result.data.playbackUpdate.playback.upcoming[0].playable.recognizability;
              variableVals["upcoming_track_album_id"] = result.data.playbackUpdate.playback.upcoming[0].playable.album.id;
              variableVals["upcoming_track_album_title"] = result.data.playbackUpdate.playback.upcoming[0].playable.album.title;
              let upcomingArtistIDs = "";
              for (let i = 0; i < result.data.playbackUpdate.playback.upcoming[0].playable.artists.length; i++) {
                upcomingArtistIDs += result.data.playbackUpdate.playback.upcoming[0].playable.artists[i].id;
                if (i < result.data.playbackUpdate.playback.upcoming[0].playable.artists.length - 1) {
                  upcomingArtistIDs += ", ";
                }
              }
              variableVals["upcoming_track_artist_ids"] = upcomingArtistIDs;
              let upcomingArtistNames = "";
              for (let i = 0; i < result.data.playbackUpdate.playback.upcoming[0].playable.artists.length; i++) {
                upcomingArtistNames += result.data.playbackUpdate.playback.upcoming[0].playable.artists[i].name;
                if (i < result.data.playbackUpdate.playback.upcoming[0].playable.artists.length - 1) {
                  upcomingArtistNames += ", ";
                }
              }
              variableVals["upcoming_track_artist_names"] = upcomingArtistNames;
              variableVals["upcoming_track_source_type"] = result.data.playbackUpdate.playback.upcoming[0].source.__typename;
              if (result.data.playbackUpdate.playback.upcoming[0].source.__typename === "Playlist") {
                variableVals["upcoming_track_schedule_id"] = undefined;
                variableVals["upcoming_track_schedule_title"] = undefined;
                variableVals["upcoming_track_schedule_description"] = undefined;
                variableVals["upcoming_track_playlist_id"] = result.data.playbackUpdate.playback.upcoming[0].source.id;
                variableVals["upcoming_track_playlist_title"] = result.data.playbackUpdate.playback.upcoming[0].source.name;
                variableVals["upcoming_track_playlist_description"] = result.data.playbackUpdate.playback.upcoming[0].source.shortDescription;
              }
              else if (result.data.playbackUpdate.playback.upcoming[0].source.__typename === "ScheduleSource") {
                variableVals["upcoming_track_schedule_id"] = result.data.playbackUpdate.playback.upcoming[0].source.schedule.id;
                variableVals["upcoming_track_schedule_title"] = result.data.playbackUpdate.playback.upcoming[0].source.schedule.name;
                variableVals["upcoming_track_schedule_description"] = result.data.playbackUpdate.playback.upcoming[0].source.schedule.shortDescription;
                variableVals["upcoming_track_playlist_id"] = result.data.playbackUpdate.playback.upcoming[0].source.playlist.id;
                variableVals["upcoming_track_playlist_title"] = result.data.playbackUpdate.playback.upcoming[0].source.playlist.name;
                variableVals["upcoming_track_playlist_description"] = result.data.playbackUpdate.playback.upcoming[0].source.playlist.shortDescription;
              }
            }
            else {
              variableVals["upcoming_track_start"] = undefined;
              variableVals["upcoming_track_id"] = undefined;
              variableVals["upcoming_track_title"] = undefined;
              variableVals["upcoming_track_version"] = undefined;
              variableVals["upcoming_track_duration_s"] = undefined;
              variableVals["upcoming_track_explicit"] = undefined;
              variableVals["upcoming_track_recognizability"] = undefined;
              variableVals["upcoming_track_album_id"] = undefined;
              variableVals["upcoming_track_album_title"] = undefined;
              variableVals["upcoming_track_artist_ids"] = undefined;
              variableVals["upcoming_track_artists"] = undefined;
              variableVals["upcoming_track_source_type"] = undefined;
              variableVals["upcoming_track_schedule_id"] = undefined;
              variableVals["upcoming_track_schedule_title"] = undefined;
              variableVals["upcoming_track_schedule_description"] = undefined;
              variableVals["upcoming_track_playlist_id"] = undefined;
              variableVals["upcoming_track_playlist_title"] = undefined;
              variableVals["upcoming_track_playlist_description"] = undefined;
            }
            this.log("debug", 'Setting variables: \n\n\n' + JSON.stringify(variableVals));
            this.setVariableValues(variableVals);
          }
        }
      }
      )();

      this.updateStatus(InstanceStatus.Ok);
    }

    this.updateActions(); // export actions
    this.updateVariables(); // export variables
  }
  // When module gets deleted
  async destroy() {
    this.log("debug", "destroy");
  }

  async configUpdated(config) {
    this.init(config);
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
      }
    ];
  }

  updateActions() {
    UpdateActions(this);
  }

  updateVariables() {
    UpdateVariables(this);
  }

}

runEntrypoint(SoundtrackInstance, UpgradeScripts);
