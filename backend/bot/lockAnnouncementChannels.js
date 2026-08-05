/**
 * Script to enforce Read-Only permissions on Announcement & System channels for @everyone
 * Locks members from sending text messages, images, videos, voice messages, or files.
 */
const enforceStrictReadOnlyPermissions = require('./setExactChannelPermissions');

enforceStrictReadOnlyPermissions();
