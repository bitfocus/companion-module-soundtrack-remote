const { combineRgb } = require('@companion-module/base')

module.exports = function (self) {
	let feedbacks = {}
	feedbacks['playback_state'] = {
		type: 'boolean',
		name: 'Change style based on playback state',
		defaultStyle: {
			// The default style change for a boolean feedback
			// The user will be able to customise these values as well as the fields that will be changed
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Playback state',
				id: 'state',
				default: 'playing',
				choices: [
					{ id: 'offline', label: 'Offline' },
					{ id: 'playing', label: 'Playing' },
					{ id: 'paused', label: 'Paused' },
					{ id: 'unpaired', label: 'Unpaired' },
				],
			},
		],
		callback: function (feedback) {
			return self.playback?.state === feedback.options.state
		},
	}
	feedbacks['playback_mode'] = {
		type: 'boolean',
		name: 'Change style based on playback mode',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Playback mode',
				id: 'mode',
				default: 'AUTO',
				choices: [
					{ id: 'AUTO', label: 'Auto' },
					{ id: 'LINEAR', label: 'Linear' },
					{ id: 'SHUFFLE', label: 'Shuffle' },
				],
			},
		],
		callback: function (feedback) {
			return self.playback?.playbackMode === feedback.options.mode
		},
	}
	feedbacks['playback_source_type'] = {
		type: 'boolean',
		name: 'Change style based on playback source type',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Source type',
				id: 'source_type',
				default: 'Playlist',
				choices: [
					{ id: 'Playlist', label: 'Playlist' },
					{ id: 'Schedule', label: 'Schedule' },
					{ id: 'ManuallyQueued', label: 'Manually Queued' },
				],
			},
		],
		callback: function (feedback) {
			// The "Schedule" choice matches the API's ScheduleSource type
			const sourceType = feedback.options.source_type === 'Schedule' ? 'ScheduleSource' : feedback.options.source_type
			return self.currentTrack?.source?.__typename === sourceType
		},
	}
	feedbacks['playback_source_playlist'] = {
		type: 'boolean',
		name: 'Change style based on playback source playlist',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				id: 'playlist',
				type: 'dropdown',
				label: 'Playlist',
				choices: self.playlists,
				default: self.playlists.length > 0 ? self.playlists[0].id : '',
			},
		],
		callback: function (feedback) {
			const source = self.currentTrack?.source
			if (source?.__typename === 'Playlist') {
				return source.id === feedback.options.playlist
			} else if (source?.__typename === 'ScheduleSource') {
				return source.playlist?.id === feedback.options.playlist
			} else {
				return false
			}
		},
	}
	feedbacks['playback_source_schedule'] = {
		type: 'boolean',
		name: 'Change style based on playback source schedule',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				id: 'schedule',
				type: 'dropdown',
				label: 'Schedule',
				choices: self.schedules,
				default: self.schedules.length > 0 ? self.schedules[0].id : '',
			},
		],
		callback: function (feedback) {
			const source = self.currentTrack?.source
			return source?.__typename === 'ScheduleSource' && source.schedule?.id === feedback.options.schedule
		},
	}
	feedbacks['current_track_explicit'] = {
		type: 'boolean',
		name: 'Change style based on current track explicit content',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [],
		callback: function (feedback) {
			return self.currentTrack?.playable?.explicit === true
		},
	}
	feedbacks['current_track_id'] = {
		type: 'boolean',
		name: 'Change style based on current track ID',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				type: 'textinput',
				label: 'Track ID',
				id: 'track_id',
				default: '',
			},
		],
		callback: function (feedback) {
			return self.currentTrack?.playable?.id === feedback.options.track_id
		},
	}
	feedbacks['current_track_title'] = {
		type: 'boolean',
		name: 'Change style based on current track title',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				type: 'textinput',
				label: 'Track Title',
				id: 'track_title',
				default: '',
			},
		],
		callback: function (feedback) {
			return self.currentTrack?.playable?.title === feedback.options.track_title
		},
	}
	feedbacks['upcoming_track_explicit'] = {
		type: 'boolean',
		name: 'Change style based on upcoming track explicit content',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [],
		callback: function (feedback) {
			return self.upcomingTrack?.playable?.explicit === true
		},
	}
	feedbacks['upcoming_track_id'] = {
		type: 'boolean',
		name: 'Change style based on upcoming track ID',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				type: 'textinput',
				label: 'Track ID',
				id: 'track_id',
				default: '',
			},
		],
		callback: function (feedback) {
			return self.upcomingTrack?.playable?.id === feedback.options.track_id
		},
	}
	feedbacks['upcoming_track_title'] = {
		type: 'boolean',
		name: 'Change style based on upcoming track title',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(0, 0, 0),
		},
		options: [
			{
				type: 'textinput',
				label: 'Track Title',
				id: 'track_title',
				default: '',
			},
		],
		callback: function (feedback) {
			return self.upcomingTrack?.playable?.title === feedback.options.track_title
		},
	}
	self.setFeedbackDefinitions(feedbacks)
}
