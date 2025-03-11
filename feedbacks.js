const { combineRgb } = require("@companion-module/base");

module.exports = function (self) {
    let feedbacks = {};
    feedbacks["playback_state"] = {
        type: 'boolean',
        name: "Change style based on playback state",
        defaultStyle: {
            // The default style change for a boolean feedback
            // The user will be able to customise these values as well as the fields that will be changed
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                type: "dropdown",
                label: "Playback state",
                id: "state",
                default: "playing",
                choices: [
                    { id: "offline", label: "Offline" },
                    { id: "playing", label: "Playing" },
                    { id: "paused", label: "Paused" },
                    { id: "unpaired", label: "Unpaired" },
                ],
            },
        ],
        callback: function (feedback) {
            if (self.playback) {
                return self.playback.state === feedback.options.state
            }
            else {
                return false
            }
        },
    };
    feedbacks["playback_mode"] = {
        type: 'boolean',
        name: "Change style based on playback mode",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                type: "dropdown",
                label: "Playback mode",
                id: "mode",
                default: "AUTO",
                choices: [
                    { id: "AUTO", label: "Auto" },
                    { id: "LINEAR", label: "Linear" },
                    { id: "SHUFFLE", label: "Shuffle" },
                ],
            },
        ],
        callback: function (feedback) {
            if (self.playback) {
                return self.playback.playbackMode === feedback.options.mode
            }
            else {
                return false
            }
        },
    };
    feedbacks["playback_source_type"] = {
        type: 'boolean',
        name: "Change style based on playback source type",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                type: "dropdown",
                label: "Source type",
                id: "source_type",
                default: "Playlist",
                choices: [
                    { id: "Playlist", label: "Playlist" },
                    { id: "Schedule", label: "Schedule" },
                    { id: "ManuallyQueued", label: "Manually Queued" },
                ],
            },
        ],
        callback: function (feedback) {
            if (self.currentTrack.source) {
                return self.currentTrack.source.__typename === feedback.options.source_type
            }
            else {
                return false
            }
        },
    };
    feedbacks["playback_source_playlist"] = {
        type: 'boolean',
        name: "Change style based on playback source playlist",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                id: "playlist",
                type: "dropdown",
                label: "Playlist",
                choices: self.playlists ? self.playlists : [],
                default: self.playlists ? self.playlists[0].id : "",
            },
        ],
        callback: function (feedback) {
            if (self.currentTrack.source.__typename === "Playlist") {
                return self.currentTrack.source.id === feedback.options.playlist
            }
            else if (self.currentTrack.source.__typename === "Schedule") {
                return self.currentTrack.source.playlist.id === feedback.options.playlist
            }
            else {
                return false
            }
        },
    };
    feedbacks["playback_source_schedule"] = {
        type: 'boolean',
        name: "Change style based on playback source schedule",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                id: "schedule",
                type: "dropdown",
                label: "Schedule",
                choices: self.schedules ? self.schedules : [],
                default: self.schedules ? self.schedules[0].id : "",
            },
        ],
        callback: function (feedback) {
            if (self.currentTrack.source.__typename === "Schedule") {
                return self.currentTrack.source.id === feedback.options.schedule
            }
            else {
                return false
            }
        },
    };
    feedbacks["current_track_explicit"] = {
        type: 'boolean',
        name: "Change style based on current track explicit content",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [],
        callback: function (feedback) {
            if (self.currentTrack) {
                return self.currentTrack.playable.explicit
            }
            else {
                return false
            }
        },
    };
    feedbacks["current_track_id"] = {
        type: 'boolean',
        name: "Change style based on current track ID",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                type: "textinput",
                label: "Track ID",
                id: "track_id",
                default: "",
            },
        ],
        callback: function (feedback) {
            if (self.currentTrack) {
                return self.currentTrack.playable.id === feedback.options.track_id;
            }
            else {
                return false
            }
        },
    };
    feedbacks["current_track_title"] = {
        type: 'boolean',
        name: "Change style based on current track title",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                type: "textinput",
                label: "Track Title",
                id: "track_title",
                default: "",
            },
        ],
        callback: function (feedback) {
            if (self.currentTrack) {
                return self.currentTrack.playable.title === feedback.options.track_title
            }
            else {
                return false
            }
        },
    };
    feedbacks["upcoming_track_explicit"] = {
        type: 'boolean',
        name: "Change style based on upcoming track explicit content",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [],
        callback: function (feedback) {
            if (self.upcomingTrack) {
                return self.upcomingTrack.playable.explicit
            }
            else {
                return false
            }
        },
    };
    feedbacks["upcoming_track_id"] = {
        type: 'boolean',
        name: "Change style based on upcoming track ID",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                type: "textinput",
                label: "Track ID",
                id: "track_id",
                default: "",
            },
        ],
        callback: function (feedback) {
            if (self.upcomingTrack) {
                return self.upcomingTrack.playable.id === feedback.options.track_id;
            }
            else {
                return false
            }
        },
    };
    feedbacks["upcoming_track_title"] = {
        type: 'boolean',
        name: "Change style based on upcoming track title",
        defaultStyle: {
            bgcolor: combineRgb(255, 0, 0),
            color: combineRgb(0, 0, 0),
        },
        options: [
            {
                type: "textinput",
                label: "Track Title",
                id: "track_title",
                default: "",
            },
        ],
        callback: function (feedback) {
            if (self.upcomingTrack) {
                return self.upcomingTrack.playable.title === feedback.options.track_title
            }
            else {
                return false
            }
        },
    };
    self.setFeedbackDefinitions(feedbacks);
};