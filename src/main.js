const { InstanceBase, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const { GraphQLClient } = require('graphql-request')
const WebSocket = require('ws')
const { createClient } = require('graphql-ws')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateVariables = require('./variables')
const UpdateFeedbacks = require('./feedbacks')
const UpdatePresets = require('./presets')
const { gqlString } = require('./util')

const soundtrackHTTPURL = 'https://api.soundtrackyourbrand.com/v2'
const soundtrackWSURL = 'wss://api.soundtrackyourbrand.com/v2/graphql-transport-ws'

// Fields requested for both the current and the upcoming track
const playableFields = `
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
    __typename
    ... on Playlist {
      id
      name
      shortDescription
    }
    ... on ScheduleSource {
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
  }`

function errorMessage(error) {
	if (error?.message) return error.message
	if (error?.reason) return `${error.code ?? ''} ${error.reason}`.trim()
	if (error?.code) return `WebSocket closed with code ${error.code}`
	return String(error)
}

class SoundtrackInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.wsClient = null
		this.client = null
		this.pollTimer = null
		this.zones = []
		this.playlists = []
		this.schedules = []
		this.announcements = []
		this.supportsAnnouncements = false
		this.secrets = {}
		this.resetPlaybackState()
	}

	resetPlaybackState() {
		this.playback = {}
		this.currentTrack = {}
		this.upcomingTrack = {}
		this.progressS = 0
		this.durationS = 0
		this.lastUpdate = new Date()
	}

	async init(config, _isFirstInit, secrets) {
		this.config = config
		this.secrets = secrets ?? {}
		this.teardown()

		// Register definitions straight away so saved buttons resolve while the library loads
		this.updateActions()
		this.updateFeedbacks()
		this.updateVariables()
		this.updatePresets()

		const apiKey = this.secrets.api_key
		if (!apiKey) {
			this.updateStatus(InstanceStatus.BadConfig, 'API Key not set')
			return
		}

		// HTTP GraphQL client for queries and mutations
		this.client = new GraphQLClient(soundtrackHTTPURL, {
			headers: { authorization: `Basic ${apiKey}` },
		})

		// Keep the zone dropdown populated whenever an API key is set
		await this.getZones()

		if (!this.config.zone_id) {
			this.updateStatus(
				InstanceStatus.BadConfig,
				'Zone ID not set. Save config with a valid API key to populate list of zones.',
			)
			return
		}

		this.updateStatus(InstanceStatus.Connecting)

		// WebSocket client for subscriptions
		const wsClient = createClient({
			url: soundtrackWSURL,
			webSocketImpl: WebSocket,
			connectionParams: {
				Authorization: `Basic ${apiKey}`,
			},
		})
		this.wsClient = wsClient

		wsClient.on('connected', () => {
			if (this.wsClient !== wsClient) return
			this.log('debug', 'WebSocket connected')
			this.updateStatus(InstanceStatus.Ok)
		})
		wsClient.on('error', (error) => {
			if (this.wsClient !== wsClient) return
			this.log('error', 'WebSocket error: ' + errorMessage(error))
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Error with WebSocket connection')
		})
		wsClient.on('closed', () => {
			if (this.wsClient !== wsClient) return
			this.log('debug', 'WebSocket connection closed')
			this.updateStatus(InstanceStatus.Disconnected, 'WebSocket connection closed')
		})

		this.runPlaybackSubscription(wsClient).catch((error) => {
			if (this.wsClient !== wsClient) return
			this.log('error', 'Playback subscription ended: ' + errorMessage(error))
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Playback subscription failed')
		})

		this.getLibrary().catch((error) => {
			this.log('error', 'Error getting library: ' + errorMessage(error))
		})
	}

	teardown() {
		this.stopProgressTimer()
		if (this.wsClient) {
			this.wsClient.dispose()
			this.wsClient = null
		}
		this.client = null
	}

	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
		this.teardown()
	}

	async configUpdated(config, secrets) {
		secrets = secrets ?? {}
		const apiKeyChanged = secrets.api_key !== this.secrets.api_key
		if (apiKeyChanged && config.zone_id === this.config.zone_id && config.zone_id) {
			// The old zone most likely belongs to the old key, so ask for a new one
			config.zone_id = ''
			this.saveConfig(config, secrets)
		}
		if (apiKeyChanged || config.zone_id !== this.config.zone_id) {
			this.playlists = []
			this.schedules = []
			this.announcements = []
			this.supportsAnnouncements = false
			this.resetPlaybackState()
			await this.init(config, false, secrets)
		} else {
			this.config = config
			this.secrets = secrets
		}
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				label: 'Configuration Information',
				width: 12,
				value: `This module requires an API key from Soundtrack Your Brand. You can find your API key in the Soundtrack Your Brand web interface under Settings > API Keys.

        Enter your API key below and save the configuration, leaving Zone ID blank.
        This module will then automatically populate the Zone ID dropdown with the zones available to the API key.`,
			},
			{
				type: 'secret-text',
				id: 'api_key',
				label: 'API Key',
				width: 12,
			},
			{
				type: 'dropdown',
				id: 'zone_id',
				label: 'Zone ID',
				width: 12,
				allowCustom: true,
				choices: this.zones,
				default: '',
				tooltip: 'Select the zone (save config with a valid API key to populate this list)',
			},
		]
	}

	// Run a GraphQL request, failing clearly when the module is not configured
	async request(query) {
		if (!this.client) {
			throw new Error('Not connected: set an API key in the connection config')
		}
		const res = await this.client.request(query)
		this.log('debug', JSON.stringify(res))
		return res
	}

	mmssFromSeconds(seconds) {
		let minutes = Math.floor(seconds / 60)
		let remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
	}

	hhmmssFromSeconds(seconds) {
		let hours = Math.floor(seconds / 3600)
		let remainingMinutes = Math.floor((seconds % 3600) / 60)
		let remainingSeconds = seconds % 60
		return `${hours}:${remainingMinutes < 10 ? '0' : ''}${remainingMinutes}:${
			remainingSeconds < 10 ? '0' : ''
		}${remainingSeconds}`
	}

	async getZones() {
		try {
			const res = await this.request(`
        query {
          me {
            ... on PublicAPIClient {
              accounts(first: 100) {
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
        }`)
			this.zones = []
			for (const account of res?.me?.accounts?.edges ?? []) {
				for (const zone of account?.node?.soundZones?.edges ?? []) {
					this.zones.push({ id: zone.node.id, label: zone.node.name })
				}
			}
		} catch (error) {
			this.log('error', 'Error getting zones: ' + errorMessage(error))
			this.zones = []
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Could not list zones, check the API key')
		}
	}

	async getLibrary() {
		this.log('debug', 'Getting library')
		let accountID
		try {
			// get account from soundzone
			let res = await this.request(`query { soundZone(id: ${gqlString(this.config.zone_id)}) { account { id } } }`)
			accountID = res?.soundZone?.account?.id
			this.log('debug', 'Account ID: ' + accountID)
			// get library from account
			res = await this.request(
				`query {
          musicLibrary(id: ${gqlString(accountID)}) {
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
        }`,
			)
			this.playlists = (res?.musicLibrary?.playlists?.edges ?? []).map((edge) => ({
				id: edge.node.id,
				label: edge.node.name,
			}))
			this.schedules = (res?.musicLibrary?.schedules?.edges ?? []).map((edge) => ({
				id: edge.node.id,
				label: edge.node.name,
			}))
		} catch (error) {
			this.log('error', 'Error getting library: ' + errorMessage(error))
			this.playlists = []
			this.schedules = []
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Could not load library, check the Zone ID')
		}

		this.announcements = []
		this.supportsAnnouncements = false
		if (accountID) {
			try {
				// get account announcements
				const res = await this.request(
					`query {
            getAccountAnnouncements(accountId: ${gqlString(accountID)}) {
              id
              name
            }
          }`,
				)
				this.announcements = (res?.getAccountAnnouncements ?? []).map((announcement) => ({
					id: announcement.id,
					label: announcement.name,
				}))
				this.supportsAnnouncements = true
			} catch (error) {
				this.log('debug', 'Account does not support announcements: ' + errorMessage(error))
			}
		}

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.checkFeedbacks()
	}

	async runPlaybackSubscription(wsClient) {
		const playbackSubscription = wsClient.iterate({
			query: `subscription playbackUpdate {
        playbackUpdate(input: {soundZone: ${gqlString(this.config.zone_id)}}) {
          playback {
            soundZone
            state
            volume
            progress {
              progressMs
            }
            playbackMode
            current {
              ${playableFields}
            }
            upcoming {
              ${playableFields}
            }
          }
        }
      }`,
		})
		for await (const result of playbackSubscription) {
			if (this.wsClient !== wsClient) break
			if (result?.errors?.length) {
				this.log('error', 'Playback update error: ' + JSON.stringify(result.errors))
			}
			const playback = result?.data?.playbackUpdate?.playback
			if (playback && playback.soundZone === this.config.zone_id) {
				try {
					this.handlePlayback(playback)
				} catch (error) {
					this.log('error', 'Error handling playback update: ' + errorMessage(error))
				}
			}
		}
	}

	// Variables describing a current or upcoming queue item, all cleared when there is none
	trackVariables(prefix, item) {
		const playable = item?.playable
		const source = item?.source
		const durationS = Math.floor((playable?.durationMs ?? 0) / 1000)
		const artists = playable?.artists ?? []
		const vars = {
			start: item?.start,
			id: playable?.id,
			title: playable?.title,
			version: playable?.version,
			duration_s: playable ? durationS : undefined,
			duration_mm_ss: playable ? this.mmssFromSeconds(durationS) : undefined,
			duration_hh_mm_ss: playable ? this.hhmmssFromSeconds(durationS) : undefined,
			explicit: playable?.explicit,
			recognizability: playable?.recognizability,
			album_id: playable?.album?.id,
			album_title: playable?.album?.title,
			artist_ids: playable ? artists.map((artist) => artist.id).join(', ') : undefined,
			artist_names: playable ? artists.map((artist) => artist.name).join(', ') : undefined,
			source_type: source?.__typename,
			schedule_id: undefined,
			schedule_title: undefined,
			schedule_description: undefined,
			playlist_id: undefined,
			playlist_title: undefined,
			playlist_description: undefined,
		}
		if (source?.__typename === 'Playlist') {
			vars.playlist_id = source.id
			vars.playlist_title = source.name
			vars.playlist_description = source.shortDescription
		} else if (source?.__typename === 'ScheduleSource') {
			vars.schedule_id = source.schedule?.id
			vars.schedule_title = source.schedule?.name
			vars.schedule_description = source.schedule?.shortDescription
			vars.playlist_id = source.playlist?.id
			vars.playlist_title = source.playlist?.name
			vars.playlist_description = source.playlist?.shortDescription
		}
		const prefixed = {}
		for (const [key, value] of Object.entries(vars)) {
			prefixed[`${prefix}_${key}`] = value
		}
		return prefixed
	}

	handlePlayback(playback) {
		this.playback = playback
		this.currentTrack = playback.current ?? {}
		this.upcomingTrack = playback.upcoming?.[0] ?? {}

		this.setVariableValues({
			playback_state: playback.state,
			playback_volume: playback.volume,
			playback_mode: playback.playbackMode,
			...this.trackVariables('current_track', playback.current),
			...this.trackVariables('upcoming_track', playback.upcoming?.[0]),
		})

		this.progressS = Math.floor((playback.progress?.progressMs ?? 0) / 1000)
		this.durationS = Math.floor((playback.current?.playable?.durationMs ?? 0) / 1000)
		this.lastUpdate = new Date()
		this.setProgressVars(this.progressS, this.durationS)

		this.stopProgressTimer()
		if (playback.state === 'playing' && playback.current) {
			this.pollTimer = setInterval(this.calculateProgress.bind(this), 1000)
		}

		this.checkFeedbacks()
	}

	stopProgressTimer() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	calculateProgress() {
		const elapsedS = Math.floor((new Date() - this.lastUpdate) / 1000)
		this.setProgressVars(this.progressS + elapsedS, this.durationS)
	}

	setProgressVars(progressS, durationS) {
		// Clamp so the timer never runs past the end of the track
		const progress = durationS > 0 ? Math.min(Math.max(progressS, 0), durationS) : Math.max(progressS, 0)
		const remaining = Math.max(durationS - progress, 0)
		const percent = durationS > 0 ? Math.floor((progress / durationS) * 100) : 0
		this.setVariableValues({
			playback_progress_s: progress,
			playback_progress_mm_ss: this.mmssFromSeconds(progress),
			playback_progress_hh_mm_ss: this.hhmmssFromSeconds(progress),
			playback_progress_percent: percent,
			playback_remaining_s: remaining,
			playback_remaining_mm_ss: this.mmssFromSeconds(remaining),
			playback_remaining_hh_mm_ss: this.hhmmssFromSeconds(remaining),
			playback_remaining_percent: durationS > 0 ? 100 - percent : 0,
		})
	}

	updateActions() {
		UpdateActions(this)
	}

	updateVariables() {
		UpdateVariables(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updatePresets() {
		UpdatePresets(this)
	}
}

runEntrypoint(SoundtrackInstance, UpgradeScripts)
