const { Regex } = require('@companion-module/base')
const { gqlString } = require('./util')

// Resolve any $(...) variables in a text option
async function parseText(context, value) {
	return (await context.parseVariablesInString(String(value ?? ''))).trim()
}

// Resolve a text option to an integer, or throw if it is not a number
async function parseInteger(context, value, label) {
	const text = await parseText(context, value)
	const number = Number(text)
	if (text === '' || !Number.isFinite(number)) {
		throw new Error(`${label} must be a number, got "${text}"`)
	}
	return Math.round(number)
}

module.exports = function (self) {
	const zone = () => gqlString(self.config.zone_id)

	async function assignSource(source, immediate, trackIndex) {
		const index = trackIndex === undefined ? '' : `, sourceTrackIndex: ${trackIndex}`
		await self.request(
			`mutation { soundZoneAssignSource(input: {soundZones: [${zone()}], source: ${gqlString(source)}, immediate: ${!!immediate}${index}}) {soundZones} }`,
		)
	}

	async function queueTracks(trackId, immediate) {
		await self.request(
			`mutation { soundZoneQueueTracks(input: {soundZone: ${zone()}, tracks: [${gqlString(trackId)}], immediate: ${!!immediate}}) {status} }`,
		)
	}

	const trackIndexOptions = (label, tooltip) => [
		{
			id: 'setTrackIndex',
			type: 'checkbox',
			label,
			tooltip,
			default: false,
		},
		{
			id: 'sourceTrackIndex',
			type: 'textinput',
			label: 'Track Index',
			tooltip: 'The index of the track to start playing from',
			regex: Regex.NUMBER,
			default: '0',
			useVariables: true,
			isVisibleExpression: '$(options:setTrackIndex)',
		},
	]

	const trackIndex = async (event, context) =>
		event.options.setTrackIndex
			? Math.max(0, await parseInteger(context, event.options.sourceTrackIndex, 'Track Index'))
			: undefined

	let actions = {
		play: {
			name: 'Play',
			description: 'Resume the current track in this zone.',
			options: [],
			callback: async () => {
				await self.request(`mutation { play(input: {soundZone: ${zone()}}) {status} }`)
			},
		},
		pause: {
			name: 'Pause',
			description: 'Pause the current track in this zone.',
			options: [],
			callback: async () => {
				await self.request(`mutation { pause(input: {soundZone: ${zone()}}) {status} }`)
			},
		},
		skip: {
			name: 'Skip Track',
			description: 'Skip the current track in this zone.',
			options: [],
			callback: async () => {
				await self.request(`mutation { skipTrack(input: {soundZone: ${zone()}}) {status} }`)
			},
		},
		set_volume: {
			name: 'Set Volume',
			description: 'Set the volume of this zone.',
			options: [
				{
					type: 'textinput',
					id: 'volume',
					label: 'Volume',
					default: '10',
					tooltip: 'Volume level from 0 to 16',
					regex: Regex.NUMBER,
					required: true,
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				// Clamp volume between 0 and 16
				const volume = Math.min(16, Math.max(0, await parseInteger(context, event.options.volume, 'Volume')))
				await self.request(`mutation { setVolume(input: {soundZone: ${zone()}, volume: ${volume}}) {status} }`)
			},
		},
		assign_source: {
			name: 'Assign source by ID',
			description: 'Assign a source (schedule, playlist, or station) to this zone',
			options: [
				{
					type: 'textinput',
					id: 'source',
					label: 'Source ID (schedule, playlist, or station)',
					required: true,
					useVariables: true,
				},
				{
					id: 'immediate',
					type: 'checkbox',
					label: 'Play Immediately',
					tooltip: 'Play the source immediately instead of after the current track finishes',
					default: false,
				},
				...trackIndexOptions(
					'Set Track Index? (playlists only)',
					'Enable setting track index. (Only works for playlists)',
				),
			],
			callback: async (event, context) => {
				const source = await parseText(context, event.options.source)
				await assignSource(source, event.options.immediate, await trackIndex(event, context))
			},
		},
		assign_playlist: {
			name: 'Assign Playlist',
			description: 'Assign a playlist to this zone',
			options: [
				{
					id: 'playlist',
					type: 'dropdown',
					label: 'Playlist',
					choices: self.playlists,
					default: self.playlists.length > 0 ? self.playlists[0].id : '',
					tooltip: 'The playlist to assign to this zone',
				},
				{
					id: 'immediate',
					type: 'checkbox',
					label: 'Play Immediately',
					tooltip: 'Play the playlist immediately instead of after the current track finishes',
					default: false,
				},
				...trackIndexOptions('Set Track Index?', 'Enable setting track index.'),
			],
			callback: async (event, context) => {
				await assignSource(event.options.playlist, event.options.immediate, await trackIndex(event, context))
			},
		},
		assign_schedule: {
			name: 'Assign Schedule',
			description: 'Assign a schedule to this zone',
			options: [
				{
					id: 'schedule',
					type: 'dropdown',
					label: 'Schedule',
					choices: self.schedules,
					default: self.schedules.length > 0 ? self.schedules[0].id : '',
					tooltip: 'The schedule to assign to this zone',
				},
				{
					id: 'immediate',
					type: 'checkbox',
					label: 'Play Immediately',
					tooltip: 'Play the schedule immediately instead of after the current track finishes',
					default: false,
				},
			],
			callback: async (event) => {
				await assignSource(event.options.schedule, event.options.immediate)
			},
		},
		play_track: {
			name: 'Play/Queue Track',
			description: 'Play/Queue a track in this zone by ID',
			options: [
				{
					id: 'track',
					type: 'textinput',
					label: 'Track ID',
					required: true,
					tooltip: 'The track to play in this zone',
					useVariables: true,
				},
				{
					id: 'immediate',
					type: 'checkbox',
					label: 'Play Immediately',
					tooltip: 'Play the track immediately instead of after the current track finishes',
					default: false,
				},
			],
			callback: async (event, context) => {
				await queueTracks(await parseText(context, event.options.track), event.options.immediate)
			},
		},
	}
	if (self.supportsAnnouncements) {
		actions.play_announcement = {
			name: 'Play/Queue Announcement',
			description: 'Play/Queue an announcement in this zone',
			options: [
				{
					id: 'announcement',
					type: 'dropdown',
					label: 'Announcement',
					choices: self.announcements,
					default: self.announcements.length > 0 ? self.announcements[0].id : '',
					tooltip: 'The announcement to play in this zone',
				},
				{
					id: 'immediate',
					type: 'checkbox',
					label: 'Play Immediately',
					tooltip: 'Play the announcement immediately instead of after the current track finishes',
					default: false,
				},
			],
			callback: async (event) => {
				await queueTracks(event.options.announcement, event.options.immediate)
			},
		}
	}
	self.setActionDefinitions(actions)
}
