module.exports = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */
	// v2.2.0: move the API key from the plain config into the secrets store
	function (_context, props) {
		const config = props.config
		if (!config || config.api_key === undefined) {
			return { updatedConfig: null, updatedActions: [], updatedFeedbacks: [] }
		}
		const { api_key, ...rest } = config
		return {
			updatedConfig: rest,
			updatedSecrets: { ...(props.secrets ?? {}), api_key },
			updatedActions: [],
			updatedFeedbacks: [],
		}
	},
]
