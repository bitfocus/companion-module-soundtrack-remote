const { combineRgb } = require('@companion-module/base')

const white = combineRgb(255, 255, 255)
const black = combineRgb(0, 0, 0)
const green = combineRgb(0, 153, 51)
const amber = combineRgb(204, 122, 0)
const blue = combineRgb(0, 85, 170)

function button(category, name, text, actions, feedbacks = [], size = '14') {
	return {
		type: 'button',
		category,
		name,
		style: { text, size, color: white, bgcolor: black },
		feedbacks,
		steps: [{ down: actions, up: [] }],
	}
}

function display(category, name, text, size = 'auto') {
	return button(category, name, text, [], [], size)
}

module.exports = function (self) {
	const v = (id) => `$(${self.label}:${id})`
	const presets = {}

	// Transport
	presets.play = button(
		'Transport',
		'Play',
		'⏵\nPlay',
		[{ actionId: 'play', options: {} }],
		[{ feedbackId: 'playback_state', options: { state: 'playing' }, style: { bgcolor: green } }],
	)
	presets.pause = button(
		'Transport',
		'Pause',
		'⏸\nPause',
		[{ actionId: 'pause', options: {} }],
		[{ feedbackId: 'playback_state', options: { state: 'paused' }, style: { bgcolor: amber } }],
	)
	presets.skip = button('Transport', 'Skip Track', '⏭\nSkip', [{ actionId: 'skip', options: {} }])
	for (const volume of [0, 4, 8, 12, 16]) {
		presets[`volume_${volume}`] = button('Transport', `Set Volume ${volume}`, `Vol\n${volume}`, [
			{ actionId: 'set_volume', options: { volume: String(volume) } },
		])
	}

	// Status displays
	presets.now_playing = display(
		'Now Playing',
		'Current track title and artist',
		`${v('current_track_title')}\n${v('current_track_artist_names')}`,
	)
	presets.up_next = display('Now Playing', 'Upcoming track title', `Next:\n${v('upcoming_track_title')}`)
	presets.time_remaining = display('Now Playing', 'Time remaining', `${v('playback_remaining_mm_ss')}\nleft`, '18')
	presets.time_elapsed = display(
		'Now Playing',
		'Time elapsed / duration',
		`${v('playback_progress_mm_ss')}\n/ ${v('current_track_duration_mm_ss')}`,
	)
	presets.volume = display('Now Playing', 'Volume', `Vol\n${v('playback_volume')}`, '18')
	presets.state = {
		...display('Now Playing', 'Playback state', v('playback_state'), '14'),
		feedbacks: [
			{ feedbackId: 'playback_state', options: { state: 'playing' }, style: { bgcolor: green } },
			{ feedbackId: 'playback_state', options: { state: 'paused' }, style: { bgcolor: amber } },
		],
	}
	presets.source = display('Now Playing', 'Current playlist', v('current_track_playlist_title'))
	presets.explicit = {
		...display('Now Playing', 'Explicit warning', 'EXPLICIT', '14'),
		feedbacks: [{ feedbackId: 'current_track_explicit', options: {}, style: { bgcolor: combineRgb(204, 0, 0) } }],
	}

	// One button per playlist, schedule and announcement in the library
	for (const playlist of self.playlists) {
		presets[`playlist_${playlist.id}`] = button(
			'Playlists',
			playlist.label,
			playlist.label,
			[
				{
					actionId: 'assign_playlist',
					options: { playlist: playlist.id, immediate: true, setTrackIndex: false, sourceTrackIndex: '0' },
				},
			],
			[{ feedbackId: 'playback_source_playlist', options: { playlist: playlist.id }, style: { bgcolor: blue } }],
			'auto',
		)
	}
	for (const schedule of self.schedules) {
		presets[`schedule_${schedule.id}`] = button(
			'Schedules',
			schedule.label,
			schedule.label,
			[{ actionId: 'assign_schedule', options: { schedule: schedule.id, immediate: true } }],
			[{ feedbackId: 'playback_source_schedule', options: { schedule: schedule.id }, style: { bgcolor: blue } }],
			'auto',
		)
	}
	if (self.supportsAnnouncements) {
		for (const announcement of self.announcements) {
			presets[`announcement_${announcement.id}`] = button(
				'Announcements',
				announcement.label,
				announcement.label,
				[{ actionId: 'play_announcement', options: { announcement: announcement.id, immediate: true } }],
				[],
				'auto',
			)
		}
	}

	self.setPresetDefinitions(presets)
}
