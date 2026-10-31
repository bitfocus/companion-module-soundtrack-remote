// GraphQL string literals use the same escaping as JSON strings
function gqlString(value) {
	return JSON.stringify(String(value ?? ''))
}

module.exports = { gqlString }
