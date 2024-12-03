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
const UpdateFeedbacks = require("./feedbacks");


const soundtrackHTTPURL = "https://api.soundtrackyourbrand.com/v2";
const soundtrackWSURL = "wss://api.soundtrackyourbrand.com/v2/graphql-transport-ws";

class SoundtrackInstance extends InstanceBase {
  constructor(internal) {
    super(internal);
    this.wsClient = null;
    this.client = null;
    this.pollTimer = null;
    this.zones = [];
    this.playlists = [];
    this.schedules = [];
    this.playback = {};
    this.currentTrack = {};
    this.upcomingTrack = {};
    this.progressS = 0;
    this.durationS = 0;
    this.lastUpdate = new Date();
  }

  async init(config) {
    this.config = config;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    if (this.client) {
      this.client = null;
    }

    if (this.wsClient) {
      this.wsClient.dispose();
      this.wsClient = null;
    }

    if (this.config.api_key && this.config.api_key !== "") {
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

      if (this.config.zone_id && this.config.zone_id !== "") {
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
            if (Object.hasOwn(result.data.playbackUpdate,"playback") && result.data.playbackUpdate.playback.soundZone === this.config.zone_id) {
              let variableVals = {};
              // playback state
              variableVals["playback_state"] = result.data.playbackUpdate.playback.state;
              variableVals["playback_volume"] = result.data.playbackUpdate.playback.volume;
              variableVals["playback_progress_s"] = Math.floor(result.data.playbackUpdate.playback.progress.progressMs / 1000);
              variableVals["playback_progress_mm_ss"] = this.mmssFromSeconds(Math.floor(result.data.playbackUpdate.playback.progress.progressMs / 1000));
              variableVals["playback_progress_hh_mm_ss"] = this.hhmmssFromSeconds(Math.floor(result.data.playbackUpdate.playback.progress.progressMs / 1000));
              variableVals["playback_mode"] = result.data.playbackUpdate.playback.playbackMode;
              if (this.playback !== result.data.playbackUpdate.playback) {
                this.playback = result.data.playbackUpdate.playback;
                this.checkFeedbacks("playback_state", "playback_mode");
              }

              if (result.data.playbackUpdate.playback.state != "playing") {
                this.log("debug", "Not playing, Clearing progress interval");
                clearInterval(this.pollTimer);
              }
              // current track
              if (result.data.playbackUpdate.playback.current) {
                if (this.currentTrack !== result.data.playbackUpdate.playback.current) {
                  this.currentTrack = result.data.playbackUpdate.playback.current;
                  this.checkFeedbacks("playback_source_type", "playback_source_playlist", "playback_source_schedule", "current_track_explicit", "current_track_id", "current_track_title");
                }
                if (result.data.playbackUpdate.playback.state === "playing") {
                  this.log("debug", "Playing, Setting progress interval");
                  this.progressS = Math.floor(result.data.playbackUpdate.playback.progress.progressMs / 1000);
                  this.lastUpdate = new Date();
                  this.durationS = Math.floor(result.data.playbackUpdate.playback.current.playable.durationMs / 1000);
                  if (this.pollTimer) {
                    clearInterval(this.pollTimer);
                  }
                  this.pollTimer = setInterval(this.calculateProgress.bind(this), 1000);
                }
                else {
                  this.setProgressVars(Math.floor(result.data.playbackUpdate.playback.progress.progressMs / 1000), Math.floor(result.data.playbackUpdate.playback.current.playable.durationMs / 1000));
                }
                variableVals["current_track_start"] = result.data.playbackUpdate.playback.current.start;
                variableVals["current_track_id"] = result.data.playbackUpdate.playback.current.playable.id;
                variableVals["current_track_title"] = result.data.playbackUpdate.playback.current.playable.title;
                variableVals["current_track_version"] = result.data.playbackUpdate.playback.current.playable.version;
                variableVals["current_track_duration_s"] = Math.floor(result.data.playbackUpdate.playback.current.playable.durationMs / 1000);
                variableVals["current_track_duration_mm_ss"] = this.mmssFromSeconds(Math.floor(result.data.playbackUpdate.playback.current.playable.durationMs / 1000));
                variableVals["current_track_duration_hh_mm_ss"] = this.hhmmssFromSeconds(Math.floor(result.data.playbackUpdate.playback.current.playable.durationMs / 1000));
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
                this.currentTrack = {};
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
                if (this.upcomingTrack !== result.data.playbackUpdate.playback.upcoming[0]) {
                  this.upcomingTrack = result.data.playbackUpdate.playback.upcoming[0];
                  this.checkFeedbacks("upcoming_track_explicit", "upcoming_track_id", "upcoming_track_title");
                }
                variableVals["upcoming_track_start"] = result.data.playbackUpdate.playback.upcoming[0].start;
                variableVals["upcoming_track_id"] = result.data.playbackUpdate.playback.upcoming[0].playable.id;
                variableVals["upcoming_track_title"] = result.data.playbackUpdate.playback.upcoming[0].playable.title;
                variableVals["upcoming_track_version"] = result.data.playbackUpdate.playback.upcoming[0].playable.version;
                variableVals["upcoming_track_duration_s"] = Math.floor(result.data.playbackUpdate.playback.upcoming[0].playable.durationMs / 1000);
                variableVals["upcoming_track_duration_mm_ss"] = this.mmssFromSeconds(Math.floor(result.data.playbackUpdate.playback.upcoming[0].playable.durationMs / 1000));
                variableVals["upcoming_track_duration_hh_mm_ss"] = this.hhmmssFromSeconds(Math.floor(result.data.playbackUpdate.playback.upcoming[0].playable.durationMs / 1000));
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
                this.upcomingTrack = {};
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
              this.log("debug", 'Setting variables: \n' + JSON.stringify(variableVals));
              this.setVariableValues(variableVals);
            }
          }
        }
        )();
      this.getLibrary(); // also updates actions and feedbacks
      this.updateVariables(); // export variables
      this.updateStatus(InstanceStatus.Ok);
      }
      else {
        this.updateStatus(InstanceStatus.BadConfig, "Zone ID not set. Save config with a valid API key to populate list of zones.");
        // get all zones for API key
        let res = await this.client.request(`
          query {
            me {
              ... on PublicAPIClient {
                accounts(first: 1) {
                  edges {
                    node {
                      soundZones(first: 1000) {
                        edges {
                          node {
                            id
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }`);
        this.zones = [];
        for (let i = 0; i < res.me.accounts.edges[0].node.soundZones.edges.length; i++) {
          this.zones.push({
            id: res.me.accounts.edges[0].node.soundZones.edges[i].node.id,
            label: res.me.accounts.edges[0].node.soundZones.edges[i].node.name,
          });
        }
      }
    }
    else {
      this.updateStatus(InstanceStatus.BadConfig, "API Key not set");
    }
  }
  // When module gets deleted
  async destroy() {
    this.log("debug", "destroy");
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    if (this.wsClient) {
      this.wsClient.dispose();
      this.wsClient = null;
    }
    if (this.client) {
      this.client = null;
    }
  }

  async configUpdated(config) {
    if (config.api_key !== this.config.api_key || config.zone_id !== this.config.zone_id) {
      // Reinitialize the module
      this.playlists = [];
      this.schedules = [];
      this.playback = {};
      this.currentTrack = {};
      this.upcomingTrack = {};
      this.progressS = 0;
      this.durationS = 0;
      this.lastUpdate = new Date();
      this.init(config);
    }
  }

  // Return config fields for web config
  getConfigFields() {
    return [
      {
        type: "static-text",
        id: "info",
        label: "Configuration Information",
        width: 12,
        value: `This module requires an API key from Soundtrack Your Brand. You can find your API key in the Soundtrack Your Brand web interface under Settings > API Keys.
        
        Enter your API key below and save the configuration, leaving Zone ID blank.
        This module will then automatically populate the Zone ID dropdown with the zones available to the API key.`,
      },
      {
        type: "textinput",
        id: "api_key",
        label: "API Key",
        width: 12,
      },
      {
        type: "dropdown",
        id: "zone_id",
        label: "Zone ID",
        width: 12,
        allowCustom: true,
        choices: this.zones.length ? this.zones : [],
        default: "",
        tooltip:
          "Select the zone (save config with a valid API key to populate this list)",
      },
    ];
  }

  mmssFromSeconds(seconds) {
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  }

  hhmmssFromSeconds(seconds) {
    let hours = Math.floor(seconds / 3600);
    let remainingMinutes = Math.floor((seconds % 3600) / 60);
    let remainingSeconds = seconds % 60;
    return `${hours}:${remainingMinutes < 10 ? "0" : ""}${remainingMinutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  }


  async getLibrary() {
    this.log("debug", "Getting library");
    if (this.client) {
      // get account from soundzone
      let res = await this.client.request(
        `query { soundZone(id: "${this.config.zone_id}") { account { id } } }`
      );
      let accountID = res.soundZone.account.id;
      this.log("debug", "Account ID: " + accountID);
      // get library from account
      res = await this.client.request(
        `query { 
          musicLibrary(id: "${accountID}") {
            playlists (first: 1000) {
              edges {
                node {
                  id
                  name
                }
              }
            }
            schedules (first: 1000) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }`
      );
      this.log("debug", JSON.stringify(res));
      this.playlists = [];
      for (let i = 0; i < res.musicLibrary.playlists.edges.length; i++) {
        this.playlists.push({
          id: res.musicLibrary.playlists.edges[i].node.id,
          label: res.musicLibrary.playlists.edges[i].node.name,
        });
      }
      this.schedules = [];
      for (let i = 0; i < res.musicLibrary.schedules.edges.length; i++) {
        this.schedules.push({
          id: res.musicLibrary.schedules.edges[i].node.id,
          label: res.musicLibrary.schedules.edges[i].node.name,
        });
      }

      // get account announcements
      res = await this.client.request(
        `query { 
          getAccountAnnouncements(accountId: "${accountID}") {
            id
            name
          }
        }`
      );
      this.log("debug", JSON.stringify(res));
      this.announcements = [];
      for (let i = 0; i < res.getAccountAnnouncements.length; i++) {
        this.announcements.push({
          id: res.getAccountAnnouncements[i].id,
          label: res.getAccountAnnouncements[i].name,
        });
      }
    }
    this.updateActions();
    this.updateFeedbacks();
  }

  async calculateProgress() {
    this.log("debug", "Calculating progress");
    this.log("debug", "Last Progress: " + this.progressS + " / " + this.durationS + " seconds at " + this.lastUpdate);
    // get UTC date/time
    let now = new Date();
    this.log("debug", "Now: " + now);
    // calculate progress
    let currentProgressS = this.progressS + Math.floor((now - this.lastUpdate) / 1000);
    this.log("debug", "Progress: " + currentProgressS + " / " + this.durationS + " seconds");
    // set variables
    this.setProgressVars(currentProgressS, this.durationS);
  }

  async setProgressVars( progressS, durationS) {
    let variableVals = {};
    variableVals["playback_progress_s"] = progressS;
    variableVals["playback_progress_mm_ss"] = this.mmssFromSeconds(progressS);
    variableVals["playback_progress_hh_mm_ss"] = this.hhmmssFromSeconds(progressS);
    variableVals["playback_progress_percent"] = Math.floor(progressS / durationS * 100);
    variableVals["playback_remaining_s"] = durationS - progressS;
    variableVals["playback_remaining_mm_ss"] = this.mmssFromSeconds(durationS - progressS);
    variableVals["playback_remaining_hh_mm_ss"] = this.hhmmssFromSeconds(durationS - progressS);
    variableVals["playback_remaining_percent"] = 100 - Math.floor(progressS / durationS * 100);
    this.log("debug", 'Setting variables: \n' + JSON.stringify(variableVals));
    this.setVariableValues(variableVals);
  }

  updateActions() {
    UpdateActions(this);
  }

  updateVariables() {
    UpdateVariables(this);
  }

  updateFeedbacks() {
    UpdateFeedbacks(this);
  }

}

runEntrypoint(SoundtrackInstance, UpgradeScripts);
